import type { BeastCombatContextTag, BeastEncounterVariant } from './beast'
import type { CombatAction, CombatOpponentId, CombatSource } from './combat'
import type { GameState, LifeStage, LocationKnowledgeStatus } from './game'

export type GameFlagValue = GameState['flags'][string]

/**
 * V2 state mutations. These are deliberately separate from the legacy
 * PlayerAction choices (cultivate/explore/livelihood/breakthrough).
 *
 * React views must not apply these directly and then save on their own.
 * Player-facing V2 flows dispatch them through SessionCommand so debug logs,
 * replay and persistence remain on the same authoritative path.
 */
export type GameAction =
  | { type: 'ADVANCE_TIME'; days: number }
  | { type: 'SET_FLAG'; key: string; value: GameFlagValue }
  | { type: 'REMOVE_FLAG'; key: string }
  | { type: 'SET_LIFE_STAGE'; stage: LifeStage }
  | { type: 'SET_CURRENT_LOCATION'; locationId: string | null }
  | { type: 'INITIALIZE_SUBLOCATIONS' }
  | {
      type: 'START_COMBAT'
      opponentId: CombatOpponentId
      source: CombatSource
      contextTags?: BeastCombatContextTag[]
      encounterVariant?: BeastEncounterVariant
    }
  | { type: 'COMBAT_ACTION'; action: CombatAction }
  | { type: 'CLAIM_BEAST_LOOT'; itemId: string; quantity: number }
  | { type: 'ABANDON_BEAST_LOOT' }
  | {
      type: 'SET_LOCATION_KNOWLEDGE'
      locationId: string
      status: LocationKnowledgeStatus
    }
