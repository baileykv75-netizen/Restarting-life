import type { GameState } from '../types/game'
import type { SublocationArchetype, SublocationRuntime, SublocationState } from '../types/sublocation'
import { randomInt, seedToState } from './rng'

const EARLY_THRESHOLDS = [3, 8] as const
const LATE_THRESHOLDS = [18, 30] as const

const REGION_RULES: ReadonlyArray<{
  parentLocationId: 'blackwind_mountain' | 'lingxi_valley' | 'beast_ridge'
  minCount: number
  maxCount: number
  archetypes: readonly SublocationArchetype[]
}> = [
  { parentLocationId: 'blackwind_mountain', minCount: 2, maxCount: 2, archetypes: ['cave', 'ruin'] },
  { parentLocationId: 'lingxi_valley', minCount: 1, maxCount: 2, archetypes: ['herb-valley', 'ruin'] },
  { parentLocationId: 'beast_ridge', minCount: 1, maxCount: 2, archetypes: ['beast-nest', 'ruin'] },
]

const LABELS: Record<SublocationArchetype, string> = {
  cave: '洞府',
  'herb-valley': '药谷',
  'beast-nest': '兽巢',
  ruin: '遗迹',
}

const DISCOVERY_TEXT: Record<SublocationArchetype, string> = {
  cave: '一处洞府遗迹',
  'herb-valley': '一片野生药谷',
  'beast-nest': '一处兽巢',
  ruin: '一处残破遗迹',
}

export interface SublocationInitializationResult {
  state: GameState
  applied: boolean
  reason?: string
}

export interface SublocationDiscoveryResult {
  state: GameState
  discovered: SublocationRuntime[]
}

export function getSublocationArchetypeLabel(archetype: SublocationArchetype): string {
  return LABELS[archetype]
}

export function getSublocationDiscoveryText(archetype: SublocationArchetype): string {
  return DISCOVERY_TEXT[archetype]
}

function pickFrom<T>(rngState: number, items: readonly T[]): { value: T; nextState: number } {
  const step = randomInt(rngState, 0, items.length - 1)
  return { value: items[step.value] as T, nextState: step.nextState }
}

export function generateSublocationState(runSeed: string): SublocationState {
  let rngState = seedToState(`${runSeed}:r12-sublocations`)
  const generated: Record<string, SublocationRuntime> = {}

  for (const rule of REGION_RULES) {
    const countStep = randomInt(rngState, rule.minCount, rule.maxCount)
    rngState = countStep.nextState

    for (let index = 0; index < countStep.value; index += 1) {
      const archetypeStep = pickFrom(rngState, rule.archetypes)
      rngState = archetypeStep.nextState
      const thresholdStep = pickFrom(rngState, index === 0 ? EARLY_THRESHOLDS : LATE_THRESHOLDS)
      rngState = thresholdStep.nextState
      const id = `sub:${rule.parentLocationId}:${index + 1}`
      generated[id] = {
        id,
        parentLocationId: rule.parentLocationId,
        archetype: archetypeStep.value,
        discoveryThresholdDays: thresholdStep.value,
        discovered: false,
      }
    }
  }

  return { generated }
}

export function resolveSublocationInitialization(state: GameState): SublocationInitializationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.lifeStage !== 'adult' || state.flags.location_knowledge_initialized !== true) {
    return { state, applied: false, reason: 'SUBLOCATIONS_REQUIRE_LOCATION_KNOWLEDGE' }
  }
  if (state.sublocations) return { state, applied: false, reason: 'SUBLOCATIONS_ALREADY_INITIALIZED' }
  return { state: { ...state, sublocations: generateSublocationState(state.runSeed) }, applied: true }
}

export function discoverEligibleSublocations(
  state: GameState,
  parentLocationId: string,
  exploredDays: number,
): SublocationDiscoveryResult {
  if (!state.sublocations) return { state, discovered: [] }
  const discovered: SublocationRuntime[] = []
  const generated = Object.fromEntries(
    Object.entries(state.sublocations.generated).map(([id, runtime]) => {
      if (runtime.parentLocationId === parentLocationId && !runtime.discovered && exploredDays >= runtime.discoveryThresholdDays) {
        const next = { ...runtime, discovered: true }
        discovered.push(next)
        return [id, next]
      }
      return [id, runtime]
    }),
  )
  if (discovered.length === 0) return { state, discovered }
  return { state: { ...state, sublocations: { generated } }, discovered }
}

export function getVisibleSublocations(state: GameState, parentLocationId: string): SublocationRuntime[] {
  if (!state.sublocations) return []
  return Object.values(state.sublocations.generated)
    .filter((runtime) => runtime.parentLocationId === parentLocationId && runtime.discovered)
    .sort((a, b) => a.discoveryThresholdDays - b.discoveryThresholdDays || a.id.localeCompare(b.id))
}

export function getGeneratedSublocations(state: GameState): SublocationRuntime[] {
  return state.sublocations ? Object.values(state.sublocations.generated) : []
}
