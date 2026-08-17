import type { Realm } from '../types/game'
import type { CombatOpponentId, CombatTelegraph } from '../types/combat'

export interface CombatStatBlock {
  maxHP: number
  maxQi: number
  baseAttack: number
}

export interface WeaponCombatDefinition {
  basicMultiplier: number
  basicInterval: number
  armorPenetration: number
  fireActiveDamageMultiplier?: number
  rangedOpeningMultiplier?: number
  engagedBasicMultiplier?: number
}

export interface ArmorCombatDefinition {
  armorReduction: number
  fleeModifier: number
}

export interface CombatMoveDefinition {
  techniqueId: string
  moveId: string
  name: string
  qiCost: number
  multiplier?: number
  armorPenetration?: number
  cooldown: number
  kind: 'weapon' | 'spell' | 'control' | 'guard'
  element?: 'fire'
}

export interface CombatOpponentDefinition {
  id: CombatOpponentId
  name: string
  realm: Realm
  stage: number
  maxHP: number
  maxQi: number
  baseAttack: number
  armorReduction: number
  basicInterval: number
  basicLabel: string
  basicMultiplier: number
  beast: boolean
  fleeHook: number
  special?: CombatTelegraph
  lowHealthBehavior?: 'flee' | 'enrage'
  lowHealthRatio?: number
  weaponItemId?: string
}

export const PLAYER_COMBAT_STATS: Readonly<Record<string, CombatStatBlock>> = {
  'qi:1': { maxHP: 100, maxQi: 60, baseAttack: 10 },
  'qi:2': { maxHP: 110, maxQi: 70, baseAttack: 12 },
  'qi:3': { maxHP: 120, maxQi: 80, baseAttack: 14 },
  'qi:4': { maxHP: 130, maxQi: 90, baseAttack: 16 },
  'qi:5': { maxHP: 140, maxQi: 100, baseAttack: 18 },
  'qi:6': { maxHP: 150, maxQi: 110, baseAttack: 20 },
  'qi:7': { maxHP: 160, maxQi: 120, baseAttack: 22 },
  'qi:8': { maxHP: 170, maxQi: 130, baseAttack: 24 },
  'qi:9': { maxHP: 180, maxQi: 140, baseAttack: 26 },
  'foundation:1': { maxHP: 230, maxQi: 180, baseAttack: 38 },
  'foundation:2': { maxHP: 280, maxQi: 220, baseAttack: 48 },
  'foundation:3': { maxHP: 340, maxQi: 270, baseAttack: 60 },
  'foundation:4': { maxHP: 410, maxQi: 330, baseAttack: 74 },
  'golden_core:1': { maxHP: 650, maxQi: 500, baseAttack: 110 },
}

export function getPlayerCombatStats(realm: Realm, stage: number): CombatStatBlock {
  if (realm === 'mortal') return { maxHP: 100, maxQi: 0, baseAttack: 10 }
  const key = realm === 'golden_core' ? 'golden_core:1' : `${realm}:${stage}`
  return PLAYER_COMBAT_STATS[key] ?? PLAYER_COMBAT_STATS['qi:1']
}

export const WEAPON_COMBAT: Readonly<Record<string, WeaponCombatDefinition>> = {
  qingfeng_sword: { basicMultiplier: 1, basicInterval: 1, armorPenetration: 0 },
  black_iron_greatsword: { basicMultiplier: 1.55, basicInterval: 2, armorPenetration: 0.12 },
  red_pattern_blade: { basicMultiplier: 1.05, basicInterval: 1, armorPenetration: 0, fireActiveDamageMultiplier: 1.12 },
  green_bamboo_spirit_bow: { basicMultiplier: 0.65, basicInterval: 1, armorPenetration: 0, rangedOpeningMultiplier: 1.15, engagedBasicMultiplier: 0.65 },
}

export const ARMOR_COMBAT: Readonly<Record<string, ArmorCombatDefinition>> = {
  black_iron_armor: { armorReduction: 0.2, fleeModifier: -12 },
  green_wolf_soft_armor: { armorReduction: 0.12, fleeModifier: 0 },
}

export const COMBAT_MOVES: readonly CombatMoveDefinition[] = [
  { techniqueId: 'qingfeng_jianjue', moveId: 'thrust', name: '刺', qiCost: 8, multiplier: 1.2, armorPenetration: 0.05, cooldown: 0, kind: 'weapon' },
  { techniqueId: 'qingfeng_jianjue', moveId: 'slash', name: '斩', qiCost: 14, multiplier: 1.55, cooldown: 1, kind: 'weapon' },
  { techniqueId: 'qingfeng_jianjue', moveId: 'sword_chase', name: '御剑追击', qiCost: 18, multiplier: 1.35, cooldown: 2, kind: 'weapon' },
  { techniqueId: 'chiyan_shu', moveId: 'firebolt', name: '火弹', qiCost: 12, multiplier: 1.35, cooldown: 0, kind: 'spell', element: 'fire' },
  { techniqueId: 'chiyan_shu', moveId: 'flame_burst', name: '炎爆', qiCost: 24, multiplier: 1.85, cooldown: 2, kind: 'spell', element: 'fire' },
  { techniqueId: 'futeng_shu', moveId: 'bind', name: '缠束', qiCost: 14, cooldown: 2, kind: 'control' },
  { techniqueId: 'futeng_shu', moveId: 'thorn', name: '荆刺', qiCost: 16, multiplier: 1.25, cooldown: 1, kind: 'spell' },
  { techniqueId: 'shuimu_shu', moveId: 'water_screen', name: '水幕', qiCost: 18, cooldown: 2, kind: 'guard' },
  { techniqueId: 'shijia_shu', moveId: 'stone_armor', name: '石甲护体', qiCost: 20, cooldown: 3, kind: 'guard' },
  { techniqueId: 'jinmang_jue', moveId: 'golden_ray', name: '金芒', qiCost: 16, multiplier: 1.45, armorPenetration: 0.18, cooldown: 1, kind: 'spell' },
]

export function getCombatMove(techniqueId: string, moveId: string): CombatMoveDefinition | undefined {
  return COMBAT_MOVES.find((move) => move.techniqueId === techniqueId && move.moveId === moveId)
}

export const COMBAT_OPPONENTS: Readonly<Record<CombatOpponentId, CombatOpponentDefinition>> = {
  'greenback-wolf': {
    id: 'greenback-wolf', name: '青背狼', realm: 'qi', stage: 2, maxHP: 105, maxQi: 0, baseAttack: 12,
    armorReduction: 0, basicInterval: 1, basicLabel: '撕咬', basicMultiplier: 1, beast: true, fleeHook: -8,
    special: { id: 'pounce', label: '扑击', multiplier: 1.6, movementRequired: true, heavy: false, kind: 'physical' },
    lowHealthBehavior: 'flee', lowHealthRatio: 0.25,
  },
  'adult-rock-lizard': {
    id: 'adult-rock-lizard', name: '成年岩甲蜥', realm: 'qi', stage: 4, maxHP: 155, maxQi: 0, baseAttack: 16,
    armorReduction: 0.22, basicInterval: 1, basicLabel: '咬击', basicMultiplier: 1, beast: true, fleeHook: 5,
    special: { id: 'tail-sweep', label: '扫尾', multiplier: 1.7, movementRequired: false, heavy: false, kind: 'physical' },
  },
  'red-maned-ape': {
    id: 'red-maned-ape', name: '赤鬃山猿', realm: 'qi', stage: 8, maxHP: 210, maxQi: 0, baseAttack: 26,
    armorReduction: 0.08, basicInterval: 1, basicLabel: '重拳', basicMultiplier: 1, beast: true, fleeHook: -5,
    special: { id: 'charged-smash', label: '蓄力砸击', multiplier: 2, movementRequired: true, heavy: true, kind: 'physical' },
    lowHealthBehavior: 'enrage', lowHealthRatio: 0.3,
  },
  'ordinary-loose-cultivator': {
    id: 'ordinary-loose-cultivator', name: '普通散修', realm: 'qi', stage: 5, maxHP: 140, maxQi: 100, baseAttack: 18,
    armorReduction: 0.12, basicInterval: 1, basicLabel: '青锋剑', basicMultiplier: 1, beast: false, fleeHook: 0,
    weaponItemId: 'qingfeng_sword', lowHealthBehavior: 'flee', lowHealthRatio: 0.3,
  },
}
