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

function appendRumorChronicle(state: GameState, locationId: string): GameState {
  return {
    ...state,
    chronicle: [
      ...state.chronicle,
      {
        id: `rumor-explore-${state.worldDay}-${locationId}`,
        startDay: Math.max(0, state.worldDay - 3),
        endDay: state.worldDay,
        title: '发现新的地点',
        sceneText: '你循着传闻寻找，终于确认了隐藏在迷雾中的地点。',
        narrative: '你循着传闻寻找，确认了这处地点。',
        consequence: '地图知识已更新。',
        changes: [
          {
            label: '地点认知',
            value: `${locationId}: rumored → discovered`,
            tone: 'positive',
          },
        ],
        locationId,
        importance: 'notable',
        sourceType: 'world',
        sourceId: 'EXPLORE_RUMOR',
      },
    ],
  }
}

export function exploreRumor(
  state: GameState,
  locationId: string,
): RumorExploreResult {
  const location = getWorldLocationById(locationId)

  if (!location) {
    return { state, success: false, elapsedDays: 0, title: '探查失败', description: '你试图寻找的地方并不存在于已知世界中。', logType: 'FAILED_RUMOR' }
  }

  if (state.knowledge.locations[locationId] !== 'rumored') {
    return { state, success: false, elapsedDays: 0, title: '没有可追寻的传闻', description: '这里没有尚未确认的线索。', logType: 'FAILED_RUMOR' }
  }

  const advanced = advanceWorldTime(state, 3)

  const stateAfterDiscovery = {
    ...advanced.state,
    knowledge: {
      locations: {
        ...advanced.state.knowledge.locations,
        [locationId]: 'discovered',
      },
    },
  }

  return {
    state: appendRumorChronicle(stateAfterDiscovery, locationId),
    success: true,
    elapsedDays: advanced.elapsedDays,
    title: '发现新的地点',
    description: '你循着传闻寻找，确认了这处地点。',
    logType: 'DISCOVER_LOCATION',
  }
}
