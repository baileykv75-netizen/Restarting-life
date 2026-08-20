import { getQingyunMentorById, QINGYUN_MENTORS, type QingyunMentorDefinition } from '../data/qingyunMentors'
import { getTechniqueById } from '../data/techniques'
import type { GameState } from '../types/game'
import type {
  QingyunMasterNpcId,
  SectExitReason,
  SectMastershipState,
  SectViolationId,
  SectViolationRecord,
  SectViolationSeverity,
} from '../types/sect'
import { applyFormalCultivationGain, resolveCultivateDays } from './cultivationEngine'
import { resolveAbandonSectAssignment } from './sectAssignmentEngine'
import { getSectAccess, isActiveQingyunMember } from './sectMembershipEngine'

export interface SectConsequenceMutationResult {
  state: GameState
  applied: boolean
  reason?: string
}

export interface QingyunMentorOffer {
  definition: QingyunMentorDefinition
  available: boolean
  missing: string[]
  reason?: string
}

const MASTER_NAME: Readonly<Record<QingyunMasterNpcId, string>> = {
  qingyun_lin_zhaochuan: '林照川',
  qingyun_lu_qingyi: '陆清仪',
}

const VIOLATION_ACTION_LABEL: Readonly<Record<SectViolationId, string>> = {
  inner_resource_trespass: '明知无权仍越过内门资源区域封线',
  core_inheritance_trespass: '强闯核心传承禁地',
  public_evil_practice: '在宗门内公开演练受限制的邪道功法',
}

export function formatQingyunMasterName(masterNpcId: QingyunMasterNpcId): string {
  return MASTER_NAME[masterNpcId]
}

export function getSectViolationHistory(state: GameState): SectViolationRecord[] {
  return state.sectMembership?.violations ?? []
}

export function getActiveMastership(state: GameState): SectMastershipState | null {
  const mastership = state.sectMembership?.mastership
  return mastership?.status === 'active' && isActiveQingyunMember(state) ? mastership : null
}

function settledAssignment(state: GameState, assignmentIds: readonly string[]): boolean {
  return (state.sectProgress?.history ?? []).some((entry) => entry.outcome === 'settled' && assignmentIds.includes(entry.assignmentId))
}

function mentorOffer(state: GameState, definition: QingyunMentorDefinition): QingyunMentorOffer {
  const missing: string[] = []
  if (!isActiveQingyunMember(state)) missing.push('你当前不是在册青云弟子')
  if (state.sectMembership?.rank === 'service') missing.push('杂役身份尚未进入正式弟子师承序列')
  if (state.world.currentLocationId !== 'qingyun_sect') missing.push('需本人回青云宗正式行拜师礼')
  if ((state.sectProgress?.contribution ?? 0) < definition.contributionRequired) missing.push(`宗门贡献需达到 ${definition.contributionRequired}`)
  if (!settledAssignment(state, definition.requiredSettledAssignments)) {
    missing.push(definition.id === 'qingyun_lin_zhaochuan' ? '需正式交结过巡山或清剿事务' : '需正式交结过灵溪谷采药事务')
  }
  if (state.sectMembership?.mastership?.status === 'active') missing.push(`你已经正式拜${formatQingyunMasterName(state.sectMembership.mastership.masterNpcId)}为师`)
  return {
    definition,
    available: missing.length === 0,
    missing,
    ...(missing.length > 0 ? { reason: 'QINGYUN_MENTOR_CONDITIONS_UNMET' } : {}),
  }
}

export function getQingyunMentorOffers(state: GameState): QingyunMentorOffer[] {
  return QINGYUN_MENTORS.map((definition) => mentorOffer(state, definition))
}

function learnTechniqueSet(state: GameState, techniqueIds: readonly string[]): GameState {
  const known = new Set(state.cultivation.knownTechniqueIds ?? [])
  const practice = { ...(state.cultivation.techniquePractice ?? {}) }
  for (const techniqueId of techniqueIds) {
    if (!getTechniqueById(techniqueId)) continue
    known.add(techniqueId)
    if (state.cultivation.techniqueSystemInitialized && !practice[techniqueId]) practice[techniqueId] = { proficiencyPoints: 0 }
  }
  return {
    ...state,
    cultivation: {
      ...state.cultivation,
      knownTechniqueIds: [...known],
      ...(state.cultivation.techniqueSystemInitialized ? { techniquePractice: practice } : {}),
    },
  }
}

export function resolveAcceptQingyunMaster(state: GameState, masterNpcId: QingyunMasterNpcId): SectConsequenceMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (!state.cultivation.practiceInitialized) return { state, applied: false, reason: 'CULTIVATION_NOT_INITIALIZED' }
  const definition = getQingyunMentorById(masterNpcId)
  if (!definition) return { state, applied: false, reason: 'UNKNOWN_QINGYUN_MENTOR' }
  const offer = mentorOffer(state, definition)
  if (!offer.available) return { state, applied: false, reason: offer.reason }
  const membership = state.sectMembership!
  const mastership: SectMastershipState = {
    masterNpcId,
    acceptedDay: state.worldDay,
    status: 'active',
    guidanceUsesRemaining: 1,
  }
  let next = learnTechniqueSet(state, definition.taughtTechniqueIds)
  next = {
    ...next,
    sectMembership: { ...membership, mastership },
    chronicle: [...next.chronicle, {
      id: `${next.runId}:sect:master:${masterNpcId}:${next.worldDay}`,
      startDay: next.worldDay,
      endDay: next.worldDay,
      title: `拜${definition.name}为师`,
      sceneText: `你在青云宗内正式向${definition.title}${definition.name}行礼，师承被记入宗门名册。`,
      narrative: `${definition.name}收下了你。${definition.teachingText}`,
      choiceText: `拜${definition.name}为师`,
      changes: [
        { label: '师父', value: `${definition.name} · ${definition.title}`, tone: 'positive' },
        { label: '传授', value: definition.taughtTechniqueIds.map((id) => getTechniqueById(id)?.name ?? id).join('、'), tone: 'positive' },
        { label: '当面指点', value: '1 次', tone: 'positive' },
      ],
      importance: 'major',
      sourceType: 'activity',
      sourceId: `sect:master:${masterNpcId}`,
      locationId: next.world.currentLocationId ?? undefined,
    }],
  }
  return { state: next, applied: true }
}

export function resolveReceiveMasterGuidance(state: GameState): SectConsequenceMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.world.currentLocationId !== 'qingyun_sect') return { state, applied: false, reason: 'MASTER_GUIDANCE_REQUIRES_QINGYUN' }
  const mastership = getActiveMastership(state)
  if (!mastership) return { state, applied: false, reason: 'NO_ACTIVE_QINGYUN_MASTER' }
  if (mastership.guidanceUsesRemaining <= 0) return { state, applied: false, reason: 'MASTER_GUIDANCE_ALREADY_USED' }
  const cultivated = resolveCultivateDays(state, 10)
  if (!cultivated.applied) return { state, applied: false, reason: cultivated.reason ?? 'MASTER_GUIDANCE_CULTIVATION_BLOCKED' }

  let next = cultivated.state
  if (next.status === 'playing' && cultivated.gainApplied > 0) {
    const bonus = Math.max(1, Math.floor(cultivated.gainApplied * 0.25))
    next = applyFormalCultivationGain(next, bonus)
    const membership = next.sectMembership!
    const name = formatQingyunMasterName(mastership.masterNpcId)
    next = {
      ...next,
      sectMembership: {
        ...membership,
        mastership: { ...mastership, guidanceUsesRemaining: mastership.guidanceUsesRemaining - 1 },
      },
      chronicle: [...next.chronicle, {
        id: `${next.runId}:sect:master-guidance:${mastership.masterNpcId}:${next.worldDay}`,
        startDay: state.worldDay,
        endDay: next.worldDay,
        title: `${name}当面指点`,
        sceneText: `你在宗门内跟着${name}重新走了一遍当前主修法门的关键周天。`,
        narrative: '十日里最有价值的不是多吐纳几轮，而是有人当面指出你原本习以为常的错漏。',
        changes: [
          { label: '时间', value: '+10 天', tone: 'neutral' },
          { label: '额外修为', value: `+${bonus}`, tone: 'positive' },
          { label: '剩余当面指点', value: `${mastership.guidanceUsesRemaining - 1} 次`, tone: 'neutral' },
        ],
        importance: 'notable',
        sourceType: 'activity',
        sourceId: `sect:master-guidance:${mastership.masterNpcId}`,
        locationId: next.world.currentLocationId ?? undefined,
      }],
    }
  }
  return { state: next, applied: true }
}

function hasKnownEvilTechnique(state: GameState): boolean {
  return (state.cultivation.knownTechniqueIds ?? []).some((id) => getTechniqueById(id)?.ruleTags.includes('cultivation:evil'))
}

function contributionPenalty(state: GameState, requested: number): { state: GameState; delta: number } {
  const progress = state.sectProgress ?? { contribution: 0, history: [] }
  const amount = Math.min(progress.contribution, requested)
  return { state: { ...state, sectProgress: { ...progress, contribution: progress.contribution - amount } }, delta: -amount }
}

function spiritStonePenalty(state: GameState, requested: number): { state: GameState; delta: number } {
  const amount = Math.min(state.resources.spiritStones, requested)
  return { state: { ...state, resources: { ...state.resources, spiritStones: state.resources.spiritStones - amount } }, delta: -amount }
}

function endActiveMastership(mastership: SectMastershipState | undefined, day: number, reason: SectExitReason): SectMastershipState | undefined {
  if (!mastership || mastership.status === 'ended') return mastership
  return { ...mastership, status: 'ended', endedDay: day, endedReason: reason }
}

function leaveQingyun(state: GameState, reason: SectExitReason, narrative: string): GameState {
  let next = state
  if (next.sectProgress?.activeAssignment) {
    const abandoned = resolveAbandonSectAssignment(next)
    if (abandoned.applied) next = abandoned.state
  }
  const membership = next.sectMembership!
  const mastership = endActiveMastership(membership.mastership, next.worldDay, reason)
  return {
    ...next,
    sectMembership: {
      ...membership,
      status: 'ended',
      endedDay: next.worldDay,
      exitReason: reason,
      ...(mastership ? { mastership } : {}),
    },
    identity: { ...next.identity, faction: 'loose' },
    chronicle: [...next.chronicle, {
      id: `${next.runId}:sect:qingyun:exit:${reason}:${next.worldDay}`,
      startDay: next.worldDay,
      endDay: next.worldDay,
      title: reason === 'betrayed' ? '叛离青云宗' : '被逐出青云宗',
      sceneText: reason === 'betrayed' ? '你的名字仍留在旧名册里，但从这一刻起，那一栏不再代表同门身份。' : '外院将你的在册身份划去，并把逐出缘由记在旧名籍后。',
      narrative,
      changes: [
        { label: '当前身份', value: '青云弟子 → 散修', tone: 'negative' },
        { label: '宗门内部权限', value: '全部失效', tone: 'negative' },
        ...(mastership ? [{ label: '正式师承', value: '结束', tone: 'negative' as const }] : []),
      ],
      importance: 'major',
      sourceType: 'activity',
      sourceId: `sect:qingyun:exit:${reason}`,
      locationId: next.world.currentLocationId ?? undefined,
    }],
  }
}

function violationPlan(state: GameState, violationId: SectViolationId): { severity: SectViolationSeverity; contribution: number; stones: number; expelled: boolean; penaltyText: string } | null {
  const access = getSectAccess(state)
  if (violationId === 'inner_resource_trespass') {
    if (access.innerResources) return null
    const previous = getSectViolationHistory(state).filter((entry) => entry.violationId === violationId).length
    if (previous === 0) return { severity: 'light', contribution: 3, stones: 0, expelled: false, penaltyText: '外院警告并记入违规档案，扣除少量贡献。' }
    return { severity: 'medium', contribution: 10, stones: 5, expelled: false, penaltyText: '重复越权被正式处罚，扣除贡献并罚没少量灵石。' }
  }
  if (violationId === 'core_inheritance_trespass') {
    if (access.trueInheritance) return null
    return { severity: 'heavy', contribution: 20, stones: 10, expelled: true, penaltyText: '强闯核心传承禁地属于重度违规，外院直接执行逐出。' }
  }
  if (!hasKnownEvilTechnique(state)) return null
  return { severity: 'heavy', contribution: 15, stones: 10, expelled: true, penaltyText: '在宗门内公开演练受限邪法被视为重度违规，名籍被立即取消。' }
}

export function resolveCommitSectViolation(state: GameState, violationId: SectViolationId): SectConsequenceMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (!isActiveQingyunMember(state)) return { state, applied: false, reason: 'SECT_VIOLATION_REQUIRES_ACTIVE_MEMBER' }
  if (state.world.currentLocationId !== 'qingyun_sect') return { state, applied: false, reason: 'SECT_VIOLATION_REQUIRES_QINGYUN' }
  const plan = violationPlan(state, violationId)
  if (!plan) return { state, applied: false, reason: violationId === 'public_evil_practice' ? 'NO_KNOWN_RESTRICTED_EVIL_TECHNIQUE' : 'SECT_ACCESS_ALREADY_AUTHORIZED' }

  const beforeContribution = state.sectProgress?.contribution ?? 0
  const beforeStones = state.resources.spiritStones
  const contribution = contributionPenalty(state, plan.contribution)
  const stones = spiritStonePenalty(contribution.state, plan.stones)
  const record: SectViolationRecord = {
    violationId,
    severity: plan.severity,
    worldDay: state.worldDay,
    actionLabel: VIOLATION_ACTION_LABEL[violationId],
    penaltyLabel: plan.penaltyText,
    contributionDelta: contribution.delta,
    spiritStoneDelta: stones.delta,
    expelled: plan.expelled,
  }
  let next: GameState = {
    ...stones.state,
    sectMembership: {
      ...stones.state.sectMembership!,
      violations: [...getSectViolationHistory(stones.state), record],
    },
    chronicle: [...stones.state.chronicle, {
      id: `${stones.state.runId}:sect:violation:${violationId}:${stones.state.worldDay}:${getSectViolationHistory(stones.state).length + 1}`,
      startDay: stones.state.worldDay,
      endDay: stones.state.worldDay,
      title: plan.severity === 'heavy' ? '宗门重罚' : plan.severity === 'medium' ? '宗门处罚' : '宗门警告',
      sceneText: VIOLATION_ACTION_LABEL[violationId],
      narrative: plan.penaltyText,
      changes: [
        { label: '违规等级', value: plan.severity === 'light' ? '轻' : plan.severity === 'medium' ? '中' : '重', tone: 'negative' },
        { label: '宗门贡献', value: `${beforeContribution} → ${beforeContribution + contribution.delta}`, tone: contribution.delta < 0 ? 'negative' : 'neutral' },
        ...(stones.delta < 0 ? [{ label: '下品灵石', value: `${beforeStones} → ${beforeStones + stones.delta}`, tone: 'negative' as const }] : []),
      ],
      importance: plan.severity === 'heavy' ? 'major' : 'notable',
      sourceType: 'activity',
      sourceId: `sect:violation:${violationId}`,
      locationId: stones.state.world.currentLocationId ?? undefined,
    }],
  }
  if (plan.expelled) next = leaveQingyun(next, 'expelled', `你因“${VIOLATION_ACTION_LABEL[violationId]}”受到重度处罚，自此不再拥有青云宗弟子身份。`)
  return { state: next, applied: true }
}

export function resolveBetrayQingyunSect(state: GameState): SectConsequenceMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (!isActiveQingyunMember(state)) return { state, applied: false, reason: 'BETRAYAL_REQUIRES_ACTIVE_QINGYUN_MEMBER' }
  const next = leaveQingyun(state, 'betrayed', '这是你主动做出的叛宗选择。青云宗会把这件事作为正式旧档保留下来，而不是把它当作普通离开。')
  return { state: next, applied: true }
}

export function getViolationActionAvailability(state: GameState, violationId: SectViolationId): { available: boolean; severity?: SectViolationSeverity; reason?: string } {
  if (!isActiveQingyunMember(state) || state.world.currentLocationId !== 'qingyun_sect') return { available: false, reason: '需在青云宗且仍为在册弟子' }
  const plan = violationPlan(state, violationId)
  if (!plan) {
    if (violationId === 'public_evil_practice' && !hasKnownEvilTechnique(state)) return { available: false, reason: '你目前并不会宗门明令限制的邪道功法' }
    return { available: false, reason: '你的当前身份已经拥有对应区域权限' }
  }
  return { available: true, severity: plan.severity }
}
