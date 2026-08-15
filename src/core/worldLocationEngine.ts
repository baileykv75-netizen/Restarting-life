import { getWorldLocationById } from '../data/worldLocations'
import type { GameState } from '../types/game'
import { applyGameAction } from './gameActionReducer'

export interface WorldInitializationResult {
  state: GameState
  applied: boolean
  reason?: string
  locationId?: string
}

export function getAdultStartingLocationSeed(state: GameState): string | null {
  const progressSeed = state.adultEntry?.resolved ? state.adultEntry.startingLocationSeed : null
  if (progressSeed) return progressSeed
  if (!state.adultEntry?.resolved && state.flags.adult_entry_resolved !== true) return null
  const legacySeed = state.flags.adult_starting_location_seed
  return typeof legacySeed === 'string' && legacySeed.trim().length > 0 ? legacySeed : null
}

export function resolveWorldInitialization(state: GameState): WorldInitializationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.lifeStage !== 'adult') return { state, applied: false, reason: 'WORLD_INIT_REQUIRES_ADULT_ENTRY' }
  if (state.world.currentLocationId !== null) return { state, applied: false, reason: 'WORLD_ALREADY_INITIALIZED', locationId: state.world.currentLocationId }

  const startingLocationSeed = getAdultStartingLocationSeed(state)
  if (!startingLocationSeed) return { state, applied: false, reason: 'ADULT_STARTING_LOCATION_MISSING' }
  if (!getWorldLocationById(startingLocationSeed)) {
    return { state, applied: false, reason: `INVALID_STARTING_LOCATION:${startingLocationSeed}` }
  }

  const result = applyGameAction(state, { type: 'SET_CURRENT_LOCATION', locationId: startingLocationSeed })
  if (!result.applied) return { state: result.state, applied: false, reason: result.reason }
  return { state: result.state, applied: true, locationId: startingLocationSeed }
}
