import type { Realm } from '../types/game'

export const BASE_LIFESPAN_YEARS: Readonly<Record<Realm, number>> = {
  mortal: 80,
  qi: 120,
  foundation: 220,
  golden_core: 450,
}

export interface LifespanEffectDefinition {
  itemId: string
  name: string
  effectKey: string
  years: number
}

export const LIFESPAN_EFFECTS: readonly LifespanEffectDefinition[] = [
  { itemId: 'yanyuan_dan', name: '延元丹', effectKey: 'lifespan_effect:yanyuan_dan', years: 10 },
  { itemId: 'century_spirit_ginseng', name: '百年灵参', effectKey: 'lifespan_effect:century_spirit_ginseng', years: 15 },
  { itemId: 'blackwind_earth_marrow', name: '黑风地髓', effectKey: 'lifespan_effect:blackwind_earth_marrow', years: 30 },
]

export interface LifespanPenaltyDefinition {
  key: string
  label: string
  years: number
}

export const LIFESPAN_PENALTIES: readonly LifespanPenaltyDefinition[] = [
  { key: 'lifespan_penalty:yinsui_ningcha_entry', label: '阴髓凝煞侵体', years: 10 },
  { key: 'lifespan_penalty:evil_core_success', label: '妖丹凝煞结丹', years: 20 },
]

const EFFECT_BY_ITEM = new Map(LIFESPAN_EFFECTS.map((effect) => [effect.itemId, effect]))
const EFFECT_BY_KEY = new Map(LIFESPAN_EFFECTS.map((effect) => [effect.effectKey, effect]))
const PENALTY_BY_KEY = new Map(LIFESPAN_PENALTIES.map((penalty) => [penalty.key, penalty]))

export function getLifespanEffectByItemId(itemId: string): LifespanEffectDefinition | undefined {
  return EFFECT_BY_ITEM.get(itemId)
}

export function getLifespanEffectByKey(key: string): LifespanEffectDefinition | undefined {
  return EFFECT_BY_KEY.get(key)
}

export function getLifespanPenaltyByKey(key: string): LifespanPenaltyDefinition | undefined {
  return PENALTY_BY_KEY.get(key)
}
