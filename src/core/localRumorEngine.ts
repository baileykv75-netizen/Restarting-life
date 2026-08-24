import { getWorldLocationById } from '../data/worldLocations'
import type { GameState } from '../types/game'
import type { WorldLocationDefinition, WorldLocationType } from '../types/world'
import { advanceWorldTime } from './worldEngine'

const RUMOR_HUB_TYPES: ReadonlySet<WorldLocationType> = new Set([
  'mortal-settlement',
  'cultivation-market',
  'clan-estate',
  'sect',
])

export interface LocalRumorResult {
  state: GameState
  applied: boolean
  elapsedDays: number
  rumorLocationId?: string
  reason?: string
}

function knowledgeStatus(state: GameState, locationId: string): 'unknown' | 'rumored' | 'discovered' {
  return state.knowledge.locations[locationId] ?? 'unknown'
}

export function isLocalRumorHub(location: WorldLocationDefinition): boolean {
  return RUMOR_HUB_TYPES.has(location.type)
}

export function getLocalRumorCandidates(state: GameState): WorldLocationDefinition[] {
  if (state.status !== 'playing' || state.lifeStage !== 'adult') return []
  if (state.flags.location_knowledge_initialized !== true) return []
  const currentId = state.world.currentLocationId
  const current = currentId ? getWorldLocationById(currentId) : undefined
  if (!current || !isLocalRumorHub(current)) return []
  if (knowledgeStatus(state, current.id) !== 'discovered') return []

  return current.adjacentLocationIds.flatMap((locationId) => {
    if (knowledgeStatus(state, locationId) !== 'unknown') return []
    const location = getWorldLocationById(locationId)
    return location ? [location] : []
  })
}

export function resolveGatherLocalRumor(state: GameState): LocalRumorResult {
  if (state.status !== 'playing') return { state, applied: false, elapsedDays: 0, reason: 'GAME_ENDED' }
  if (state.lifeStage !== 'adult') return { state, applied: false, elapsedDays: 0, reason: 'LOCAL_RUMOR_REQUIRES_ADULT' }
  if (state.flags.location_knowledge_initialized !== true) return { state, applied: false, elapsedDays: 0, reason: 'LOCAL_RUMOR_REQUIRES_LOCATION_KNOWLEDGE' }

  const currentId = state.world.currentLocationId
  const current = currentId ? getWorldLocationById(currentId) : undefined
  if (!current) return { state, applied: false, elapsedDays: 0, reason: 'INVALID_CURRENT_LOCATION' }
  if (!isLocalRumorHub(current)) return { state, applied: false, elapsedDays: 0, reason: 'LOCAL_RUMOR_REQUIRES_SETTLEMENT' }
  if (knowledgeStatus(state, current.id) !== 'discovered') return { state, applied: false, elapsedDays: 0, reason: 'CURRENT_LOCATION_NOT_DISCOVERED' }

  const candidate = getLocalRumorCandidates(state)[0]
  if (!candidate) return { state, applied: false, elapsedDays: 0, reason: 'NO_NEW_LOCAL_RUMORS' }

  const advanced = advanceWorldTime(state, 1)
  if (advanced.state.status !== 'playing') {
    return { state: advanced.state, applied: true, elapsedDays: advanced.elapsedDays }
  }

  return {
    state: {
      ...advanced.state,
      knowledge: {
        locations: {
          ...advanced.state.knowledge.locations,
          [candidate.id]: 'rumored',
        },
      },
    },
    applied: true,
    elapsedDays: advanced.elapsedDays,
    rumorLocationId: candidate.id,
  }
}
