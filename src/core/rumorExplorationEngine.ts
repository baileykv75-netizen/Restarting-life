import type { GameState, LocationKnowledgeStatus } from '../types/game'

export type RumorExploreResult = {
  state: GameState
  success: boolean
  elapsedDays: number
  message: string
}

/**
 * UX-02D exploration boundary.
 * Rumors are information, not automatic discoveries.
 * The resolver only changes knowledge after an explicit player action.
 */
export function exploreRumor(
  state: GameState,
  locationId: string,
  rng: number = state.rngState,
): RumorExploreResult {
  const current = state.knowledge.locations[locationId]

  if (current !== 'rumored') {
    return {
      state,
      success: false,
      elapsedDays: 0,
      message: '此处没有可探查的传闻。',
    }
  }

  const success = Math.abs(rng) % 10 < 7
  const nextStatus: LocationKnowledgeStatus = success
    ? 'discovered'
    : 'rumor_failed'

  return {
    state: {
      ...state,
      worldDay: state.worldDay + 3,
      knowledge: {
        ...state.knowledge,
        locations: {
          ...state.knowledge.locations,
          [locationId]: nextStatus,
        },
      },
    },
    success,
    elapsedDays: 3,
    message: success
      ? '你循着传闻寻找，确认了这处地点。'
      : '你寻找数日，没有发现传闻中的踪迹。',
  }
}
