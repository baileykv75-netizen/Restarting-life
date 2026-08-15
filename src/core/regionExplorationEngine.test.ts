import { describe, expect, it } from 'vitest'
import { WORLD_LOCATIONS } from '../data/worldLocations'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { createInitialGameState } from './gameState'
import { verifySessionReplay } from './replayEngine'
import {
  getCurrentRegionRisk,
  getExplorationStage,
  getRegionExploredDays,
  isExplorableFixedRegion,
  resolveRegionExploration,
} from './regionExplorationEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { DAYS_PER_YEAR } from './timeEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function explorationState(locationId = 'blackwind_mountain'): GameState {
  const base = createInitialGameState({ runSeed: `explore-${locationId}` })
  return {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: locationId },
    knowledge: { locations: { [locationId]: 'discovered' } },
    flags: { ...base.flags, location_knowledge_initialized: true, adult_entry_resolved: true },
  }
}

describe('R11 fixed region exploration', () => {
  it('keeps exploration absent from untouched R05-R10-compatible initial state', () => {
    const state = createInitialGameState({ runSeed: 'pre-r11-shape' })
    expect('exploration' in state).toBe(false)
  })

  it('allows exactly the three fixed wilderness regions and rejects non-wilderness locations', () => {
    const wilderness = WORLD_LOCATIONS.filter((location) => location.type === 'wilderness').map((location) => location.id).sort()
    expect(wilderness).toEqual(['beast_ridge', 'blackwind_mountain', 'lingxi_valley'])
    for (const id of wilderness) expect(isExplorableFixedRegion(id)).toBe(true)
    for (const location of WORLD_LOCATIONS.filter((entry) => entry.type !== 'wilderness')) {
      expect(isExplorableFixedRegion(location.id)).toBe(false)
      expect(resolveRegionExploration(explorationState(location.id), 1).reason).toBe('LOCATION_NOT_EXPLORABLE')
    }
  })

  it('accepts only 1, 3, or 10 days and advances the single world clock', () => {
    for (const days of [1, 3, 10]) {
      const state = explorationState()
      const result = resolveRegionExploration(state, days)
      expect(result.applied).toBe(true)
      expect(result.completed).toBe(true)
      expect(result.state.worldDay).toBe(state.worldDay + days)
      expect(result.exploredDays).toBe(days)
    }
    expect(resolveRegionExploration(explorationState(), 2).reason).toBe('INVALID_EXPLORATION_DURATION')
  })

  it('uses the frozen 1 / 5 / 15 / 30 day stage thresholds and never creates a fifth stage', () => {
    expect(getExplorationStage(0)).toBeNull()
    expect(getExplorationStage(1)).toBe('initial')
    expect(getExplorationStage(4)).toBe('initial')
    expect(getExplorationStage(5)).toBe('familiar')
    expect(getExplorationStage(14)).toBe('familiar')
    expect(getExplorationStage(15)).toBe('deep')
    expect(getExplorationStage(29)).toBe('deep')
    expect(getExplorationStage(30)).toBe('surveyed')
    expect(getExplorationStage(300)).toBe('surveyed')
  })

  it('accumulates only the current region and reports stage crossing correctly', () => {
    const state: GameState = {
      ...explorationState('blackwind_mountain'),
      exploration: {
        locations: {
          blackwind_mountain: { locationId: 'blackwind_mountain', exploredDays: 3 },
          lingxi_valley: { locationId: 'lingxi_valley', exploredDays: 7 },
        },
      },
    }
    const result = resolveRegionExploration(state, 3)
    expect(result.previousExploredDays).toBe(3)
    expect(result.exploredDays).toBe(6)
    expect(result.stageBefore).toBe('initial')
    expect(result.stageAfter).toBe('familiar')
    expect(getRegionExploredDays(result.state, 'blackwind_mountain')).toBe(6)
    expect(getRegionExploredDays(result.state, 'lingxi_valley')).toBe(7)
  })

  it('derives deterministic character-relative risk but never hard-blocks extreme risk exploration', () => {
    const mortal = explorationState('beast_ridge')
    expect(getCurrentRegionRisk(mortal, 'extreme')).toBe('extreme')
    const result = resolveRegionExploration(mortal, 1)
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(true)

    const foundation = { ...mortal, cultivation: { realm: 'foundation' as const, stage: 1 } }
    expect(getCurrentRegionRisk(foundation, 'extreme')).toBe('manageable')
  })

  it('changes only time and current-region exploration progress on a completed exploration', () => {
    const state: GameState = {
      ...explorationState('lingxi_valley'),
      resources: { spiritStones: 23, cultivation: 17 },
      cultivation: { realm: 'qi', stage: 4 },
      relationships: { elder: 2 },
      flags: { ...explorationState('lingxi_valley').flags, custom_flag: true },
    }
    const knowledgeBefore = { ...state.knowledge.locations }
    const resourcesBefore = { ...state.resources }
    const cultivationBefore = { ...state.cultivation }
    const relationshipsBefore = { ...state.relationships }
    const locationBefore = state.world.currentLocationId
    const result = resolveRegionExploration(state, 10)
    expect(result.completed).toBe(true)
    expect(result.state.knowledge.locations).toEqual(knowledgeBefore)
    expect(result.state.resources).toEqual(resourcesBefore)
    expect(result.state.cultivation).toEqual(cultivationBefore)
    expect(result.state.relationships).toEqual(relationshipsBefore)
    expect(result.state.world.currentLocationId).toBe(locationBefore)
    expect(result.state.flags.custom_flag).toBe(true)
  })

  it('gives death priority and does not add exploration progress when lifespan ends during exploration', () => {
    const state = explorationState('blackwind_mountain')
    const nearDeath = { ...state, worldDay: state.identity.birthDay + 80 * DAYS_PER_YEAR - 1 }
    const result = resolveRegionExploration(nearDeath, 3)
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(false)
    expect(result.state.status).toBe('dead')
    expect(result.state.world.currentLocationId).toBe('blackwind_mountain')
    expect(result.state.exploration).toBeUndefined()
    expect(result.exploredDays).toBe(0)
  })

  it('persists and restores explored days without inventing progress for other regions', () => {
    const state = resolveRegionExploration(explorationState('blackwind_mountain'), 10).state
    const persistent: PersistentGame = { schemaVersion: 3, phase: 'life', currentSession: { state, debugLog: [], pendingResult: null, pendingAction: null }, pendingBirthSelection: null, archives: [], meta: { totalRuns: 1 } }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.exploration?.locations.blackwind_mountain.exploredDays).toBe(10)
    expect(loaded?.exploration?.locations.lingxi_valley).toBeUndefined()
  })

  it('replays explore-region through the existing session log without adding Chronicle entries', () => {
    let session = createGameSession({ runSeed: 'region-explore-replay', runId: 'run-region-explore-replay' })
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_LIFE_STAGE', stage: 'adult' } }).session
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'blackwind_mountain' } }).session
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'blackwind_mountain', status: 'discovered' } }).session
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_FLAG', key: 'location_knowledge_initialized', value: true } }).session
    const chronicleBefore = session.state.chronicle.length
    const explored = executeSessionCommand(session, { type: 'explore-region', days: 3 })
    expect(explored.applied).toBe(true)
    expect(explored.session.pendingResult?.changes.some((change) => change.label === '探索阶段')).toBe(true)
    expect(explored.session.state.chronicle).toHaveLength(chronicleBefore)
    expect(verifySessionReplay(explored.session)).toBe(true)
  })

  it('does not force legacy-adult states into exploration', () => {
    const legacy = createInitialGameState({ runSeed: 'legacy-region-explore' })
    const state: GameState = {
      ...legacy,
      world: { currentLocationId: 'blackwind_mountain' },
      knowledge: { locations: { blackwind_mountain: 'discovered' } },
      flags: { location_knowledge_initialized: true },
    }
    const result = resolveRegionExploration(state, 1)
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('EXPLORATION_REQUIRES_LOCATION_KNOWLEDGE')
  })
})
