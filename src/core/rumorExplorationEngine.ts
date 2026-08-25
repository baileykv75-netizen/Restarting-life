import { getWorldLocationById } from '../data/worldLocations'
import type { GameState } from '../types/game'
import { advanceWorldTime } from './worldEngine'

export type RumorExploreResult = {
  state: GameState
  success: boolean
  elapsedDays: number
  title: string
  description: string
  logType: 'DISCOVER_LOCATION' | 'FAILED_RUMOR'
}

/**
 * UX-02D exploration boundary.
 * Rumors are information, not automatic discoveries.
 * Only an explicit player action can upgrade rumored -> discovered.
 *
 * The result is structured because later systems (chronicle, replay,
 * lifetime summary) should consume events instead of parsing text.
 */
export function exploreRumor(
  state: GameState,
  locationId: string,
): RumorExploreResult {
  const location = getWorldLocationById(locationId)

  if (!location) {
    return {
      state,
      success: false,
      elapsedDays: 0,
      title: '探查失败',
      description: '你试图寻找的地方并不存在于已知世界中。',
      logType: 'FAILED_RUMOR',
    }
  }

  if (state.knowledge.locations[locationId] !== 'rumored') {
    return {
      state,
      success: false,
      elapsedDays: 0,
      title: '没有可追寻的传闻',
      description: '这里没有尚未确认的线索。',
      logType: 'FAILED_RUMOR',
    }
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
    title: '发现新的地点',
    description: '你循着传闻寻找，确认了这处地点。',
    logType: 'DISCOVER_LOCATION',
  }
}
