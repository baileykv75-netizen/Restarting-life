import type { BeastCombatContextTag, BeastEncounterVariant } from './beast'
import type { PoisonFamily } from './poison'

export type CombatOpponentId =
  | 'greenback-wolf'
  | 'redtail-fox'
  | 'ironhide-boar'
  | 'bishui-snake'
  | 'adult-rock-lizard'
  | 'red-maned-ape'
  | 'cold-pool-scale-python'
  | 'one-horned-azure-wolf'
  | 'ordinary-loose-cultivator'

export type CombatSource = 'field' | 'sunken-vein-core'

export type CombatAction =
  | { type: 'basic' }
  | { type: 'move'; techniqueId: string; moveId: string }
  | { type: 'item'; itemId: string }
  | { type: 'switch-weapon'; itemId: string }
  | { type: 'flee' }

export type CombatSpecialEffect =
  | 'expose-self'
  | 'bishui-poison-exposure'
  | 'bind-player'
  | 'slow-player'
  | 'guard-self'
  | 'damage-boost'
  | 'escape'

export interface CombatStatusState {
  boundUntilBeat?: number
  slowedUntilBeat?: number
  exposed?: boolean
  waterScreenUntilBeat?: number
  stoneArmorUntilBeat?: number
  protectiveTalismanUntilBeat?: number
  lightnessTalismanUntilBeat?: number
  guardedUntilBeat?: number
  damageBoostUntilBeat?: number
  enraged?: boolean
  retreatingUntilBeat?: number
  lowHealthResolved?: boolean
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
  effect?: CombatSpecialEffect
  cooldown?: number
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
  /** R22 optional fields keep old active R20 saves legal. */
  contextTags?: BeastCombatContextTag[]
  encounterVariant?: BeastEncounterVariant
  beastInstanceId?: string
  opponentSpecialReadyBeat?: Record<string, number>
  pendingPoisonExposures?: Partial<Record<PoisonFamily, number>>
}
