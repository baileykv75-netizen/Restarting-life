export type PlayerAction = 'cultivate' | 'explore' | 'livelihood' | 'breakthrough'

export type SessionCommand =
  | { type: 'action'; action: PlayerAction }
  | { type: 'choice'; choiceId: string }
  | { type: 'continue' }
