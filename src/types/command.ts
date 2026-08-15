import type { GameAction } from './gameAction'

export type PlayerAction = 'cultivate' | 'explore' | 'livelihood' | 'breakthrough'

export type SessionCommand =
  | { type: 'action'; action: PlayerAction }
  | { type: 'choice'; choiceId: string }
  | { type: 'childhood-choice'; choiceId: string }
  | { type: 'adult-entry-choice'; optionId: string }
  | { type: 'continue' }
  | { type: 'game-action'; action: GameAction }
