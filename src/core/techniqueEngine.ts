import {
  getCultivationTechniqueById,
  getTechniqueById,
  type TechniqueDefinition,
  type TechniqueMoveDefinition,
  type TechniqueProficiencyStage,
} from '../data/techniques'
import type { StateChange } from '../types/chronicle'
import type { GameState } from '../types/game'
import type { ResolvedOutcome } from '../types/persistence'
import { formatDuration } from './timeEngine'
import { advanceWorldTime } from './worldEngine'

export type TechniquePracticeDuration = 1 | 3 | 10 | 30
export const TECHNIQUE_PRACTICE_DURATIONS: readonly TechniquePracticeDuration[] = [1, 3, 10, 30]

export const PROFICIENCY_THRESHOLDS: Readonly<Record<TechniqueProficiencyStage, number>> = {
  entry: 0,
  skilled: 1000,
  minor: 3000,
  major: 6000,
}

const PROFICIENCY_LABELS: Readonly<Record<TechniqueProficiencyStage, string>> = {
  entry: '入门',
  skilled: '熟练',
  minor: '小成',
  major: '大成',
}

const PROFICIENCY_RANK: Readonly<Record<TechniqueProficiencyStage, number>> = {
  entry: 0,
  skilled: 1,
  minor: 2,
  major: 3,
}

export type TechniqueChangeTier = 'similar' | 'moderate' | 'major'

export interface TechniqueChangePreview {
  technique: TechniqueDefinition
  tier: TechniqueChangeTier
  adaptationDays: number
  cultivationLossRatio: number
  cultivationLossPoints: number
}

export interface TechniqueSystemResult {
  state: GameState
  applied: boolean
  completed: boolean
  reason?: string
  outcome?: ResolvedOutcome
}

function rejected(state: GameState, reason: string): TechniqueSystemResult {
  return { state, applied: false, completed: false, reason }
}

function isPracticeDuration(days: number): days is TechniquePracticeDuration {
  return TECHNIQUE_PRACTICE_DURATIONS.includes(days as TechniquePracticeDuration)
}

function formatCultivationPoints(points: number): string {
  return `${(Math.max(0, Math.min(1000, points)) / 10).toFixed(1)}%`
}

export function getTechniqueProficiencyPoints(state: GameState, techniqueId: string): number {
  const value = state.cultivation.techniquePractice?.[techniqueId]?.proficiencyPoints ?? 0
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function getProficiencyStage(points: number): TechniqueProficiencyStage {
  if (points >= PROFICIENCY_THRESHOLDS.major) return 'major'
  if (points >= PROFICIENCY_THRESHOLDS.minor) return 'minor'
  if (points >= PROFICIENCY_THRESHOLDS.skilled) return 'skilled'
  return 'entry'
}

export function getTechniqueProficiencyStage(state: GameState, techniqueId: string): TechniqueProficiencyStage {
  return getProficiencyStage(getTechniqueProficiencyPoints(state, techniqueId))
}

export function getProficiencyLabel(stage: TechniqueProficiencyStage): string {
  return PROFICIENCY_LABELS[stage]
}

export function isTechniqueMoveUnlocked(state: GameState, techniqueId: string, move: TechniqueMoveDefinition): boolean {
  const required = move.requiredProficiency ?? 'entry'
  return PROFICIENCY_RANK[getTechniqueProficiencyStage(state, techniqueId)] >= PROFICIENCY_RANK[required]
}

export function calculateTechniqueProficiencyGain(state: GameState, days: number): number {
  if (!isPracticeDuration(days)) return 0
  const multiplier = state.identity.talentIds.includes('quick_study') ? 1.15 : 1
  return Math.floor(days * 20 * multiplier)
}

export function addTechniqueProficiency(state: GameState, techniqueId: string, gain: number): GameState {
  if (!state.cultivation.techniqueSystemInitialized || gain <= 0) return state
  const current = getTechniqueProficiencyPoints(state, techniqueId)
  const nextPoints = Math.min(PROFICIENCY_THRESHOLDS.major, current + Math.floor(gain))
  return {
    ...state,
    cultivation: {
      ...state.cultivation,
      techniquePractice: {
        ...(state.cultivation.techniquePractice ?? {}),
        [techniqueId]: { proficiencyPoints: nextPoints },
      },
    },
  }
}

export function resolveTechniqueSystemInitialization(state: GameState): TechniqueSystemResult {
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  if (state.lifeStage !== 'adult') return rejected(state, 'TECHNIQUE_SYSTEM_REQUIRES_ADULT')
  if (!state.cultivation.practiceInitialized) return rejected(state, 'CULTIVATION_NOT_INITIALIZED')
  if (state.cultivation.techniqueSystemInitialized) return rejected(state, 'TECHNIQUE_SYSTEM_ALREADY_INITIALIZED')

  const practice = Object.fromEntries(
    (state.cultivation.knownTechniqueIds ?? [])
      .filter((id) => Boolean(getTechniqueById(id)))
      .map((id) => [id, { proficiencyPoints: 0 }]),
  )

  return {
    state: {
      ...state,
      cultivation: {
        ...state.cultivation,
        techniqueSystemInitialized: true,
        auxiliaryTechniqueIds: [],
        techniquePractice: practice,
      },
    },
    applied: true,
    completed: true,
  }
}

export function resolveSetAuxiliaryTechnique(state: GameState, techniqueId: string, enabled: boolean): TechniqueSystemResult {
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  if (state.lifeStage !== 'adult') return rejected(state, 'TECHNIQUE_SYSTEM_REQUIRES_ADULT')
  if (!state.cultivation.techniqueSystemInitialized) return rejected(state, 'TECHNIQUE_SYSTEM_NOT_INITIALIZED')
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(techniqueId)) return rejected(state, 'TECHNIQUE_NOT_KNOWN')
  const technique = getTechniqueById(techniqueId)
  if (!technique) return rejected(state, 'UNKNOWN_TECHNIQUE')
  if (technique.category === 'main') return rejected(state, 'MAIN_TECHNIQUE_CANNOT_BE_AUXILIARY')

  const current = state.cultivation.auxiliaryTechniqueIds ?? []
  const alreadyEnabled = current.includes(techniqueId)
  if (alreadyEnabled === enabled) return rejected(state, 'AUXILIARY_TECHNIQUE_UNCHANGED')
  const auxiliaryTechniqueIds = enabled
    ? [...current, techniqueId]
    : current.filter((id) => id !== techniqueId)

  return {
    state: { ...state, cultivation: { ...state.cultivation, auxiliaryTechniqueIds } },
    applied: true,
    completed: true,
  }
}

function practiceOutcome(
  technique: TechniqueDefinition,
  days: TechniquePracticeDuration,
  beforeStage: TechniqueProficiencyStage,
  afterStage: TechniqueProficiencyStage,
): ResolvedOutcome {
  const changes: StateChange[] = [{ label: '时间', value: `+${formatDuration(days)}`, tone: 'neutral' }]
  changes.push({
    label: '熟练度',
    value: beforeStage === afterStage ? getProficiencyLabel(afterStage) : `${getProficiencyLabel(beforeStage)} → ${getProficiencyLabel(afterStage)}`,
    tone: beforeStage === afterStage ? 'neutral' : 'positive',
  })
  return {
    title: `练习${formatDuration(days)}`,
    narrative: `你用${formatDuration(days)}专门练习${technique.name}，把动作与运转重新过了一遍。`,
    changes,
    consequence: null,
  }
}

export function resolveTechniquePracticeDays(state: GameState, techniqueId: string, days: number): TechniqueSystemResult {
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  if (state.lifeStage !== 'adult') return rejected(state, 'TECHNIQUE_SYSTEM_REQUIRES_ADULT')
  if (!isPracticeDuration(days)) return rejected(state, 'INVALID_TECHNIQUE_PRACTICE_DURATION')
  if (!state.cultivation.techniqueSystemInitialized) return rejected(state, 'TECHNIQUE_SYSTEM_NOT_INITIALIZED')
  if (state.secretRealm?.sunkenVeinChamber.active) return rejected(state, 'SECRET_REALM_ACTIVE')
  if (state.events.currentEventId !== null) return rejected(state, 'EVENT_PENDING')
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(techniqueId)) return rejected(state, 'TECHNIQUE_NOT_KNOWN')

  const technique = getTechniqueById(techniqueId)
  if (!technique) return rejected(state, 'UNKNOWN_TECHNIQUE')
  if (technique.category === 'main') return rejected(state, 'MAIN_TECHNIQUE_USES_CULTIVATION_PRACTICE')

  const beforeStage = getTechniqueProficiencyStage(state, techniqueId)
  const advanced = advanceWorldTime(state, days).state
  if (advanced.status !== 'playing') return { state: advanced, applied: true, completed: false }

  const gain = calculateTechniqueProficiencyGain(state, days)
  const practiced = addTechniqueProficiency(advanced, techniqueId, gain)
  const afterStage = getTechniqueProficiencyStage(practiced, techniqueId)
  return {
    state: practiced,
    applied: true,
    completed: true,
    outcome: practiceOutcome(technique, days, beforeStage, afterStage),
  }
}

function isEvilTechnique(technique: TechniqueDefinition): boolean {
  return technique.ruleTags.includes('cultivation:evil')
}

function sharesPreferredElement(a: TechniqueDefinition, b: TechniqueDefinition): boolean {
  const first = a.preferredElements ?? []
  const second = b.preferredElements ?? []
  return first.some((element) => second.includes(element))
}

function getTechniqueChangeTier(current: TechniqueDefinition, target: TechniqueDefinition): TechniqueChangeTier {
  if (isEvilTechnique(current) !== isEvilTechnique(target)) return 'major'
  if (current.universal === true && target.universal === true) return 'similar'
  if (current.universal === true || target.universal === true) return 'moderate'
  if (sharesPreferredElement(current, target)) return 'moderate'
  return 'major'
}

export function getMainTechniqueChangePreview(state: GameState, targetTechniqueId: string): TechniqueChangePreview | null {
  const currentId = state.cultivation.mainTechniqueId
  if (!currentId || currentId === targetTechniqueId) return null
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(targetTechniqueId)) return null
  const current = getTechniqueById(currentId)
  const target = getTechniqueById(targetTechniqueId)
  if (!current || !target || current.category !== 'main' || target.category !== 'main') return null
  if (!getCultivationTechniqueById(targetTechniqueId)) return null

  const tier = getTechniqueChangeTier(current, target)
  const baseDays = tier === 'similar' ? 3 : tier === 'moderate' ? 7 : 14
  const cultivationLossRatio = tier === 'similar' ? 0.05 : tier === 'moderate' ? 0.1 : 0.2
  const adaptationDays = state.identity.talentIds.includes('quick_study') ? Math.ceil(baseDays * 0.8) : baseDays
  return {
    technique: target,
    tier,
    adaptationDays,
    cultivationLossRatio,
    cultivationLossPoints: Math.floor(state.resources.cultivation * cultivationLossRatio),
  }
}

function changeMainOutcome(before: GameState, after: GameState, preview: TechniqueChangePreview): ResolvedOutcome {
  return {
    title: `改修${preview.technique.name}`,
    narrative: `你用了${formatDuration(preview.adaptationDays)}调整行气次序与经脉适应，随后将${preview.technique.name}定为新的主修。`,
    changes: [
      { label: '时间', value: `+${formatDuration(preview.adaptationDays)}`, tone: 'neutral' },
      { label: '当前修为', value: `${formatCultivationPoints(before.resources.cultivation)} → ${formatCultivationPoints(after.resources.cultivation)}`, tone: preview.cultivationLossPoints > 0 ? 'negative' : 'neutral' },
    ],
    consequence: null,
  }
}

export function resolveChangeMainTechnique(state: GameState, targetTechniqueId: string): TechniqueSystemResult {
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  if (state.lifeStage !== 'adult') return rejected(state, 'TECHNIQUE_SYSTEM_REQUIRES_ADULT')
  if (!state.cultivation.techniqueSystemInitialized) return rejected(state, 'TECHNIQUE_SYSTEM_NOT_INITIALIZED')
  if (state.identity.spiritRootId === 'none') return rejected(state, 'NO_SPIRIT_ROOT')
  if (state.secretRealm?.sunkenVeinChamber.active) return rejected(state, 'SECRET_REALM_ACTIVE')
  if (state.events.currentEventId !== null) return rejected(state, 'EVENT_PENDING')
  if (!state.cultivation.mainTechniqueId) return rejected(state, 'FIRST_MAIN_SELECTION_IS_FREE')
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(targetTechniqueId)) return rejected(state, 'TECHNIQUE_NOT_KNOWN')

  const target = getTechniqueById(targetTechniqueId)
  if (!target) return rejected(state, 'UNKNOWN_TECHNIQUE')
  if (target.category !== 'main') return rejected(state, 'TECHNIQUE_NOT_MAIN')
  if (!getCultivationTechniqueById(targetTechniqueId)) return rejected(state, 'TECHNIQUE_BALANCE_NOT_FROZEN')
  if (state.cultivation.mainTechniqueId === targetTechniqueId) return rejected(state, 'MAIN_TECHNIQUE_UNCHANGED')

  const preview = getMainTechniqueChangePreview(state, targetTechniqueId)
  if (!preview) return rejected(state, 'TECHNIQUE_CHANGE_UNAVAILABLE')
  const advanced = advanceWorldTime(state, preview.adaptationDays).state
  if (advanced.status !== 'playing') return { state: advanced, applied: true, completed: false }

  const next: GameState = {
    ...advanced,
    resources: {
      ...advanced.resources,
      cultivation: Math.max(0, advanced.resources.cultivation - preview.cultivationLossPoints),
    },
    cultivation: {
      ...advanced.cultivation,
      mainTechniqueId: targetTechniqueId,
    },
  }
  return {
    state: next,
    applied: true,
    completed: true,
    outcome: changeMainOutcome(state, next, preview),
  }
}
