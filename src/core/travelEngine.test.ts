import { describe, expect, it } from 'vitest'
import { WORLD_ROUTES } from '../data/worldRoutes'
import { WORLD_LOCATIONS } from '../data/worldLocations'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { encodeSelectedBirthRunSeed, generateBirthCandidates } from './birthEngine'
import { getAvailableChildhoodChoices, getCurrentChildhoodEvent } from './childhoodEngine'
import { getAdultEntryView } from './adultEntryEngine'
import { createInitialGameState } from './gameState'
import { verifySessionReplay } from './replayEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { DAYS_PER_YEAR } from './timeEngine'
import { findFastTravelPath, getDirectTravelOptions, isRouteTraversed, resolveFastTravel, resolveTravel } from './travelEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function travelState(currentId = 'baishi_village', discovered: string[] = ['baishi_village', 'qingstone_town']): GameState {
  const base = createInitialGameState({ runSeed: `travel-${currentId}-${discovered.join('-')}` })
  return {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: currentId },
    knowledge: { locations: Object.fromEntries(discovered.map((id) => [id, 'discovered' as const])) },
    flags: { ...base.flags, location_knowledge_initialized: true, adult_entry_resolved: true },
  }
}

function edgeKey(a: string, b: string): string { return [a, b].sort().join('::') }

describe('R10 fixed travel routes', () => {
  it('covers every R08 adjacency exactly once with valid positive route data', () => {
    const locationIds = new Set(WORLD_LOCATIONS.map((location) => location.id))
    const expectedEdges = new Set<string>()
    for (const location of WORLD_LOCATIONS) for (const adjacent of location.adjacentLocationIds) expectedEdges.add(edgeKey(location.id, adjacent))
    const routeEdges = WORLD_ROUTES.map((route) => edgeKey(route.from, route.to))
    expect(new Set(routeEdges).size).toBe(routeEdges.length)
    expect(new Set(routeEdges)).toEqual(expectedEdges)
    expect(new Set(WORLD_ROUTES.map((route) => route.id)).size).toBe(WORLD_ROUTES.length)
    for (const route of WORLD_ROUTES) {
      expect(locationIds.has(route.from)).toBe(true)
      expect(locationIds.has(route.to)).toBe(true)
      expect(Number.isSafeInteger(route.travelDays)).toBe(true)
      expect(route.travelDays).toBeGreaterThan(0)
      expect(typeof route.stableFastTravel).toBe('boolean')
    }
  })

  it('requires a discovered adjacent destination for normal travel', () => {
    const onlyRumor = { ...travelState(), knowledge: { locations: { baishi_village: 'discovered' as const, qingstone_town: 'rumored' as const } } }
    expect(resolveTravel(onlyRumor, 'qingstone_town').reason).toBe('DESTINATION_NOT_DISCOVERED')
    expect(resolveTravel(travelState(), 'qingxia_market').reason).toBe('DESTINATION_NOT_DISCOVERED')
    const nonAdjacent = travelState('baishi_village', ['baishi_village', 'qingxia_market'])
    expect(resolveTravel(nonAdjacent, 'qingxia_market').reason).toBe('DESTINATION_NOT_ADJACENT')
  })

  it('advances worldDay, arrives, and records a traversed route only after success', () => {
    const state = travelState()
    const beforeDay = state.worldDay
    const result = resolveTravel(state, 'qingstone_town')
    expect(result.applied).toBe(true)
    expect(result.arrived).toBe(true)
    expect(result.travelDays).toBe(2)
    expect(result.state.worldDay).toBe(beforeDay + 2)
    expect(result.state.world.currentLocationId).toBe('qingstone_town')
    expect(isRouteTraversed(result.state, 'baishi-qingstone')).toBe(true)
    expect(result.state.knowledge.locations).toEqual(state.knowledge.locations)
  })

  it('does not offer rumored or unknown locations as direct travel targets', () => {
    const state = {
      ...travelState(),
      knowledge: { locations: { baishi_village: 'discovered' as const, qingstone_town: 'rumored' as const } },
    }
    expect(getDirectTravelOptions(state)).toEqual([])
  })

  it('uses only traversed stable routes for multi-segment fast travel', () => {
    const state = {
      ...travelState('baishi_village', ['baishi_village', 'qingstone_town', 'qingxia_market']),
      flags: {
        location_knowledge_initialized: true,
        adult_entry_resolved: true,
        'route_traversed:baishi-qingstone': true,
        'route_traversed:qingstone-qingxia': true,
      },
    }
    const path = findFastTravelPath(state, 'qingxia_market')
    expect(path?.routeIds).toEqual(['baishi-qingstone', 'qingstone-qingxia'])
    expect(path?.travelDays).toBe(4)
    const result = resolveFastTravel(state, 'qingxia_market')
    expect(result.applied).toBe(true)
    expect(result.arrived).toBe(true)
    expect(result.state.worldDay).toBe(state.worldDay + 4)
    expect(result.state.world.currentLocationId).toBe('qingxia_market')
  })

  it('rejects fast travel over untraversed or unstable wilderness routes', () => {
    const untraversed = travelState('baishi_village', ['baishi_village', 'qingstone_town', 'qingxia_market'])
    expect(findFastTravelPath(untraversed, 'qingxia_market')).toBeNull()

    const unstable = {
      ...travelState('blackwind_foothill', ['blackwind_foothill', 'blackwind_mountain']),
      flags: { location_knowledge_initialized: true, adult_entry_resolved: true, 'route_traversed:blackwind-foothill-mountain': true },
    }
    expect(findFastTravelPath(unstable, 'blackwind_mountain')).toBeNull()
    expect(resolveFastTravel(unstable, 'blackwind_mountain').reason).toBe('FAST_TRAVEL_PATH_UNAVAILABLE')
  })

  it('keeps the departure location and does not mark the route when lifespan ends en route', () => {
    const state = travelState()
    const nearDeath = { ...state, worldDay: state.identity.birthDay + 80 * DAYS_PER_YEAR - 1 }
    const result = resolveTravel(nearDeath, 'qingstone_town')
    expect(result.applied).toBe(true)
    expect(result.arrived).toBe(false)
    expect(result.state.status).toBe('dead')
    expect(result.state.world.currentLocationId).toBe('baishi_village')
    expect(isRouteTraversed(result.state, 'baishi-qingstone')).toBe(false)
  })

  it('persists the arrived location and traversed route', () => {
    const state = resolveTravel(travelState(), 'qingstone_town').state
    const persistent: PersistentGame = { schemaVersion: 3, phase: 'life', currentSession: { state, debugLog: [], pendingResult: null, pendingAction: null }, pendingBirthSelection: null, archives: [], meta: { totalRuns: 1 } }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.world.currentLocationId).toBe('qingstone_town')
    expect(loaded?.flags['route_traversed:baishi-qingstone']).toBe(true)
  })

  it('replays a normal travel command after the existing V2 life setup commands', () => {
    const pending = generateBirthCandidates({ runSeed: 'travel-replay', runId: 'run-travel-replay' })
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
    const current = WORLD_LOCATIONS.find((location) => location.id === session.state.world.currentLocationId)!
    const destinationId = current.adjacentLocationIds[0]
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: destinationId, status: 'discovered' } }).session
    const traveled = executeSessionCommand(session, { type: 'travel', destinationId })
    expect(traveled.applied).toBe(true)
    session = traveled.session
    expect(session.state.world.currentLocationId).toBe(destinationId)
    expect(verifySessionReplay(session)).toBe(true)
  })

  it('does not force legacy-adult states into travel', () => {
    const legacy = createInitialGameState({ runSeed: 'legacy-travel' })
    const state = { ...legacy, world: { currentLocationId: 'qingstone_town' }, knowledge: { locations: { qingstone_town: 'discovered' as const, qingxia_market: 'discovered' as const } }, flags: { location_knowledge_initialized: true } }
    expect(resolveTravel(state, 'qingxia_market').applied).toBe(false)
    expect(resolveTravel(state, 'qingxia_market').reason).toBe('TRAVEL_REQUIRES_LOCATION_KNOWLEDGE')
  })
})
