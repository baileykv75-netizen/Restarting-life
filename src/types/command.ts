import type { ExplorationDuration } from './exploration'
import type { GameAction } from './gameAction'
import type { SecretRealmAction } from './secretRealm'

export type PlayerAction = 'cultivate' | 'explore' | 'livelihood' | 'breakthrough'

export type SessionCommand =
  | { type: 'action'; action: PlayerAction }
  | { type: 'choice'; choiceId: string }
  | { type: 'childhood-choice'; choiceId: string }
  | { type: 'adult-entry-choice'; optionId: string }
  | { type: 'initialize-world' }
  | { type: 'initialize-location-knowledge' }
  | { type: 'initialize-secret-realm' }
  | { type: 'secret-realm'; action: SecretRealmAction }
  | { type: 'initialize-inventory' }
  | { type: 'inventory-drop'; itemId: string; quantity: number }
  | { type: 'travel'; destinationId: string }
  | { type: 'fast-travel'; destinationId: string }
  | { type: 'explore-region'; days: ExplorationDuration }
  | { type: 'continue' }
  | { type: 'game-action'; action: GameAction }
