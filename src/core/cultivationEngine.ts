import { getSpiritRootById, SPIRIT_ROOTS } from '../data/spiritRoots'
import { getCultivationTechniqueById, getTechniqueById, type CultivationTechniqueDefinition } from '../data/techniques'
import { getWorldLocationById } from '../data/worldLocations'
import {
  FOUNDATION_EARLY_TO_MIDDLE_THRESHOLD,
  FOUNDATION_MIDDLE_TO_LATE_THRESHOLD,
  QI_LAYER_THRESHOLD,
  REALM_CULTIVATION_FACTOR,
} from '../data/realms'
import type { StateChange } from '../types/chronicle'
import type { GameState, Realm } from '../types/game'
import type { ResolvedOutcome } from '../types/persistence'
import type { QiDensity } from '../types/world'
import { hasActiveLightInjury, hasBlockingCultivationInjury } from './injuryEngine'
import {
  addTechniqueProficiency,
  calculateTechniqueProficiencyGain,
  getProficiencyLabel,
  getTechniqueProficiencyStage,
} from './techniqueEngine'
import { DAYS_PER_YEAR, formatDuration } from './timeEngine'
import { advanceWorldTime } from './worldEngine'

/** Legacy V1 cultivation exports: keep stable for legacy-adult ActionPanel compatibility. */
export const BASIC_CULTIVATION_DAYS = DAYS_PER_YEAR
export const BASIC_CULTIVATION_GAIN = 55

export type CultivationBlockReason =
  | 'GAME_ENDED'
  | 'NOT_A_CULTIVATOR'
  | 'REALM_COMPLETE'

export interface CultivationResult {
  state: GameState
  applied: boolean
  gain?: number
  elapsedDays?: number
  reason?: CultivationBlockReason
}

export function getEffectiveSpiritRootMultiplier(state: GameState): number {
  const root = getSpiritRootById(state.identity.spiritRootId)
  if (root && root.cultivationMultiplier > 0) return root.cultivationMultiplier

  const reformedMultiplier = state.flags.reformed_spirit_root_multiplier
  if (
    typeof reformedMultiplier === 'number' &&
    Number.isFinite(reformedMultiplier) &&
    reformedMultiplier > 0
  ) return reformedMultiplier

  return 0
}

export function calculateCultivationGain(state: GameState): number {
  const realmFactor = REALM_CULTIVATION_FACTOR[state.cultivation.realm]
  const rootFactor = getEffectiveSpiritRootMultiplier(state)
  if (rootFactor <= 0 || realmFactor <= 0) return 0

  const attributeFactor = 1 + (state.stats.constitution + state.stats.comprehension - 10) * 0.03
  return Math.max(0, Math.round(BASIC_CULTIVATION_GAIN * attributeFactor * rootFactor * realmFactor))
}

export function applyAutomaticStageProgression(state: GameState): GameState {
  if (state.status !== 'playing') return state

  let stage = state.cultivation.stage
  let cultivation = state.resources.cultivation

  if (state.cultivation.realm === 'qi') {
    while (stage < 9 && cultivation >= QI_LAYER_THRESHOLD) {
      cultivation -= QI_LAYER_THRESHOLD
      stage += 1
    }
  } else if (state.cultivation.realm === 'foundation') {
    if (stage === 1 && cultivation >= FOUNDATION_EARLY_TO_MIDDLE_THRESHOLD) {
      cultivation -= FOUNDATION_EARLY_TO_MIDDLE_THRESHOLD
      stage = 2
    }
    if (stage === 2 && cultivation >= FOUNDATION_MIDDLE_TO_LATE_THRESHOLD) {
      cultivation -= FOUNDATION_MIDDLE_TO_LATE_THRESHOLD
      stage = 3
    }
  }

  if (stage === state.cultivation.stage && cultivation === state.resources.cultivation) return state

  return {
    ...state,
    cultivation: { ...state.cultivation, stage },
    resources: { ...state.resources, cultivation },
  }
}

export function performBasicCultivation(state: GameState): CultivationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.cultivation.realm === 'mortal') return { state, applied: false, reason: 'NOT_A_CULTIVATOR' }
  if (state.cultivation.realm === 'golden_core') return { state, applied: false, reason: 'REALM_COMPLETE' }

  const gain = calculateCultivationGain(state)
  const advanced = advanceWorldTime(state, BASIC_CULTIVATION_DAYS).state
  const withGain: GameState = {
    ...advanced,
    resources: {
      ...advanced.resources,
      cultivation: advanced.resources.cultivation + gain,
    },
  }
  const progressed = applyAutomaticStageProgression(withGain)

  return {
    state: progressed,
    applied: true,
    gain,
    elapsedDays: BASIC_CULTIVATION_DAYS,
  }
}

/** R16 formal V2 cultivation starts here. */
export type CultivationDuration = 1 | 3 | 10 | 30
export const CULTIVATION_DURATIONS: readonly CultivationDuration[] = [1, 3, 10, 30]
export const CULTIVATION_STAGE_POINTS = 1000
export const BASE_CULTIVATION_POINTS_PER_DAY = 4

const METHOD_SEED_TO_TECHNIQUE: Readonly<Record<string, string>> = {
  xiaozhoutian_tuna: 'xiaozhoutian_tuna',
  qingyuan_yinqi: 'qingyuan_yinqi',
  xie_basic_qi_method: 'xiaozhoutian_tuna',
  lu_basic_qi_method: 'xiaozhoutian_tuna',
}

const ENVIRONMENT_MULTIPLIER: Record<QiDensity, number> = {
  none: 0.55,
  thin: 0.7,
  low: 0.8,
  medium: 1,
  high: 1.15,
}

const ENVIRONMENT_LABEL: Record<QiDensity, string> = {
  none: '几乎无灵气',
  thin: '灵气稀薄',
  low: '灵气偏低',
  medium: '灵气普通',
  high: '灵气充沛',
}

export interface CultivationFactor {
  label: string
  multiplier: number
}

export interface CultivationPreview {
  days: CultivationDuration
  gain: number
  technique: CultivationTechniqueDefinition
  factors: CultivationFactor[]
  environmentLabel: string
}

export interface R16CultivationResult {
  state: GameState
  applied: boolean
  completed: boolean
  reason?: string
  gainApplied: number
  enteredQi: boolean
  outcome?: ResolvedOutcome
}

function r16Rejected(state: GameState, reason: string): R16CultivationResult {
  return { state, applied: false, completed: false, reason, gainApplied: 0, enteredQi: false }
}

function isCultivationDuration(days: number): days is CultivationDuration {
  return CULTIVATION_DURATIONS.includes(days as CultivationDuration)
}

function getMethodSeed(state: GameState): string | null {
  const flag = state.flags.cultivation_method_access_seed
  if (typeof flag === 'string' && flag.length > 0) return flag
  const tag = state.tags.find((entry) => entry.startsWith('cultivation_method_access:'))
  return tag ? tag.slice('cultivation_method_access:'.length) : null
}

export function getInitialTechniqueIds(state: GameState): string[] {
  const seed = getMethodSeed(state)
  const techniqueId = seed ? METHOD_SEED_TO_TECHNIQUE[seed] : undefined
  return techniqueId && getTechniqueById(techniqueId) ? [techniqueId] : []
}

export function resolveCultivationInitialization(state: GameState): R16CultivationResult {
  if (state.status !== 'playing') return r16Rejected(state, 'GAME_ENDED')
  if (state.lifeStage !== 'adult') return r16Rejected(state, 'CULTIVATION_REQUIRES_ADULT')
  if (state.cultivation.practiceInitialized) return r16Rejected(state, 'CULTIVATION_ALREADY_INITIALIZED')
  return {
    state: {
      ...state,
      cultivation: {
        ...state.cultivation,
        practiceInitialized: true,
        knownTechniqueIds: getInitialTechniqueIds(state),
        mainTechniqueId: null,
      },
    },
    applied: true,
    completed: true,
    gainApplied: 0,
    enteredQi: false,
  }
}

export function resolveMainTechniqueSelection(state: GameState, techniqueId: string): R16CultivationResult {
  if (state.status !== 'playing') return r16Rejected(state, 'GAME_ENDED')
  if (state.lifeStage !== 'adult') return r16Rejected(state, 'CULTIVATION_REQUIRES_ADULT')
  if (!state.cultivation.practiceInitialized) return r16Rejected(state, 'CULTIVATION_NOT_INITIALIZED')
  if (state.identity.spiritRootId === 'none') return r16Rejected(state, 'NO_SPIRIT_ROOT')
  const technique = getTechniqueById(techniqueId)
  if (!technique) return r16Rejected(state, 'UNKNOWN_TECHNIQUE')
  if (technique.category !== 'main') return r16Rejected(state, 'TECHNIQUE_NOT_MAIN')
  if (!getCultivationTechniqueById(techniqueId)) return r16Rejected(state, 'TECHNIQUE_BALANCE_NOT_FROZEN')
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(techniqueId)) return r16Rejected(state, 'TECHNIQUE_NOT_KNOWN')
  if (state.cultivation.mainTechniqueId === techniqueId) return r16Rejected(state, 'MAIN_TECHNIQUE_UNCHANGED')
  if (state.cultivation.techniqueSystemInitialized && state.cultivation.mainTechniqueId) {
    return r16Rejected(state, 'MAIN_TECHNIQUE_CHANGE_REQUIRES_ADAPTATION')
  }
  return {
    state: { ...state, cultivation: { ...state.cultivation, mainTechniqueId: techniqueId } },
    applied: true,
    completed: true,
    gainApplied: 0,
    enteredQi: false,
  }
}

function getEnvironment(state: GameState): { multiplier: number; label: string } | null {
  const currentId = state.world.currentLocationId
  const location = currentId ? getWorldLocationById(currentId) : undefined
  if (!location) return null
  if (location.id === 'qingyun_sect' && location.qiDensity === 'high' && state.identity.faction !== 'qingyun') {
    return { multiplier: ENVIRONMENT_MULTIPLIER.medium, label: '宗门外围 · 灵气普通' }
  }
  return { multiplier: ENVIRONMENT_MULTIPLIER[location.qiDensity], label: ENVIRONMENT_LABEL[location.qiDensity] }
}

function getAffinityMultiplier(state: GameState, technique: CultivationTechniqueDefinition): number {
  if (technique.universal) return 1
  const root = SPIRIT_ROOTS.find((entry) => entry.id === state.identity.spiritRootId)
  if (!root) return 0.85
  return root.elements.some((element) => technique.preferredElements.includes(element)) ? 1.15 : 0.85
}

function getTraitMultiplier(state: GameState, technique: CultivationTechniqueDefinition, days: CultivationDuration): { multiplier: number; factors: CultivationFactor[] } {
  let multiplier = 1
  const factors: CultivationFactor[] = []
  if (days >= 10 && state.identity.talentIds.includes('still_mind')) {
    multiplier *= 1.08
    factors.push({ label: '静心守一（长修炼）', multiplier: 1.08 })
  }
  if (technique.id === 'chiyang_jue' && state.identity.physiqueIds.includes('red_yang_body')) {
    multiplier *= 1.1
    factors.push({ label: '赤阳灵体契合', multiplier: 1.1 })
  }
  if (technique.id === 'hanshui_jing' && state.identity.physiqueIds.includes('mysterious_yin_body')) {
    multiplier *= 1.1
    factors.push({ label: '玄阴灵体契合', multiplier: 1.1 })
  }
  return { multiplier, factors }
}

export function calculateCultivationPreview(state: GameState, techniqueId: string, days: CultivationDuration): CultivationPreview | null {
  const technique = getCultivationTechniqueById(techniqueId)
  const root = SPIRIT_ROOTS.find((entry) => entry.id === state.identity.spiritRootId)
  const environment = getEnvironment(state)
  if (!technique || !root || !environment) return null
  const affinityMultiplier = getAffinityMultiplier(state, technique)
  const traits = getTraitMultiplier(state, technique, days)
  const injuryMultiplier = hasActiveLightInjury(state) ? 0.9 : 1
  const injuryFactors: CultivationFactor[] = injuryMultiplier < 1 ? [{ label: '轻伤影响', multiplier: injuryMultiplier }] : []
  const gain = Math.floor(days * BASE_CULTIVATION_POINTS_PER_DAY * root.cultivationMultiplier * technique.baseEfficiency * affinityMultiplier * environment.multiplier * traits.multiplier * injuryMultiplier)
  return {
    days,
    gain,
    technique,
    environmentLabel: environment.label,
    factors: [
      { label: root.name, multiplier: root.cultivationMultiplier },
      { label: technique.name, multiplier: technique.baseEfficiency },
      { label: technique.universal ? '通用功法' : affinityMultiplier > 1 ? '灵根契合' : '灵根不契合', multiplier: affinityMultiplier },
      { label: environment.label, multiplier: environment.multiplier },
      ...traits.factors,
      ...injuryFactors,
    ],
  }
}

export function formatCultivationRealm(realm: Realm, stage: number): string {
  if (realm === 'mortal') return '凡人 · 引气入体'
  if (realm === 'qi') return `炼气${stage}层`
  if (realm === 'foundation') return `筑基${stage === 1 ? '初期' : stage === 2 ? '中期' : stage === 3 ? '后期' : '圆满'}`
  return '金丹'
}

export function formatCultivationProgress(points: number): string {
  return `${(Math.max(0, Math.min(CULTIVATION_STAGE_POINTS, points)) / 10).toFixed(1)}%`
}

export function isQiNineComplete(state: GameState): boolean {
  return state.cultivation.realm === 'qi' && state.cultivation.stage === 9 && state.resources.cultivation >= CULTIVATION_STAGE_POINTS
}

function applyR16Progress(state: GameState, gain: number): { state: GameState; enteredQi: boolean } {
  let realm = state.cultivation.realm
  let stage = state.cultivation.stage
  let points = state.resources.cultivation + gain
  let enteredQi = false

  if (realm === 'mortal' && points >= CULTIVATION_STAGE_POINTS) {
    points -= CULTIVATION_STAGE_POINTS
    realm = 'qi'
    stage = 1
    enteredQi = true
  }

  if (realm === 'qi') {
    while (stage < 9 && points >= CULTIVATION_STAGE_POINTS) {
      points -= CULTIVATION_STAGE_POINTS
      stage += 1
    }
    if (stage === 9) points = Math.min(points, CULTIVATION_STAGE_POINTS)
  }

  let next: GameState = {
    ...state,
    resources: { ...state.resources, cultivation: points },
    cultivation: { ...state.cultivation, realm, stage },
  }

  if (enteredQi) {
    next = {
      ...next,
      chronicle: [...next.chronicle, {
        id: `${next.runId}:cultivation:entered-qi:${next.worldDay}`,
        startDay: next.worldDay,
        endDay: next.worldDay,
        title: '引气入体',
        sceneText: '灵气第一次真正沿着周天在体内运转。',
        narrative: '你完成了第一次稳定周天，正式踏入炼气一层。',
        changes: [{ label: '境界', value: '凡人 → 炼气一层', tone: 'positive' }],
        importance: 'notable',
        sourceType: 'activity',
        sourceId: 'cultivation-entered-qi',
      }],
    }
  }
  return { state: next, enteredQi }
}

function buildR16Outcome(
  before: GameState,
  after: GameState,
  preview: CultivationPreview,
  proficiencyBefore?: string,
  proficiencyAfter?: string,
): ResolvedOutcome {
  const beforeRealm = formatCultivationRealm(before.cultivation.realm, before.cultivation.stage)
  const afterRealm = formatCultivationRealm(after.cultivation.realm, after.cultivation.stage)
  const changes: StateChange[] = [{ label: '时间', value: `+${formatDuration(preview.days)}`, tone: 'neutral' }]
  if (beforeRealm !== afterRealm) changes.push({ label: '境界', value: `${beforeRealm} → ${afterRealm}`, tone: 'positive' })
  changes.push({ label: '修为', value: `${formatCultivationProgress(before.resources.cultivation)} → ${formatCultivationProgress(after.resources.cultivation)}`, tone: 'positive' })
  if (proficiencyBefore && proficiencyAfter && proficiencyBefore !== proficiencyAfter) {
    changes.push({ label: '主修熟练', value: `${proficiencyBefore} → ${proficiencyAfter}`, tone: 'positive' })
  }
  return {
    title: `闭关${formatDuration(preview.days)}`,
    narrative: `你按${preview.technique.name}运转周天，${formatDuration(preview.days)}后结束吐纳。`,
    changes,
    consequence: isQiNineComplete(after) ? '炼气九层已经圆满。继续提升需要准备筑基。' : null,
  }
}

export function resolveCultivateDays(state: GameState, days: number): R16CultivationResult {
  if (state.status !== 'playing') return r16Rejected(state, 'GAME_ENDED')
  if (state.lifeStage !== 'adult') return r16Rejected(state, 'CULTIVATION_REQUIRES_ADULT')
  if (!isCultivationDuration(days)) return r16Rejected(state, 'INVALID_CULTIVATION_DURATION')
  if (!state.cultivation.practiceInitialized) return r16Rejected(state, 'CULTIVATION_NOT_INITIALIZED')
  if (state.identity.spiritRootId === 'none') return r16Rejected(state, 'NO_SPIRIT_ROOT')
  if (state.secretRealm?.sunkenVeinChamber.active) return r16Rejected(state, 'SECRET_REALM_ACTIVE')
  if (state.events.currentEventId !== null) return r16Rejected(state, 'EVENT_PENDING')
  if (hasBlockingCultivationInjury(state)) return r16Rejected(state, 'INJURY_BLOCKS_CULTIVATION')
  if (state.cultivation.realm === 'foundation' || state.cultivation.realm === 'golden_core') return r16Rejected(state, 'R16_REALM_UNSUPPORTED')
  if (isQiNineComplete(state)) return r16Rejected(state, 'QI_NINE_COMPLETE')

  const mainTechniqueId = state.cultivation.mainTechniqueId
  if (!mainTechniqueId) return r16Rejected(state, 'NO_MAIN_TECHNIQUE')
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(mainTechniqueId)) return r16Rejected(state, 'MAIN_TECHNIQUE_NOT_KNOWN')
  const preview = calculateCultivationPreview(state, mainTechniqueId, days as CultivationDuration)
  if (!preview) return r16Rejected(state, 'CULTIVATION_CONTEXT_INVALID')

  const advanced = advanceWorldTime(state, days).state
  if (advanced.status !== 'playing') {
    return { state: advanced, applied: true, completed: false, gainApplied: 0, enteredQi: false }
  }

  const progressed = applyR16Progress(advanced, preview.gain)
  const proficiencyBefore = state.cultivation.techniqueSystemInitialized
    ? getProficiencyLabel(getTechniqueProficiencyStage(state, mainTechniqueId))
    : undefined
  const withProficiency = state.cultivation.techniqueSystemInitialized
    ? addTechniqueProficiency(progressed.state, mainTechniqueId, calculateTechniqueProficiencyGain(state, days))
    : progressed.state
  const proficiencyAfter = state.cultivation.techniqueSystemInitialized
    ? getProficiencyLabel(getTechniqueProficiencyStage(withProficiency, mainTechniqueId))
    : undefined

  return {
    state: withProficiency,
    applied: true,
    completed: true,
    gainApplied: preview.gain,
    enteredQi: progressed.enteredQi,
    outcome: buildR16Outcome(state, withProficiency, preview, proficiencyBefore, proficiencyAfter),
  }
}
