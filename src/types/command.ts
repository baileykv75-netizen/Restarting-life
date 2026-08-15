import type { EquipmentSlot } from './equipment'
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
  | { type: 'initialize-equipment' }
  | { type: 'equip-item'; itemId: string }
  | { type: 'unequip-slot'; slot: EquipmentSlot }
  | { type: 'initialize-cultivation' }
  | { type: 'initialize-technique-system' }
  | { type: 'select-main-technique'; techniqueId: string }
  | { type: 'change-main-technique'; techniqueId: string }
  | { type: 'set-auxiliary-technique'; techniqueId: string; enabled: boolean }
  | { type: 'practice-technique-days'; techniqueId: string; days: 1 | 3 | 10 | 30 }
  | { type: 'cultivate-days'; days: 1 | 3 | 10 | 30 }
  | { type: 'travel'; destinationId: string }
  | { type: 'fast-travel'; destinationId: string }
  | { type: 'explore-region'; days: ExplorationDuration }
  | { type: 'continue' }
  | { type: 'game-action'; action: GameAction }
