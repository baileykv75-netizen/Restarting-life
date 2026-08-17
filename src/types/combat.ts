export type CombatOpponentId =
  | 'greenback-wolf'
  | 'adult-rock-lizard'
  | 'red-maned-ape'
  | 'ordinary-loose-cultivator'

export type CombatSource = 'field' | 'sunken-vein-core'

export type CombatAction =
  | { type: 'basic' }
  | { type: 'move'; techniqueId: string; moveId: string }
  | { type: 'item'; itemId: string }
  | { type: 'switch-weapon'; itemId: string }
  | { type: 'flee' }

export interface CombatStatusState {
  boundUntilBeat?: number
  slowedUntilBeat?: number
  exposed?: boolean
  waterScreenUntilBeat?: number
  stoneArmorUntilBeat?: number
  protectiveTalismanUntilBeat?: number
  lightnessTalismanUntilBeat?: number
  enraged?: boolean
  retreatingUntilBeat?: number
}

export interface CombatantRuntime {
  currentHP: number
  maxHP: number
  currentQi: number
  maxQi: number
  baseAttack: number
  nextBasicAttackBeat: number
  statuses: CombatStatusState
}

export interface CombatTelegraph {
  id: string
  label: string
  multiplier: number
  movementRequired: boolean
  heavy: boolean
  kind: 'physical' | 'spell' | 'item'
}

export interface CombatState {
  battleId: string
  source: CombatSource
  opponentId: CombatOpponentId
  locationId: string | null
  beat: number
  rngState: number
  player: CombatantRuntime
  opponent: CombatantRuntime
  configuredMoveKeys: string[]
  moveReadyBeat: Record<string, number>
  qiPillsUsed: number
  heartGuardUsed: boolean
  weaponSwitchUsedThisBeat: boolean
  openingShotResolved: boolean
  opponentFireTalismanAvailable: boolean
  telegraph: CombatTelegraph | null
  maxPlayerHitTaken: number
  log: string[]
}
