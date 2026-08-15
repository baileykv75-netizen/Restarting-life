import { SPIRIT_ROOTS } from '../data/spiritRoots'
import { getCultivationTechniqueById } from '../data/techniques'
import { getWorldLocationById } from '../data/worldLocations'
import type { StateChange } from '../types/chronicle'
import type { GameState } from '../types/game'
import type { ResolvedOutcome } from '../types/persistence'
import { getInventoryQuantity, removeItem } from './inventoryEngine'
import { addInjuries, hasActiveInjury } from './injuryEngine'
import { nextRandom } from './rng'
import { getProficiencyLabel, getTechniqueProficiencyStage } from './techniqueEngine'
import { formatDuration } from './timeEngine'
import { advanceWorldTime } from './worldEngine'

export type FoundationSpiritStoneInvestment = 0 | 30 | 60
export type FoundationFailureSeverity = 'light' | 'severe' | 'extreme'

export interface FoundationBreakthroughOptions {
  usePozhangDan: boolean
  useNingjiDan: boolean
  spiritStoneInvestment: FoundationSpiritStoneInvestment
}

export interface FoundationModifier {
  id: string
  label: string
  percent: number
}

export interface FoundationSeverityDistribution {
  light: number
  severe: number
  extreme: number
}

export interface FoundationBreakthroughPreview {
  successPercent: number
  modifiers: FoundationModifier[]
  severity: FoundationSeverityDistribution
  locationName: string
  techniqueName: string
  proficiencyLabel: string
  canAttempt: boolean
  blockReason?: string
  ownsPozhangDan: boolean
  ownsNingjiDan: boolean
  spiritStones: number
}

export interface FoundationBreakthroughResult {
  state: GameState
  applied: boolean
  completed: boolean
  reason?: string
  success?: boolean
  severity?: FoundationFailureSeverity
  outcome?: ResolvedOutcome
}

const FOUNDATION_DAYS = 14
const POZHANG_DAN_ID = 'pozhang_dan'
const NINGJI_DAN_ID = 'ningji_dan'

const QI_DENSITY_MODIFIER = {
  none: -10,
  thin: -7,
  low: -4,
  medium: 0,
  high: 6,
} as const

const PROFICIENCY_MODIFIER = {
  entry: 0,
  skilled: 4,
  minor: 8,
  major: 12,
} as const

function rejected(state: GameState, reason: string): FoundationBreakthroughResult {
  return { state, applied: false, completed: false, reason }
}

function clampPercent(value: number): number {
  return Math.max(5, Math.min(95, Math.round(value)))
}

function isInvestment(value: number): value is FoundationSpiritStoneInvestment {
  return value === 0 || value === 30 || value === 60
}

function hasFact(state: GameState, fact: string): boolean {
  return state.tags.includes(fact) || state.flags[fact] === true
}

function isQingyunCoreAuthorized(state: GameState): boolean {
  return state.identity.faction === 'qingyun'
}

function getSeverityDistribution(successPercent: number): FoundationSeverityDistribution {
  if (successPercent >= 70) return { light: 65, severe: 30, extreme: 5 }
  if (successPercent >= 45) return { light: 50, severe: 38, extreme: 12 }
  return { light: 35, severe: 45, extreme: 20 }
}

function getPrerequisiteBlockReason(state: GameState): string | undefined {
  if (state.status !== 'playing') return 'GAME_ENDED'
  if (state.lifeStage !== 'adult') return 'FOUNDATION_REQUIRES_ADULT'
  if (state.cultivation.realm !== 'qi' || state.cultivation.stage !== 9 || state.resources.cultivation !== 1000) return 'QI_NINE_NOT_COMPLETE'
  if (!state.cultivation.mainTechniqueId) return 'NO_MAIN_TECHNIQUE'
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(state.cultivation.mainTechniqueId)) return 'MAIN_TECHNIQUE_NOT_KNOWN'
  if (!getCultivationTechniqueById(state.cultivation.mainTechniqueId)) return 'MAIN_TECHNIQUE_CANNOT_FOUNDATION'
  if (hasActiveInjury(state, 'severe') || hasActiveInjury(state, 'meridian')) return 'INJURY_BLOCKS_FOUNDATION'
  if (state.secretRealm?.sunkenVeinChamber.active) return 'SECRET_REALM_ACTIVE'
  if (state.events.currentEventId !== null) return 'EVENT_PENDING'
  const location = state.world.currentLocationId ? getWorldLocationById(state.world.currentLocationId) : undefined
  if (!location) return 'FOUNDATION_LOCATION_INVALID'
  if (location.id === 'beast_ridge' && !hasFact(state, 'breakthrough_shelter:beast_ridge')) return 'FOUNDATION_SITE_UNSAFE'
  return undefined
}

function addModifier(modifiers: FoundationModifier[], id: string, label: string, percent: number): void {
  if (percent !== 0) modifiers.push({ id, label, percent })
}

export function calculateFoundationBreakthroughPreview(
  state: GameState,
  options: FoundationBreakthroughOptions,
): FoundationBreakthroughPreview | null {
  if (!isInvestment(options.spiritStoneInvestment)) return null
  const location = state.world.currentLocationId ? getWorldLocationById(state.world.currentLocationId) : undefined
  const techniqueId = state.cultivation.mainTechniqueId
  const technique = techniqueId ? getCultivationTechniqueById(techniqueId) : undefined
  if (!location || !technique) return null

  const modifiers: FoundationModifier[] = []
  const root = SPIRIT_ROOTS.find((entry) => entry.id === state.identity.spiritRootId)
  if (!technique.universal) {
    const matched = Boolean(root?.elements.some((element) => technique.preferredElements.includes(element)))
    addModifier(modifiers, 'affinity', matched ? '灵根与主修契合' : '灵根与主修不契合', matched ? 5 : -10)
  }

  const proficiencyStage = getTechniqueProficiencyStage(state, technique.id)
  addModifier(modifiers, 'proficiency', `主修${getProficiencyLabel(proficiencyStage)}`, PROFICIENCY_MODIFIER[proficiencyStage])
  if (technique.ruleTags.includes('cultivation:stable')) addModifier(modifiers, 'stable-technique', '主修运转稳定', 3)
  if (state.identity.talentIds.includes('still_mind')) addModifier(modifiers, 'still-mind', '静心守一', 4)
  if (hasActiveInjury(state, 'light')) addModifier(modifiers, 'light-injury', '当前轻伤', -8)

  const effectiveDensity = location.id === 'qingyun_sect' && !isQingyunCoreAuthorized(state) ? 'medium' : location.qiDensity
  addModifier(modifiers, 'environment', location.id === 'qingyun_sect' && !isQingyunCoreAuthorized(state) ? '青云宗外围环境' : `${location.name}灵气环境`, QI_DENSITY_MODIFIER[effectiveDensity])
  if (location.id === 'blackwind_mountain') addModifier(modifiers, 'blackwind-instability', '黑风山灵气紊乱', -5)

  if (options.usePozhangDan) addModifier(modifiers, 'pozhang-dan', '破障丹', 12)
  if (options.useNingjiDan) addModifier(modifiers, 'ningji-dan', '凝基丹', 20)
  if (options.spiritStoneInvestment === 30) addModifier(modifiers, 'stones-30', '投入30枚灵石', 8)
  if (options.spiritStoneInvestment === 60) addModifier(modifiers, 'stones-60', '投入60枚灵石', 14)
  if (hasFact(state, 'breakthrough_guidance:foundation')) addModifier(modifiers, 'foundation-guidance', '筑基以上针对性指点', 8)

  const successPercent = clampPercent(30 + modifiers.reduce((sum, modifier) => sum + modifier.percent, 0))
  const blockReason = getPrerequisiteBlockReason(state)
  const ownsPozhangDan = getInventoryQuantity(state, POZHANG_DAN_ID) > 0
  const ownsNingjiDan = getInventoryQuantity(state, NINGJI_DAN_ID) > 0
  let optionBlock = blockReason
  if (!optionBlock && options.usePozhangDan && !ownsPozhangDan) optionBlock = 'POZHANG_DAN_NOT_OWNED'
  if (!optionBlock && options.useNingjiDan && !ownsNingjiDan) optionBlock = 'NINGJI_DAN_NOT_OWNED'
  if (!optionBlock && state.resources.spiritStones < options.spiritStoneInvestment) optionBlock = 'NOT_ENOUGH_SPIRIT_STONES'

  return {
    successPercent,
    modifiers,
    severity: getSeverityDistribution(successPercent),
    locationName: location.name,
    techniqueName: technique.name,
    proficiencyLabel: getProficiencyLabel(proficiencyStage),
    canAttempt: optionBlock === undefined,
    blockReason: optionBlock,
    ownsPozhangDan,
    ownsNingjiDan,
    spiritStones: state.resources.spiritStones,
  }
}

function consumePreparation(state: GameState, options: FoundationBreakthroughOptions): { state?: GameState; reason?: string } {
  if (!isInvestment(options.spiritStoneInvestment)) return { reason: 'INVALID_SPIRIT_STONE_INVESTMENT' }
  if (state.resources.spiritStones < options.spiritStoneInvestment) return { reason: 'NOT_ENOUGH_SPIRIT_STONES' }
  if (options.usePozhangDan && getInventoryQuantity(state, POZHANG_DAN_ID) < 1) return { reason: 'POZHANG_DAN_NOT_OWNED' }
  if (options.useNingjiDan && getInventoryQuantity(state, NINGJI_DAN_ID) < 1) return { reason: 'NINGJI_DAN_NOT_OWNED' }

  let next: GameState = {
    ...state,
    resources: { ...state.resources, spiritStones: state.resources.spiritStones - options.spiritStoneInvestment },
  }
  if (options.usePozhangDan) {
    const removed = removeItem(next, POZHANG_DAN_ID, 1)
    if (!removed.applied) return { reason: removed.reason ?? 'POZHANG_DAN_CONSUME_FAILED' }
    next = removed.state
  }
  if (options.useNingjiDan) {
    const removed = removeItem(next, NINGJI_DAN_ID, 1)
    if (!removed.applied) return { reason: removed.reason ?? 'NINGJI_DAN_CONSUME_FAILED' }
    next = removed.state
  }
  return { state: next }
}

function appendBreakthroughChronicle(
  state: GameState,
  title: string,
  narrative: string,
  changes: StateChange[],
  importance: 'notable' | 'major',
  sourceId: string,
): GameState {
  return {
    ...state,
    chronicle: [...state.chronicle, {
      id: `${state.runId}:foundation:${sourceId}:${state.worldDay}:${state.chronicle.length + 1}`,
      startDay: state.worldDay - FOUNDATION_DAYS,
      endDay: state.worldDay,
      title,
      sceneText: narrative,
      narrative,
      changes,
      importance,
      sourceType: 'activity',
      sourceId,
      locationId: state.world.currentLocationId ?? undefined,
    }],
  }
}

function successOutcome(preview: FoundationBreakthroughPreview): ResolvedOutcome {
  return {
    title: '筑基成功',
    narrative: '十四日冲关结束后，丹田与经脉中的灵力完成了第一次稳定质变。你踏入筑基前期。',
    changes: [
      { label: '时间', value: `+${formatDuration(FOUNDATION_DAYS)}`, tone: 'neutral' },
      { label: '境界', value: '炼气九层 → 筑基前期', tone: 'positive' },
      { label: '修为', value: '100.0% → 0.0%', tone: 'neutral' },
    ],
    consequence: `本次筑基成功率为 ${preview.successPercent}%。接下来需要解决筑基阶段的主修延续与后续修炼。`,
  }
}

function failureOutcome(
  severity: FoundationFailureSeverity,
  preview: FoundationBreakthroughPreview,
  dead: boolean,
): ResolvedOutcome {
  const label = severity === 'light' ? '轻度失败' : severity === 'severe' ? '严重失败' : '极端失败'
  const cultivation = severity === 'light' ? '78.0%' : severity === 'severe' ? '50.0%' : '30.0%'
  return {
    title: dead ? '筑基反噬' : `筑基${label}`,
    narrative: dead
      ? '冲关失控后，经脉在反噬中崩裂。'
      : severity === 'light'
        ? '筑基未成，气机一度紊乱。'
        : severity === 'severe'
          ? '筑基未成，经脉在冲关中受到明确损伤。'
          : '筑基失控后勉强保住性命，但经脉与身体都受到重创。',
    changes: dead
      ? [{ label: '时间', value: `+${formatDuration(FOUNDATION_DAYS)}`, tone: 'neutral' }, { label: '状态', value: '死亡', tone: 'negative' }]
      : [
          { label: '时间', value: `+${formatDuration(FOUNDATION_DAYS)}`, tone: 'neutral' },
          { label: '修为', value: `100.0% → ${cultivation}`, tone: 'negative' },
        ],
    consequence: dead ? null : `本次筑基成功率为 ${preview.successPercent}%。没有额外突破冷却，伤势恢复并重新修满后可以再次尝试。`,
  }
}

function pickSeverity(rngState: number, distribution: FoundationSeverityDistribution): { severity: FoundationFailureSeverity; nextState: number } {
  const roll = nextRandom(rngState)
  const percent = roll.value * 100
  if (percent < distribution.light) return { severity: 'light', nextState: roll.nextState }
  if (percent < distribution.light + distribution.severe) return { severity: 'severe', nextState: roll.nextState }
  return { severity: 'extreme', nextState: roll.nextState }
}

export function resolveFoundationBreakthrough(
  state: GameState,
  options: FoundationBreakthroughOptions,
): FoundationBreakthroughResult {
  if (!isInvestment(options.spiritStoneInvestment)) return rejected(state, 'INVALID_SPIRIT_STONE_INVESTMENT')
  const prerequisite = getPrerequisiteBlockReason(state)
  if (prerequisite) return rejected(state, prerequisite)
  const preview = calculateFoundationBreakthroughPreview(state, options)
  if (!preview) return rejected(state, 'FOUNDATION_PREVIEW_INVALID')
  if (!preview.canAttempt) return rejected(state, preview.blockReason ?? 'FOUNDATION_PREPARATION_INVALID')

  const consumed = consumePreparation(state, options)
  if (!consumed.state) return rejected(state, consumed.reason ?? 'FOUNDATION_PREPARATION_CONSUME_FAILED')

  const advanced = advanceWorldTime(consumed.state, FOUNDATION_DAYS).state
  if (advanced.status !== 'playing') {
    return { state: advanced, applied: true, completed: false }
  }

  const successRoll = nextRandom(advanced.rngState)
  let rolledState: GameState = { ...advanced, rngState: successRoll.nextState }
  if (successRoll.value < preview.successPercent / 100) {
    rolledState = {
      ...rolledState,
      cultivation: { ...rolledState.cultivation, realm: 'foundation', stage: 1 },
      resources: { ...rolledState.resources, cultivation: 0 },
    }
    rolledState = appendBreakthroughChronicle(
      rolledState,
      '筑基成功',
      '十四日冲关后，灵力完成质变，你踏入筑基前期。',
      [
        { label: '境界', value: '炼气九层 → 筑基前期', tone: 'positive' },
        { label: '修为', value: '100.0% → 0.0%', tone: 'neutral' },
      ],
      'major',
      'foundation-success',
    )
    return { state: rolledState, applied: true, completed: true, success: true, outcome: successOutcome(preview) }
  }

  const severityRoll = pickSeverity(rolledState.rngState, preview.severity)
  rolledState = { ...rolledState, rngState: severityRoll.nextState }
  const severity = severityRoll.severity
  if (severity === 'extreme') {
    const deathRoll = nextRandom(rolledState.rngState)
    rolledState = { ...rolledState, rngState: deathRoll.nextState }
    if (deathRoll.value < 0.5) {
      const deadState: GameState = {
        ...rolledState,
        status: 'dead',
        endReason: '筑基反噬，经脉崩裂',
      }
      return { state: deadState, applied: true, completed: true, success: false, severity, outcome: failureOutcome(severity, preview, true) }
    }
  }

  const targetCultivation = severity === 'light' ? 780 : severity === 'severe' ? 500 : 300
  let failedState: GameState = {
    ...rolledState,
    resources: { ...rolledState.resources, cultivation: targetCultivation },
  }
  failedState = severity === 'light'
    ? addInjuries(failedState, 'foundation-breakthrough-light', [{ kind: 'light', recoveryDays: 10 }])
    : addInjuries(failedState, severity === 'severe' ? 'foundation-breakthrough-severe' : 'foundation-breakthrough-extreme', [
        { kind: 'severe', recoveryDays: severity === 'severe' ? 45 : 90 },
        { kind: 'meridian', recoveryDays: severity === 'severe' ? 45 : 90 },
      ])

  const title = severity === 'light' ? '筑基失败' : severity === 'severe' ? '筑基失败，经脉受创' : '筑基极端失败'
  const narrative = severity === 'light'
    ? '冲关没有完成，气机紊乱，需要一段时间恢复。'
    : severity === 'severe'
      ? '冲关未成，经脉受到明确损伤。'
      : '冲关几乎失控，你保住了性命，但身体与经脉都遭到重创。'
  failedState = appendBreakthroughChronicle(
    failedState,
    title,
    narrative,
    [{ label: '修为', value: `100.0% → ${(targetCultivation / 10).toFixed(1)}%`, tone: 'negative' }],
    severity === 'light' ? 'notable' : 'major',
    `foundation-failure-${severity}`,
  )

  return {
    state: failedState,
    applied: true,
    completed: true,
    success: false,
    severity,
    outcome: failureOutcome(severity, preview, false),
  }
}
