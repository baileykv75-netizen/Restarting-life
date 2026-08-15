import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import type { SublocationRuntime } from '../types/sublocation'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { encodeSelectedBirthRunSeed, generateBirthCandidates } from './birthEngine'
import { getAdultEntryView } from './adultEntryEngine'
import { getAvailableChildhoodChoices, getCurrentChildhoodEvent } from './childhoodEngine'
import { applyGameAction } from './gameActionReducer'
import { createInitialGameState } from './gameState'
import { resolveRegionExploration } from './regionExplorationEngine'
import { verifySessionReplay } from './replayEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import {
  discoverEligibleSublocations,
  generateSublocationState,
  getGeneratedSublocations,
  getVisibleSublocations,
} from './sublocationEngine'
import { DAYS_PER_YEAR } from './timeEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function regionState(locationId = 'blackwind_mountain', seed = 'r12-region'): GameState {
  const base = createInitialGameState({ runSeed: seed })
  return {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: locationId },
    knowledge: { locations: { [locationId]: 'discovered' } },
    flags: { location_knowledge_initialized: true, adult_entry_resolved: true },
  }
}

function customRuntime(parentLocationId: string, thresholds: number[]): Record<string, SublocationRuntime> {
  return Object.fromEntries(thresholds.map((threshold, index) => {
    const id = `test:${parentLocationId}:${index + 1}`
    return [id, {
      id,
      parentLocationId,
      archetype: parentLocationId === 'lingxi_valley' ? 'herb-valley' as const : parentLocationId === 'beast_ridge' ? 'beast-nest' as const : 'ruin' as const,
      discoveryThresholdDays: threshold,
      discovered: false,
    }]
  }))
}

describe('R12 random sublocation runtime', () => {
  it('generates only 4-6 finite instances on the three wilderness parents', () => {
    const state = generateSublocationState('r12-count')
    const generated = Object.values(state.generated)
    expect(generated.length).toBeGreaterThanOrEqual(4)
    expect(generated.length).toBeLessThanOrEqual(6)
    expect(new Set(generated.map((runtime) => runtime.id)).size).toBe(generated.length)
    expect(new Set(generated.map((runtime) => runtime.parentLocationId))).toEqual(new Set(['blackwind_mountain', 'lingxi_valley', 'beast_ridge']))
  })

  it('keeps archetypes compatible with their parent region', () => {
    for (const runtime of Object.values(generateSublocationState('r12-archetypes').generated)) {
      if (runtime.parentLocationId === 'blackwind_mountain') expect(['cave', 'ruin']).toContain(runtime.archetype)
      if (runtime.parentLocationId === 'lingxi_valley') expect(['herb-valley', 'ruin']).toContain(runtime.archetype)
      if (runtime.parentLocationId === 'beast_ridge') expect(['beast-nest', 'ruin']).toContain(runtime.archetype)
      expect([3, 8, 18, 30]).toContain(runtime.discoveryThresholdDays)
      expect(runtime.discovered).toBe(false)
    }
  })

  it('is deterministic for one life and varies across different run seeds', () => {
    expect(generateSublocationState('same-life')).toEqual(generateSublocationState('same-life'))
    const variants = new Set(Array.from({ length: 12 }, (_, index) => JSON.stringify(generateSublocationState(`life-${index}`))))
    expect(variants.size).toBeGreaterThan(1)
  })

  it('initializes once without advancing time or changing the main rng state', () => {
    const state = regionState()
    const beforeDay = state.worldDay
    const beforeRng = state.rngState
    const initialized = applyGameAction(state, { type: 'INITIALIZE_SUBLOCATIONS' })
    expect(initialized.applied).toBe(true)
    expect(initialized.state.worldDay).toBe(beforeDay)
    expect(initialized.state.rngState).toBe(beforeRng)
    expect(getGeneratedSublocations(initialized.state).length).toBeGreaterThanOrEqual(4)
    const again = applyGameAction(initialized.state, { type: 'INITIALIZE_SUBLOCATIONS' })
    expect(again.applied).toBe(false)
    expect(again.reason).toBe('SUBLOCATIONS_ALREADY_INITIALIZED')
  })

  it('does not expose undiscovered quantity, archetypes, or thresholds through the visible view', () => {
    const initialized = applyGameAction(regionState(), { type: 'INITIALIZE_SUBLOCATIONS' }).state
    expect(getGeneratedSublocations(initialized).length).toBeGreaterThan(0)
    expect(getVisibleSublocations(initialized, 'blackwind_mountain')).toEqual([])
  })

  it('discovers exact threshold crossings and can reveal multiple instances in one long exploration', () => {
    const base = regionState()
    const state: GameState = {
      ...base,
      sublocations: { generated: customRuntime('blackwind_mountain', [3, 8, 18, 30]) },
    }
    expect(discoverEligibleSublocations(state, 'blackwind_mountain', 2).discovered).toHaveLength(0)
    expect(discoverEligibleSublocations(state, 'blackwind_mountain', 3).discovered.map((item) => item.discoveryThresholdDays)).toEqual([3])
    expect(discoverEligibleSublocations(state, 'blackwind_mountain', 18).discovered.map((item) => item.discoveryThresholdDays)).toEqual([3, 8, 18])

    const explored = resolveRegionExploration({ ...state, exploration: { locations: { blackwind_mountain: { locationId: 'blackwind_mountain', exploredDays: 0 } } } }, 10)
    expect(explored.completed).toBe(true)
    expect(explored.discoveredSublocations.map((item) => item.discoveryThresholdDays)).toEqual([3, 8])
    expect(getVisibleSublocations(explored.state, 'blackwind_mountain')).toHaveLength(2)
  })

  it('only reveals the current region and never regresses already discovered instances', () => {
    const base = regionState('blackwind_mountain')
    const generated = {
      ...customRuntime('blackwind_mountain', [3]),
      ...customRuntime('lingxi_valley', [3]),
    }
    const state: GameState = { ...base, sublocations: { generated } }
    const first = discoverEligibleSublocations(state, 'blackwind_mountain', 3)
    expect(first.discovered).toHaveLength(1)
    expect(getVisibleSublocations(first.state, 'lingxi_valley')).toHaveLength(0)
    const second = discoverEligibleSublocations(first.state, 'blackwind_mountain', 30)
    expect(second.discovered).toHaveLength(0)
    expect(getVisibleSublocations(second.state, 'blackwind_mountain')).toHaveLength(1)
  })

  it('does not discover anything when lifespan ends during exploration', () => {
    const initialized = applyGameAction(regionState(), { type: 'INITIALIZE_SUBLOCATIONS' }).state
    const forced: GameState = {
      ...initialized,
      worldDay: initialized.identity.birthDay + 80 * DAYS_PER_YEAR - 1,
      sublocations: { generated: customRuntime('blackwind_mountain', [3]) },
    }
    const result = resolveRegionExploration(forced, 3)
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(false)
    expect(result.discoveredSublocations).toEqual([])
    expect(getVisibleSublocations(result.state, 'blackwind_mountain')).toEqual([])
    expect(result.state.exploration).toBeUndefined()
  })

  it('does not alter fixed-world knowledge, position, resources, cultivation, or relationships', () => {
    const base = regionState()
    const initialized = applyGameAction(base, { type: 'INITIALIZE_SUBLOCATIONS' }).state
    const before = {
      knowledge: initialized.knowledge,
      world: initialized.world,
      resources: initialized.resources,
      cultivation: initialized.cultivation,
      relationships: initialized.relationships,
    }
    const result = resolveRegionExploration(initialized, 10)
    expect(result.state.knowledge).toEqual(before.knowledge)
    expect(result.state.world).toEqual(before.world)
    expect(result.state.resources).toEqual(before.resources)
    expect(result.state.cultivation).toEqual(before.cultivation)
    expect(result.state.relationships).toEqual(before.relationships)
  })

  it('persists generated and discovered runtime across save reload', () => {
    const initialized = applyGameAction(regionState(), { type: 'INITIALIZE_SUBLOCATIONS' }).state
    const explored = resolveRegionExploration(initialized, 10).state
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state: explored, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.sublocations).toEqual(explored.sublocations)
    expect(loaded?.sublocations).not.toBe(explored.sublocations)
    expect(loaded?.exploration).toEqual(explored.exploration)
  })

  it('replays initialization and a discovery-producing exploration through Session commands', () => {
    const pending = generateBirthCandidates({ runSeed: 'r12-replay', runId: 'run-r12-replay' })
    const encoded = encodeSelectedBirthRunSeed(pending.runSeed, pending.candidates[0].index)
    let session = createGameSession({ runSeed: encoded, runId: pending.runId })
    for (let step = 0; step < 2; step += 1) {
      const event = getCurrentChildhoodEvent(session.state)!
      const choice = getAvailableChildhoodChoices(session.state, event)[0]
      session = executeSessionCommand(session, { type: 'childhood-choice', choiceId: choice.id }).session
    }
    const adultOption = getAdultEntryView(session.state)!.options[0]
    session = executeSessionCommand(session, { type: 'adult-entry-choice', optionId: adultOption.id }).session
    session = executeSessionCommand(session, { type: 'initialize-world' }).session
    session = executeSessionCommand(session, { type: 'initialize-location-knowledge' }).session
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'blackwind_mountain', status: 'discovered' } }).session
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'blackwind_mountain' } }).session
    const initialized = executeSessionCommand(session, { type: 'game-action', action: { type: 'INITIALIZE_SUBLOCATIONS' } })
    expect(initialized.applied).toBe(true)
    session = initialized.session
    const explored = executeSessionCommand(session, { type: 'explore-region', days: 10 })
    expect(explored.applied).toBe(true)
    session = explored.session
    expect(getVisibleSublocations(session.state, 'blackwind_mountain').length).toBeGreaterThanOrEqual(1)
    expect(verifySessionReplay(session)).toBe(true)
  })

  it('keeps pre-R12 and legacy-adult states legal without forcing a runtime object', () => {
    const old = regionState()
    expect(old.sublocations).toBeUndefined()
    const legacy = createInitialGameState({ runSeed: 'legacy-r12' })
    const result = applyGameAction({ ...legacy, flags: { location_knowledge_initialized: true } }, { type: 'INITIALIZE_SUBLOCATIONS' })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('SUBLOCATIONS_REQUIRE_LOCATION_KNOWLEDGE')
  })
})
