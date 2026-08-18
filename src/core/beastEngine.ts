import { BEAST_LOOT_DEFINITIONS, isOrdinaryBeast } from '../data/beasts'
import type {
  BeastCombatContextTag,
  BeastEcologyState,
  BeastEncounterVariant,
  BeastId,
  BeastPopulationPressure,
} from '../types/beast'
import type { GameState } from '../types/game'
import { addItem } from './inventoryEngine'
import { nextRandom, randomInt, seedToState } from './rng'

export interface BeastEncounterPreparation {
  state: GameState
  applied: boolean
  reason?: string
  variant?: BeastEncounterVariant
  instanceId?: string
}

export interface BeastLootResolution {
  items: Record<string, number>
  nextRngState: number
}

export interface BeastVictoryContext {
  beastId: BeastId
  beastName: string
  battleId: string
  locationId: string | null
  variant: BeastEncounterVariant
  instanceId?: string
  contextTags?: readonly BeastCombatContextTag[]
}

export interface BeastLootMutationResult {
  state: GameState
  applied: boolean
  reason?: string
}

function asPressure(value: number): BeastPopulationPressure {
  return Math.max(0, Math.min(3, value)) as BeastPopulationPressure
}

export function getBeastPopulationKey(locationId: string, beastId: BeastId): string {
  return `${locationId}:${beastId}`
}

function createEcology(state: GameState): BeastEcologyState {
  const coldRoll = nextRandom(seedToState(`${state.runSeed}:r22:cold-pool-scale-python`))
  const coldGenerated = coldRoll.value < 0.5
  return {
    populations: {},
    specialIndividuals: {
      coldPoolScalePython: {
        generated: coldGenerated,
        instanceId: coldGenerated ? `${state.runId}:beast:cold_pool_scale_python` : null,
        alive: coldGenerated,
        lootClaimed: false,
        lairCleared: false,
      },
      oneHornedAzureWolf: {
        uniqueId: 'one_horned_azure_wolf',
        instanceId: `${state.runId}:beast:one_horned_azure_wolf`,
        alive: true,
        lootClaimed: false,
      },
    },
  }
}

export function materializeBeastEcology(state: GameState): GameState {
  if (state.beastEcology) return state
  return { ...state, beastEcology: createEcology(state) }
}

function defaultPopulationBaseline(state: GameState, locationId: string, beastId: BeastId): BeastPopulationPressure {
  if (
    locationId === 'beast_ridge' &&
    beastId === 'greenback_wolf' &&
    state.beastEcology?.specialIndividuals.oneHornedAzureWolf.alive === false
  ) return 1
  return 2
}

function ensurePopulation(state: GameState, locationId: string, beastId: BeastId): GameState {
  const withEcology = materializeBeastEcology(state)
  const ecology = withEcology.beastEcology!
  const key = getBeastPopulationKey(locationId, beastId)
  if (ecology.populations[key]) return withEcology
  const baseline = defaultPopulationBaseline(withEcology, locationId, beastId)
  return {
    ...withEcology,
    beastEcology: {
      ...ecology,
      populations: {
        ...ecology.populations,
        [key]: { pressure: baseline, baseline, lastRecoveryCheckDay: withEcology.worldDay },
      },
    },
  }
}

export function prepareBeastEncounter(
  state: GameState,
  beastId: BeastId,
  locationId: string | null,
  requestedVariant?: BeastEncounterVariant,
): BeastEncounterPreparation {
  let next = materializeBeastEcology(state)
  const ecology = next.beastEcology!

  if (beastId === 'cold_pool_scale_python') {
    const python = ecology.specialIndividuals.coldPoolScalePython
    if (!python.generated) return { state: next, applied: false, reason: 'COLD_POOL_SCALE_PYTHON_ABSENT' }
    if (!python.alive) return { state: next, applied: false, reason: 'COLD_POOL_SCALE_PYTHON_DEAD' }
    return { state: next, applied: true, variant: 'special', instanceId: python.instanceId ?? undefined }
  }

  if (beastId === 'one_horned_azure_wolf') {
    const wolf = ecology.specialIndividuals.oneHornedAzureWolf
    if (!wolf.alive) return { state: next, applied: false, reason: 'ONE_HORNED_AZURE_WOLF_DEAD' }
    return { state: next, applied: true, variant: 'unique', instanceId: wolf.instanceId }
  }

  if (!isOrdinaryBeast(beastId)) return { state: next, applied: false, reason: 'UNKNOWN_BEAST_ECOLOGY_KIND' }
  if (locationId) {
    next = ensurePopulation(next, locationId, beastId)
    const population = next.beastEcology!.populations[getBeastPopulationKey(locationId, beastId)]
    if (population.pressure === 0) return { state: next, applied: false, reason: 'BEAST_POPULATION_DEPLETED' }
  }
  const variant = requestedVariant === 'strong' ? 'strong' : 'ordinary'
  return { state: next, applied: true, variant }
}

export function resolveBeastLoot(
  beastId: BeastId,
  variant: BeastEncounterVariant,
  rngState: number,
  contextTags: readonly BeastCombatContextTag[] = [],
): BeastLootResolution {
  let cursor = rngState
  const items: Record<string, number> = {}
  const damaged = contextTags.includes('damaged-carcass')

  for (const rule of BEAST_LOOT_DEFINITIONS[beastId]) {
    if (rule.variants && !rule.variants.includes(variant)) continue
    if (rule.chance !== undefined) {
      const roll = nextRandom(cursor)
      cursor = roll.nextState
      if (roll.value >= rule.chance) continue
    }
    const quantityRoll = randomInt(cursor, rule.min, rule.max)
    cursor = quantityRoll.nextState
    let quantity = quantityRoll.value
    if (damaged && rule.damagedPart) quantity = Math.floor(quantity / 2)
    if (quantity > 0) items[rule.itemId] = (items[rule.itemId] ?? 0) + quantity
  }

  return { items, nextRngState: cursor }
}

function reduceOrdinaryPopulation(state: GameState, locationId: string, beastId: BeastId): GameState {
  const ensured = ensurePopulation(state, locationId, beastId)
  const ecology = ensured.beastEcology!
  const key = getBeastPopulationKey(locationId, beastId)
  const population = ecology.populations[key]
  return {
    ...ensured,
    beastEcology: {
      ...ecology,
      populations: {
        ...ecology.populations,
        [key]: { ...population, pressure: asPressure(population.pressure - 1) },
      },
    },
  }
}

function killSpecialIndividual(state: GameState, beastId: BeastId): GameState {
  const withEcology = materializeBeastEcology(state)
  const ecology = withEcology.beastEcology!
  if (beastId === 'cold_pool_scale_python') {
    const python = ecology.specialIndividuals.coldPoolScalePython
    return {
      ...withEcology,
      beastEcology: {
        ...ecology,
        specialIndividuals: {
          ...ecology.specialIndividuals,
          coldPoolScalePython: { ...python, alive: false, lairCleared: true },
        },
      },
    }
  }
  if (beastId === 'one_horned_azure_wolf') {
    const populations = { ...ecology.populations }
    const key = getBeastPopulationKey('beast_ridge', 'greenback_wolf')
    const existing = populations[key]
    if (existing) {
      populations[key] = { ...existing, baseline: 1, pressure: asPressure(Math.min(existing.pressure, 1)) }
    }
    return {
      ...withEcology,
      beastEcology: {
        ...ecology,
        populations,
        specialIndividuals: {
          ...ecology.specialIndividuals,
          oneHornedAzureWolf: { ...ecology.specialIndividuals.oneHornedAzureWolf, alive: false },
        },
      },
    }
  }
  return withEcology
}

export function settleBeastVictory(state: GameState, context: BeastVictoryContext): GameState {
  let next = state
  if (isOrdinaryBeast(context.beastId) && context.variant !== 'special' && context.variant !== 'unique' && context.locationId) {
    next = reduceOrdinaryPopulation(next, context.locationId, context.beastId)
  } else if (context.beastId === 'cold_pool_scale_python' || context.beastId === 'one_horned_azure_wolf') {
    next = killSpecialIndividual(next, context.beastId)
  }

  const loot = resolveBeastLoot(
    context.beastId,
    context.variant,
    seedToState(`${context.battleId}:r22-loot`),
    context.contextTags,
  )
  if (Object.keys(loot.items).length === 0) return next
  return {
    ...next,
    pendingBeastLoot: {
      lootId: `${context.battleId}:loot`,
      sourceBattleId: context.battleId,
      beastId: context.beastId,
      beastName: context.beastName,
      remaining: loot.items,
      ...(context.instanceId ? { instanceId: context.instanceId } : {}),
    },
  }
}

function markSpecialLootSettled(state: GameState, beastId: BeastId, instanceId?: string): GameState {
  if (!state.beastEcology) return state
  if (beastId === 'cold_pool_scale_python') {
    const python = state.beastEcology.specialIndividuals.coldPoolScalePython
    if (instanceId && python.instanceId !== instanceId) return state
    return {
      ...state,
      beastEcology: {
        ...state.beastEcology,
        specialIndividuals: {
          ...state.beastEcology.specialIndividuals,
          coldPoolScalePython: { ...python, lootClaimed: true },
        },
      },
    }
  }
  if (beastId === 'one_horned_azure_wolf') {
    const wolf = state.beastEcology.specialIndividuals.oneHornedAzureWolf
    if (instanceId && wolf.instanceId !== instanceId) return state
    return {
      ...state,
      beastEcology: {
        ...state.beastEcology,
        specialIndividuals: {
          ...state.beastEcology.specialIndividuals,
          oneHornedAzureWolf: { ...wolf, lootClaimed: true },
        },
      },
    }
  }
  return state
}

function clearPendingLoot(state: GameState): GameState {
  const next = { ...state }
  delete next.pendingBeastLoot
  return next
}

export function resolveBeastLootClaim(state: GameState, itemId: string, quantity: number): BeastLootMutationResult {
  const pending = state.pendingBeastLoot
  if (!pending) return { state, applied: false, reason: 'NO_PENDING_BEAST_LOOT' }
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return { state, applied: false, reason: 'INVALID_BEAST_LOOT_QUANTITY' }
  const remaining = pending.remaining[itemId] ?? 0
  if (remaining < quantity) return { state, applied: false, reason: 'BEAST_LOOT_NOT_ENOUGH_REMAINING' }
  const added = addItem(state, itemId, quantity)
  if (!added.applied) return { state, applied: false, reason: added.reason ?? 'BEAST_LOOT_CLAIM_FAILED' }

  const nextRemaining = { ...pending.remaining }
  const left = remaining - quantity
  if (left > 0) nextRemaining[itemId] = left
  else delete nextRemaining[itemId]
  let next: GameState = { ...added.state, pendingBeastLoot: { ...pending, remaining: nextRemaining } }
  if (Object.keys(nextRemaining).length === 0) {
    next = markSpecialLootSettled(next, pending.beastId, pending.instanceId)
    next = clearPendingLoot(next)
  }
  return { state: next, applied: true }
}

export function resolveBeastLootAbandon(state: GameState): BeastLootMutationResult {
  const pending = state.pendingBeastLoot
  if (!pending) return { state, applied: false, reason: 'NO_PENDING_BEAST_LOOT' }
  let next = markSpecialLootSettled(state, pending.beastId, pending.instanceId)
  next = clearPendingLoot(next)
  return { state: next, applied: true }
}

export function resolveBeastEcologyRecovery(state: GameState): GameState {
  const ecology = state.beastEcology
  if (!ecology) return state
  let changed = false
  const populations = Object.fromEntries(Object.entries(ecology.populations).map(([key, population]) => {
    const milestones = Math.floor(Math.max(0, state.worldDay - population.lastRecoveryCheckDay) / 30)
    if (milestones <= 0) return [key, { ...population }]
    const pressure = population.pressure < population.baseline
      ? asPressure(Math.min(population.baseline, population.pressure + milestones))
      : population.pressure
    changed = true
    return [key, {
      ...population,
      pressure,
      lastRecoveryCheckDay: population.lastRecoveryCheckDay + milestones * 30,
    }]
  }))
  if (!changed) return state
  return { ...state, beastEcology: { ...ecology, populations } }
}
