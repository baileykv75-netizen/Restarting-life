import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import { getBeastPopulationKey, materializeBeastEcology } from './beastEngine'
import { createInitialGameState } from './gameState'
import { verifySessionReplay } from './replayEngine'
import { resolveRegionExploration } from './regionExplorationEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { getOrdinaryWildernessEncounterPool, resolveWildernessEncounter } from './wildernessEncounterEngine'

function wildernessState(seed: string, locationId = 'blackwind_mountain'): GameState {
  const base = createInitialGameState({ runSeed: seed })
  return {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: locationId },
    knowledge: { locations: { [locationId]: 'discovered' } },
    flags: {
      ...base.flags,
      location_knowledge_initialized: true,
      wilderness_encounters_initialized: true,
    },
    cultivation: { realm: 'qi', stage: 5 },
  }
}

function findEncounter(locationId: string, days: 1 | 3 | 10 = 10) {
  for (let index = 0; index < 200; index += 1) {
    const state = wildernessState(`r22-fix-${locationId}-${index}`, locationId)
    const result = resolveWildernessEncounter(state, locationId, 0, days)
    if (result.encountered) return { state, result }
  }
  throw new Error(`Unable to find deterministic encounter seed for ${locationId}`)
}

describe('R22-FIX wilderness encounter loop', () => {
  it('uses only the six ordinary beasts in canonical regions and keeps special/unique truth out of random exploration', () => {
    expect(getOrdinaryWildernessEncounterPool('blackwind_mountain').map((entry) => entry.beastId)).toEqual([
      'greenback_wolf', 'redtail_fox', 'ironhide_boar', 'rock_armored_lizard',
    ])
    expect(getOrdinaryWildernessEncounterPool('lingxi_valley').map((entry) => entry.beastId)).toEqual([
      'redtail_fox', 'bishui_snake',
    ])
    expect(getOrdinaryWildernessEncounterPool('beast_ridge').map((entry) => entry.beastId)).toEqual([
      'greenback_wolf', 'red_maned_ape',
    ])
    const all = ['blackwind_mountain', 'lingxi_valley', 'beast_ridge']
      .flatMap((locationId) => getOrdinaryWildernessEncounterPool(locationId).map((entry) => entry.beastId))
    expect(all).not.toContain('cold_pool_scale_python')
    expect(all).not.toContain('one_horned_azure_wolf')
  })

  it('is opt-in for compatibility so pre-FIX explore commands keep their old no-encounter semantics', () => {
    const state = wildernessState('r22-fix-compat')
    const legacyCompatible = {
      ...state,
      flags: { ...state.flags, wilderness_encounters_initialized: false },
    }
    const result = resolveRegionExploration(legacyCompatible, 10)
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(true)
    expect(result.state.combat).toBeUndefined()
    expect(result.encounteredOpponentId).toBeUndefined()
    expect(result.state.worldDay).toBe(legacyCompatible.worldDay + 10)
  })

  it('uses exploration duration plus ecology pressure for encounter exposure without a second timer', () => {
    const baseline = wildernessState('r22-fix-chance')
    expect(resolveWildernessEncounter(baseline, 'blackwind_mountain', 0, 1).chance).toBe(0.25)
    expect(resolveWildernessEncounter(baseline, 'blackwind_mountain', 0, 3).chance).toBe(0.5)
    expect(resolveWildernessEncounter(baseline, 'blackwind_mountain', 0, 10).chance).toBe(0.8)

    const materialized = materializeBeastEcology(baseline)
    const populations = { ...materialized.beastEcology!.populations }
    for (const candidate of getOrdinaryWildernessEncounterPool('blackwind_mountain')) {
      populations[getBeastPopulationKey('blackwind_mountain', candidate.beastId)] = {
        pressure: 1,
        baseline: 2,
        lastRecoveryCheckDay: materialized.worldDay,
      }
    }
    const sparse: GameState = { ...materialized, beastEcology: { ...materialized.beastEcology!, populations } }
    expect(resolveWildernessEncounter(sparse, 'blackwind_mountain', 0, 10).chance).toBe(0.4)
  })

  it('does not generate an encounter when every ordinary population in the region is depleted', () => {
    const base = materializeBeastEcology(wildernessState('r22-fix-depleted'))
    const populations = { ...base.beastEcology!.populations }
    for (const candidate of getOrdinaryWildernessEncounterPool('blackwind_mountain')) {
      populations[getBeastPopulationKey('blackwind_mountain', candidate.beastId)] = {
        pressure: 0,
        baseline: 2,
        lastRecoveryCheckDay: base.worldDay,
      }
    }
    const depleted: GameState = { ...base, beastEcology: { ...base.beastEcology!, populations } }
    const result = resolveWildernessEncounter(depleted, 'blackwind_mountain', 0, 10)
    expect(result.encountered).toBe(false)
    expect(result.chance).toBe(0)
    expect(result.reason).toBe('ORDINARY_BEASTS_DEPLETED')
  })

  it('turns a real exploration into the existing CombatEngine after time/progress resolve', () => {
    const { state } = findEncounter('lingxi_valley', 10)
    const result = resolveRegionExploration(state, 10)
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(true)
    expect(result.state.worldDay).toBe(state.worldDay + 10)
    expect(result.exploredDays).toBe(10)
    expect(result.encounteredOpponentId).toBeDefined()
    expect(result.state.combat?.source).toBe('field')
    expect(result.state.combat?.encounterVariant).toBe('ordinary')
    expect(getOrdinaryWildernessEncounterPool('lingxi_valley').map((entry) => entry.opponentId)).toContain(result.state.combat?.opponentId)
  })

  it('keeps an encounter-bearing explore command deterministic through Session replay', () => {
    let completed = null as ReturnType<typeof executeSessionCommand> | null
    for (let index = 0; index < 200 && !completed; index += 1) {
      let session = createGameSession({ runSeed: `r22-fix-replay-${index}`, runId: `run-r22-fix-replay-${index}` })
      for (const command of [
        { type: 'game-action', action: { type: 'SET_LIFE_STAGE', stage: 'adult' } },
        { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'blackwind_mountain' } },
        { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'blackwind_mountain', status: 'discovered' } },
        { type: 'game-action', action: { type: 'SET_FLAG', key: 'location_knowledge_initialized', value: true } },
        { type: 'game-action', action: { type: 'SET_FLAG', key: 'wilderness_encounters_initialized', value: true } },
      ] as const) {
        const step = executeSessionCommand(session, command)
        expect(step.applied).toBe(true)
        session = step.session
      }
      const explored = executeSessionCommand(session, { type: 'explore-region', days: 10 })
      expect(explored.applied).toBe(true)
      if (explored.session.state.combat) completed = explored
    }
    expect(completed).not.toBeNull()
    expect(completed!.session.state.combat).toBeDefined()
    expect(verifySessionReplay(completed!.session)).toBe(true)
  })
})
