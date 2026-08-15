import { WORLD_LOCATIONS, getWorldLocationById } from '../data/worldLocations'
import type { GameState, LocationKnowledgeStatus } from '../types/game'
import type { WorldLocationDefinition } from '../types/world'
import { applyGameAction } from './gameActionReducer'

export type LocationKnowledgeViewStatus = 'unknown' | LocationKnowledgeStatus

export interface LocationKnowledgeResult {
  state: GameState
  applied: boolean
  reason?: string
}

export interface VisibleWorldLocation {
  location: WorldLocationDefinition
  status: LocationKnowledgeStatus
}

const INITIALIZED_FLAG = 'location_knowledge_initialized'
const LOCATION_SEED_PATTERN = /^location_seed:(known|rumored):(.+)$/

export function getLocationKnowledgeStatus(state: GameState, locationId: string): LocationKnowledgeViewStatus {
  return state.knowledge.locations[locationId] ?? 'unknown'
}

function desiredStatusFromSeed(seedStatus: 'known' | 'rumored'): LocationKnowledgeStatus {
  return seedStatus === 'known' ? 'discovered' : 'rumored'
}

function shouldUpgrade(current: LocationKnowledgeViewStatus, desired: LocationKnowledgeStatus): boolean {
  if (current === 'unknown') return true
  return current === 'rumored' && desired === 'discovered'
}

export function setLocationKnowledge(
  state: GameState,
  locationId: string,
  status: LocationKnowledgeStatus,
): LocationKnowledgeResult {
  if (!getWorldLocationById(locationId)) return { state, applied: false, reason: `INVALID_LOCATION_KNOWLEDGE_ID:${locationId}` }
  const result = applyGameAction(state, { type: 'SET_LOCATION_KNOWLEDGE', locationId, status })
  return { state: result.state, applied: result.applied, reason: result.reason }
}

export function learnLocationRumor(state: GameState, locationId: string): LocationKnowledgeResult {
  return setLocationKnowledge(state, locationId, 'rumored')
}

export function discoverLocation(state: GameState, locationId: string): LocationKnowledgeResult {
  return setLocationKnowledge(state, locationId, 'discovered')
}

function collectInitialKnowledge(state: GameState): Map<string, LocationKnowledgeStatus> | string {
  const desired = new Map<string, LocationKnowledgeStatus>()
  for (const tag of state.tags) {
    const match = LOCATION_SEED_PATTERN.exec(tag)
    if (!match) continue
    const locationId = match[2]
    if (!getWorldLocationById(locationId)) return `INVALID_LOCATION_SEED:${locationId}`
    const status = desiredStatusFromSeed(match[1] as 'known' | 'rumored')
    const existing = desired.get(locationId)
    if (!existing || (existing === 'rumored' && status === 'discovered')) desired.set(locationId, status)
  }

  const currentLocationId = state.world.currentLocationId
  if (!currentLocationId) return 'CURRENT_LOCATION_MISSING'
  if (!getWorldLocationById(currentLocationId)) return `INVALID_CURRENT_LOCATION:${currentLocationId}`
  desired.set(currentLocationId, 'discovered')
  return desired
}

export function resolveLocationKnowledgeInitialization(state: GameState): LocationKnowledgeResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.lifeStage !== 'adult') return { state, applied: false, reason: 'LOCATION_KNOWLEDGE_REQUIRES_ADULT' }
  if (state.flags[INITIALIZED_FLAG] === true) return { state, applied: false, reason: 'LOCATION_KNOWLEDGE_ALREADY_INITIALIZED' }
  if (!state.adultEntry?.resolved && state.flags.adult_entry_resolved !== true) {
    return { state, applied: false, reason: 'LOCATION_KNOWLEDGE_REQUIRES_V2_ADULT_ENTRY' }
  }

  const collected = collectInitialKnowledge(state)
  if (typeof collected === 'string') return { state, applied: false, reason: collected }

  let next = state
  for (const [locationId, desired] of collected) {
    const current = getLocationKnowledgeStatus(next, locationId)
    if (!shouldUpgrade(current, desired)) continue
    const result = setLocationKnowledge(next, locationId, desired)
    if (!result.applied) return { state, applied: false, reason: result.reason }
    next = result.state
  }

  const flagResult = applyGameAction(next, { type: 'SET_FLAG', key: INITIALIZED_FLAG, value: true })
  if (!flagResult.applied) return { state, applied: false, reason: flagResult.reason }
  return { state: flagResult.state, applied: true }
}

export function getVisibleWorldLocations(state: GameState): VisibleWorldLocation[] {
  return WORLD_LOCATIONS.flatMap((location) => {
    const status = getLocationKnowledgeStatus(state, location.id)
    return status === 'unknown' ? [] : [{ location, status }]
  })
}

export function getVisibleWorldConnections(state: GameState): Array<{ key: string; from: WorldLocationDefinition; to: WorldLocationDefinition }> {
  const visibleIds = new Set(getVisibleWorldLocations(state).map(({ location }) => location.id))
  const drawn = new Set<string>()
  return WORLD_LOCATIONS.flatMap((location) => location.adjacentLocationIds.flatMap((adjacentId) => {
    if (!visibleIds.has(location.id) || !visibleIds.has(adjacentId)) return []
    const key = [location.id, adjacentId].sort().join('::')
    if (drawn.has(key)) return []
    const target = getWorldLocationById(adjacentId)
    if (!target) return []
    drawn.add(key)
    return [{ key, from: location, to: target }]
  }))
}
