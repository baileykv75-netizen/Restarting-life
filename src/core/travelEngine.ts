import { WORLD_ROUTES, getWorldRouteBetween, getWorldRouteById } from '../data/worldRoutes'
import { WORLD_LOCATIONS, getWorldLocationById } from '../data/worldLocations'
import type { GameState } from '../types/game'
import type { WorldLocationDefinition, WorldRouteDefinition } from '../types/world'
import { applyGameAction } from './gameActionReducer'
import { getLocationKnowledgeStatus } from './locationKnowledgeEngine'

const TRAVERSED_ROUTE_PREFIX = 'route_traversed:'

export interface TravelOption {
  destination: WorldLocationDefinition
  route: WorldRouteDefinition
  travelDays: number
}

export interface FastTravelOption {
  destination: WorldLocationDefinition
  routeIds: string[]
  travelDays: number
}

export interface TravelResult {
  state: GameState
  applied: boolean
  arrived: boolean
  travelDays: number
  reason?: string
  destinationId?: string
  routeIds: string[]
}

function traversedFlag(routeId: string): string {
  return `${TRAVERSED_ROUTE_PREFIX}${routeId}`
}

export function isRouteTraversed(state: GameState, routeId: string): boolean {
  return state.flags[traversedFlag(routeId)] === true
}

function travelReady(state: GameState): string | null {
  if (state.status !== 'playing') return 'GAME_ENDED'
  if (state.lifeStage !== 'adult' || state.flags.location_knowledge_initialized !== true) return 'TRAVEL_REQUIRES_LOCATION_KNOWLEDGE'
  const currentId = state.world.currentLocationId
  if (!currentId || !getWorldLocationById(currentId)) return 'INVALID_CURRENT_LOCATION'
  if (getLocationKnowledgeStatus(state, currentId) !== 'discovered') return 'CURRENT_LOCATION_NOT_DISCOVERED'
  return null
}

export function getDirectTravelOptions(state: GameState): TravelOption[] {
  if (travelReady(state)) return []
  const current = getWorldLocationById(state.world.currentLocationId!)!
  return current.adjacentLocationIds.flatMap((destinationId) => {
    if (getLocationKnowledgeStatus(state, destinationId) !== 'discovered') return []
    const destination = getWorldLocationById(destinationId)
    const route = getWorldRouteBetween(current.id, destinationId)
    return destination && route ? [{ destination, route, travelDays: route.travelDays }] : []
  })
}

function markRouteTraversed(state: GameState, routeId: string): GameState {
  if (isRouteTraversed(state, routeId)) return state
  const result = applyGameAction(state, { type: 'SET_FLAG', key: traversedFlag(routeId), value: true })
  return result.applied ? result.state : state
}

export function resolveTravel(state: GameState, destinationId: string): TravelResult {
  const readiness = travelReady(state)
  if (readiness) return { state, applied: false, arrived: false, travelDays: 0, reason: readiness, routeIds: [] }
  const currentId = state.world.currentLocationId!
  if (!getWorldLocationById(destinationId)) return { state, applied: false, arrived: false, travelDays: 0, reason: 'INVALID_DESTINATION', routeIds: [] }
  if (getLocationKnowledgeStatus(state, destinationId) !== 'discovered') return { state, applied: false, arrived: false, travelDays: 0, reason: 'DESTINATION_NOT_DISCOVERED', routeIds: [] }
  const current = getWorldLocationById(currentId)!
  if (!current.adjacentLocationIds.includes(destinationId)) return { state, applied: false, arrived: false, travelDays: 0, reason: 'DESTINATION_NOT_ADJACENT', routeIds: [] }
  const route = getWorldRouteBetween(currentId, destinationId)
  if (!route) return { state, applied: false, arrived: false, travelDays: 0, reason: 'ROUTE_MISSING', routeIds: [] }

  const advanced = applyGameAction(state, { type: 'ADVANCE_TIME', days: route.travelDays })
  if (!advanced.applied) return { state, applied: false, arrived: false, travelDays: 0, reason: advanced.reason, routeIds: [] }
  if (advanced.state.status !== 'playing') {
    return { state: advanced.state, applied: true, arrived: false, travelDays: route.travelDays, destinationId, routeIds: [route.id] }
  }

  const located = applyGameAction(advanced.state, { type: 'SET_CURRENT_LOCATION', locationId: destinationId })
  if (!located.applied) return { state, applied: false, arrived: false, travelDays: 0, reason: located.reason, routeIds: [] }
  const completed = markRouteTraversed(located.state, route.id)
  return { state: completed, applied: true, arrived: true, travelDays: route.travelDays, destinationId, routeIds: [route.id] }
}

interface PathCandidate {
  locationId: string
  travelDays: number
  routeIds: string[]
}

export function findFastTravelPath(state: GameState, destinationId: string): FastTravelOption | null {
  if (travelReady(state)) return null
  const startId = state.world.currentLocationId!
  if (destinationId === startId || getLocationKnowledgeStatus(state, destinationId) !== 'discovered') return null
  const destination = getWorldLocationById(destinationId)
  if (!destination) return null

  const distances = new Map<string, number>([[startId, 0]])
  const routePaths = new Map<string, string[]>([[startId, []]])
  const queue: PathCandidate[] = [{ locationId: startId, travelDays: 0, routeIds: [] }]

  while (queue.length > 0) {
    queue.sort((a, b) => a.travelDays - b.travelDays)
    const current = queue.shift()!
    if (current.travelDays !== distances.get(current.locationId)) continue
    if (current.locationId === destinationId) {
      return { destination, routeIds: current.routeIds, travelDays: current.travelDays }
    }

    for (const route of WORLD_ROUTES) {
      if (!route.stableFastTravel || !isRouteTraversed(state, route.id)) continue
      const nextId = route.from === current.locationId ? route.to : route.to === current.locationId ? route.from : null
      if (!nextId || getLocationKnowledgeStatus(state, nextId) !== 'discovered') continue
      const nextDays = current.travelDays + route.travelDays
      if (nextDays >= (distances.get(nextId) ?? Number.POSITIVE_INFINITY)) continue
      const nextPath = [...current.routeIds, route.id]
      distances.set(nextId, nextDays)
      routePaths.set(nextId, nextPath)
      queue.push({ locationId: nextId, travelDays: nextDays, routeIds: nextPath })
    }
  }
  return null
}

export function getFastTravelOptions(state: GameState): FastTravelOption[] {
  if (travelReady(state)) return []
  return WORLD_LOCATIONS.flatMap((location) => {
    if (location.id === state.world.currentLocationId || getLocationKnowledgeStatus(state, location.id) !== 'discovered') return []
    const path = findFastTravelPath(state, location.id)
    return path ? [path] : []
  }).sort((a, b) => a.travelDays - b.travelDays || a.destination.name.localeCompare(b.destination.name, 'zh-CN'))
}

export function resolveFastTravel(state: GameState, destinationId: string): TravelResult {
  const readiness = travelReady(state)
  if (readiness) return { state, applied: false, arrived: false, travelDays: 0, reason: readiness, routeIds: [] }
  const path = findFastTravelPath(state, destinationId)
  if (!path) return { state, applied: false, arrived: false, travelDays: 0, reason: 'FAST_TRAVEL_PATH_UNAVAILABLE', routeIds: [] }

  const advanced = applyGameAction(state, { type: 'ADVANCE_TIME', days: path.travelDays })
  if (!advanced.applied) return { state, applied: false, arrived: false, travelDays: 0, reason: advanced.reason, routeIds: [] }
  if (advanced.state.status !== 'playing') {
    return { state: advanced.state, applied: true, arrived: false, travelDays: path.travelDays, destinationId, routeIds: path.routeIds }
  }

  const located = applyGameAction(advanced.state, { type: 'SET_CURRENT_LOCATION', locationId: destinationId })
  if (!located.applied) return { state, applied: false, arrived: false, travelDays: 0, reason: located.reason, routeIds: [] }
  return { state: located.state, applied: true, arrived: true, travelDays: path.travelDays, destinationId, routeIds: path.routeIds }
}

export function getTraversedRoutes(state: GameState): WorldRouteDefinition[] {
  return WORLD_ROUTES.filter((route) => isRouteTraversed(state, route.id) && getWorldRouteById(route.id))
}
