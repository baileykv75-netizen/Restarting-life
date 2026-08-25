import { getWorldLocationById } from '../data/worldLocations'
import type { GameState } from '../types/game'
import { advanceWorldTime } from './worldEngine'

export type RumorExploreResult = {
  state: GameState
  success: boolean
  elapsedDays: number
  message: string
}

/**
 * UX-02D exploration boundary.
 * Rumors are information, not automatic discoveries.
 * Only an explicit player action can upgrade rumored -> discovered.
 */
export function exploreRumor(
  state: GameState,
  locationId: string,
): RumorExploreResult {
  const location = getWorldLocationById(locationId)

  if (!location) {
    return { state, success: false, elapsedDays: 0, message: '未知地点。' }
  }

  if (state.knowledge.locations[locationId] !== 'rumored') {
    return { state, success: false, elapsedDays: 0, message: '此处没有可探查的传闻。' }
  }

  const advanced = advanceWorldTime(state, 3)

  return {
    state: {
      ...advanced.state,
      knowledge: {
        locations: {
          ...advanced.state.knowledge.locations,
          [locationId]: 'discovered',
        },
      },
    },
    success: true,
    elapsedDays: advanced.elapsedDays,
    message: '你循着传闻寻找，确认了这处地点。',
  }
}
