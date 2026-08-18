import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { materializeBeastEcology } from './beastEngine'
import { createInitialGameState } from './gameState'
import { verifySessionReplay } from './replayEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import {
  getVisibleStrongBeastTerritories,
  isStrongBeastTerritoryDiscovered,
  resolveStrongBeastTerritoryEntry,
} from './strongBeastTerritoryEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function territoryState(
  seed: string,
  locationId: 'lingxi_valley' | 'beast_ridge',
  days: number,
  talentIds: string[] = [],
): GameState {
  const base = createInitialGameState({ runSeed: seed, runId: `run-${seed}` })
  return {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: locationId },
    knowledge: { locations: { [locationId]: 'discovered' } },
    exploration: { locations: { [locationId]: { locationId, exploredDays: days } } },
    identity: { ...base.identity, talentIds },
    flags: { ...base.flags, location_knowledge_initialized: true },
  }
}

function findColdPoolSeed(generated: boolean): string {
  for (let index = 0; index < 200; index += 1) {
    const seed = `r23-cold-${generated}-${index}`
    const state = materializeBeastEcology(territoryState(seed, 'lingxi_valley', 15))
    if (state.beastEcology!.specialIndividuals.coldPoolScalePython.generated === generated) return seed
  }
  throw new Error(`No cold-pool seed found for generated=${generated}`)
}

describe('R23 strong beast territories', () => {
  it('does not leak hidden strong-beast truth before enough exploration', () => {
    const seed = findColdPoolSeed(true)
    const state = materializeBeastEcology(territoryState(seed, 'lingxi_valley', 4))
    expect(state.beastEcology!.specialIndividuals.coldPoolScalePython.generated).toBe(true)
    expect(getVisibleStrongBeastTerritories(state, 'lingxi_valley')).toEqual([])
    expect(isStrongBeastTerritoryDiscovered(state, 'lingxi_cold_pool')).toBe(false)
  })

  it('discovers territories at deep exploration, with relevant talents reading traces earlier', () => {
    expect(isStrongBeastTerritoryDiscovered(territoryState('normal-cold', 'lingxi_valley', 14), 'lingxi_cold_pool')).toBe(false)
    expect(isStrongBeastTerritoryDiscovered(territoryState('normal-cold', 'lingxi_valley', 15), 'lingxi_cold_pool')).toBe(true)
    expect(isStrongBeastTerritoryDiscovered(territoryState('observant-cold', 'lingxi_valley', 5, ['observant']), 'lingxi_cold_pool')).toBe(true)

    expect(isStrongBeastTerritoryDiscovered(territoryState('normal-wolf', 'beast_ridge', 14), 'azure_wolf_range')).toBe(false)
    expect(isStrongBeastTerritoryDiscovered(territoryState('beast-handler-wolf', 'beast_ridge', 5, ['beast_handler']), 'azure_wolf_range')).toBe(true)
  })

  it('does not fabricate a cold-pool python when world truth says this life has none', () => {
    const seed = findColdPoolSeed(false)
    const state = territoryState(seed, 'lingxi_valley', 15)
    const before = getVisibleStrongBeastTerritories(state, 'lingxi_valley')[0]
    expect(before?.status).toBe('uncertain')
    expect(before?.opponentId).toBeUndefined()

    const entered = resolveStrongBeastTerritoryEntry(state, 'lingxi_cold_pool')
    expect(entered.applied).toBe(true)
    expect(entered.enteredEmpty).toBe(true)
    expect(entered.state.combat).toBeUndefined()
    expect(entered.state.flags.cold_pool_checked_empty).toBe(true)
    expect(getVisibleStrongBeastTerritories(entered.state, 'lingxi_valley')[0]?.status).toBe('empty-confirmed')
  })

  it('persists an actually checked empty cold pool across save and reload', () => {
    const seed = findColdPoolSeed(false)
    const entered = resolveStrongBeastTerritoryEntry(territoryState(seed, 'lingxi_valley', 15), 'lingxi_cold_pool')
    expect(entered.applied).toBe(true)
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state: entered.state, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.flags.cold_pool_checked_empty).toBe(true)
    expect(loaded && getVisibleStrongBeastTerritories(loaded, 'lingxi_valley')[0]?.status).toBe('empty-confirmed')
    expect(loaded?.combat).toBeUndefined()
  })

  it('starts the existing CombatEngine with cold-pool context when the python really exists', () => {
    const seed = findColdPoolSeed(true)
    const state = territoryState(seed, 'lingxi_valley', 15)
    const entered = resolveStrongBeastTerritoryEntry(state, 'lingxi_cold_pool')
    expect(entered.applied).toBe(true)
    expect(entered.state.combat?.opponentId).toBe('cold-pool-scale-python')
    expect(entered.state.combat?.source).toBe('field')
    expect(entered.state.combat?.encounterVariant).toBe('special')
    expect(entered.state.combat?.contextTags).toContain('cold-pool')
  })

  it('does not hard-block a suicidal player from entering a known live territory', () => {
    const seed = findColdPoolSeed(true)
    const mortal: GameState = {
      ...territoryState(seed, 'lingxi_valley', 15),
      cultivation: { realm: 'mortal', stage: 0 },
    }
    const entered = resolveStrongBeastTerritoryEntry(mortal, 'lingxi_cold_pool')
    expect(entered.applied).toBe(true)
    expect(entered.state.combat?.opponentId).toBe('cold-pool-scale-python')
  })

  it('changes the unique wolf territory after death and never starts the unique fight again', () => {
    const base = materializeBeastEcology(territoryState('r23-wolf-dead', 'beast_ridge', 15))
    const ecology = base.beastEcology!
    const dead: GameState = {
      ...base,
      beastEcology: {
        ...ecology,
        specialIndividuals: {
          ...ecology.specialIndividuals,
          oneHornedAzureWolf: { ...ecology.specialIndividuals.oneHornedAzureWolf, alive: false },
        },
      },
    }
    const view = getVisibleStrongBeastTerritories(dead, 'beast_ridge')[0]
    expect(view?.status).toBe('cleared')
    expect(view?.canEnter).toBe(false)
    const entered = resolveStrongBeastTerritoryEntry(dead, 'azure_wolf_range')
    expect(entered.applied).toBe(false)
    expect(entered.reason).toBe('AZURE_WOLF_TERRITORY_CLEARED')
    expect(entered.state.combat).toBeUndefined()
  })

  it('replays an explicit territory entry deterministically through the existing session log', () => {
    const seed = findColdPoolSeed(true)
    let session = createGameSession({ runSeed: seed, runId: `run-${seed}` })
    const setup = [
      { type: 'game-action', action: { type: 'SET_LIFE_STAGE', stage: 'adult' } },
      { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'lingxi_valley' } },
      { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'lingxi_valley', status: 'discovered' } },
      { type: 'game-action', action: { type: 'SET_FLAG', key: 'location_knowledge_initialized', value: true } },
    ] as const
    for (const command of setup) {
      const step = executeSessionCommand(session, command)
      expect(step.applied).toBe(true)
      session = step.session
    }
    for (const days of [10, 10] as const) {
      const explored = executeSessionCommand(session, { type: 'explore-region', days })
      expect(explored.applied).toBe(true)
      session = explored.session
    }
    const entered = executeSessionCommand(session, { type: 'game-action', action: { type: 'ENTER_BEAST_TERRITORY', territoryId: 'lingxi_cold_pool' } })
    expect(entered.applied).toBe(true)
    expect(entered.session.state.combat?.opponentId).toBe('cold-pool-scale-python')
    expect(verifySessionReplay(entered.session)).toBe(true)
  })
})
