import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { encodeSelectedBirthRunSeed, generateBirthCandidates } from './birthEngine'
import { getAvailableChildhoodChoices, getCurrentChildhoodEvent } from './childhoodEngine'
import { getAdultEntryView } from './adultEntryEngine'
import { createInitialGameState } from './gameState'
import {
  discoverLocation,
  getLocationKnowledgeStatus,
  getVisibleWorldConnections,
  getVisibleWorldLocations,
  learnLocationRumor,
  resolveLocationKnowledgeInitialization,
} from './locationKnowledgeEngine'
import { verifySessionReplay } from './replayEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function adultWorldState(tags: string[] = [], currentLocationId = 'qingstone_town'): GameState {
  const base = createInitialGameState({ runSeed: `knowledge-${tags.join('-')}` })
  return {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId },
    tags,
    adultEntry: {
      optionIds: ['test-entry'],
      selectedOptionId: 'test-entry',
      resolved: true,
      originLocationSeed: currentLocationId,
      startingLocationSeed: currentLocationId,
    },
    flags: { ...base.flags, adult_entry_resolved: true, adult_starting_location_seed: currentLocationId },
  }
}

describe('R09 location knowledge', () => {
  it('represents unknown by a missing key and materializes birth seeds without filling the whole world', () => {
    const before = adultWorldState([
      'location_seed:known:qingstone_town',
      'location_seed:rumored:qingxia_market',
    ])
    expect(getLocationKnowledgeStatus(before, 'beast_ridge')).toBe('unknown')
    const result = resolveLocationKnowledgeInitialization(before)
    expect(result.applied).toBe(true)
    expect(result.state.knowledge.locations.qingstone_town).toBe('discovered')
    expect(result.state.knowledge.locations.qingxia_market).toBe('rumored')
    expect(Object.prototype.hasOwnProperty.call(result.state.knowledge.locations, 'beast_ridge')).toBe(false)
  })

  it('always discovers the current location and initializes only once', () => {
    const before = adultWorldState([], 'lu_estate')
    const first = resolveLocationKnowledgeInitialization(before)
    expect(first.applied).toBe(true)
    expect(first.state.knowledge.locations.lu_estate).toBe('discovered')
    expect(first.state.flags.location_knowledge_initialized).toBe(true)
    const second = resolveLocationKnowledgeInitialization(first.state)
    expect(second.applied).toBe(false)
    expect(second.reason).toBe('LOCATION_KNOWLEDGE_ALREADY_INITIALIZED')
    expect(second.state).toEqual(first.state)
  })

  it('never downgrades discovered knowledge and allows rumor to become discovered', () => {
    let state = adultWorldState()
    state = learnLocationRumor(state, 'qingxia_market').state
    expect(getLocationKnowledgeStatus(state, 'qingxia_market')).toBe('rumored')
    state = discoverLocation(state, 'qingxia_market').state
    expect(getLocationKnowledgeStatus(state, 'qingxia_market')).toBe('discovered')
    const downgrade = learnLocationRumor(state, 'qingxia_market')
    expect(downgrade.applied).toBe(false)
    expect(getLocationKnowledgeStatus(downgrade.state, 'qingxia_market')).toBe('discovered')
  })

  it('keeps higher existing knowledge during initialization and rejects illegal fixed-world ids', () => {
    const prepared = {
      ...adultWorldState(['location_seed:rumored:blackwind_mountain']),
      knowledge: { locations: { blackwind_mountain: 'discovered' as const } },
    }
    const initialized = resolveLocationKnowledgeInitialization(prepared)
    expect(initialized.applied).toBe(true)
    expect(initialized.state.knowledge.locations.blackwind_mountain).toBe('discovered')

    const illegalWrite = learnLocationRumor(prepared, 'not_a_real_location')
    expect(illegalWrite.applied).toBe(false)
    expect(illegalWrite.state.knowledge.locations.not_a_real_location).toBeUndefined()

    const illegalSeed = resolveLocationKnowledgeInitialization(adultWorldState(['location_seed:known:not_a_real_location']))
    expect(illegalSeed.applied).toBe(false)
    expect(illegalSeed.reason).toBe('INVALID_LOCATION_SEED:not_a_real_location')
    expect(illegalSeed.state.knowledge.locations).toEqual({})
  })

  it('filters unknown nodes and hidden connections from the player-facing map model', () => {
    const state = {
      ...adultWorldState(),
      knowledge: { locations: { qingstone_town: 'discovered' as const, qingxia_market: 'rumored' as const } },
    }
    expect(getVisibleWorldLocations(state).map(({ location }) => location.id)).toEqual(['qingstone_town', 'qingxia_market'])
    expect(getVisibleWorldConnections(state).map(({ key }) => key)).toEqual(['qingstone_town::qingxia_market'])
  })

  it('persists initialized knowledge across save/load', () => {
    const state = resolveLocationKnowledgeInitialization(adultWorldState(['location_seed:rumored:qingxia_market'])).state
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.knowledge.locations).toEqual(state.knowledge.locations)
    expect(loaded?.flags.location_knowledge_initialized).toBe(true)
  })

  it('replays knowledge initialization without changing the older initialize-world command', () => {
    const pending = generateBirthCandidates({ runSeed: 'knowledge-replay', runId: 'run-knowledge-replay' })
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
    expect(session.state.knowledge.locations).toEqual({})
    const initialized = executeSessionCommand(session, { type: 'initialize-location-knowledge' })
    expect(initialized.applied).toBe(true)
    session = initialized.session
    expect(session.state.knowledge.locations[session.state.world.currentLocationId!]).toBe('discovered')
    expect(verifySessionReplay(session)).toBe(true)
  })

  it('does not force legacy adult states into the V2 knowledge initializer', () => {
    const legacy = createInitialGameState({ runSeed: 'legacy-knowledge' })
    const result = resolveLocationKnowledgeInitialization({ ...legacy, world: { currentLocationId: 'qingstone_town' } })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('LOCATION_KNOWLEDGE_REQUIRES_ADULT')
  })
})
