import type { BeastEncounterVariant, BeastId } from '../types/beast'
import type { CombatOpponentId } from '../types/combat'

export interface BeastLootRule {
  itemId: string
  min: number
  max: number
  variants?: readonly BeastEncounterVariant[]
  chance?: number
  damagedPart?: boolean
}

export const BEAST_TO_COMBAT_OPPONENT: Readonly<Record<BeastId, CombatOpponentId>> = {
  greenback_wolf: 'greenback-wolf',
  redtail_fox: 'redtail-fox',
  ironhide_boar: 'ironhide-boar',
  bishui_snake: 'bishui-snake',
  rock_armored_lizard: 'adult-rock-lizard',
  red_maned_ape: 'red-maned-ape',
  cold_pool_scale_python: 'cold-pool-scale-python',
  one_horned_azure_wolf: 'one-horned-azure-wolf',
}

export const ORDINARY_BEAST_IDS = [
  'greenback_wolf',
  'redtail_fox',
  'ironhide_boar',
  'bishui_snake',
  'rock_armored_lizard',
  'red_maned_ape',
] as const satisfies readonly BeastId[]

export const BEAST_LOOT_DEFINITIONS: Readonly<Record<BeastId, readonly BeastLootRule[]>> = {
  greenback_wolf: [
    { itemId: 'greenback_wolf_pelt', min: 1, max: 1, damagedPart: true },
    { itemId: 'greenback_wolf_fang', min: 2, max: 4 },
    { itemId: 'low_grade_beast_essence', min: 1, max: 1, variants: ['strong'] },
    { itemId: 'immature_beast_core', min: 1, max: 1, variants: ['strong'], chance: 0.1 },
  ],
  redtail_fox: [
    { itemId: 'redtail_fox_pelt', min: 1, max: 1, damagedPart: true },
    { itemId: 'redtail_fox_tail_fur', min: 1, max: 2, damagedPart: true },
    { itemId: 'low_grade_beast_essence', min: 1, max: 1 },
  ],
  ironhide_boar: [
    { itemId: 'ironhide_boar_hide', min: 1, max: 2, damagedPart: true },
    { itemId: 'ironhide_boar_tusk', min: 2, max: 2 },
    { itemId: 'beast_bone', min: 1, max: 3 },
  ],
  bishui_snake: [
    { itemId: 'bishui_venom_sac', min: 1, max: 1 },
    { itemId: 'bishui_snake_gall', min: 1, max: 1 },
    { itemId: 'bishui_snake_skin', min: 1, max: 1, damagedPart: true },
  ],
  rock_armored_lizard: [
    { itemId: 'rock_lizard_carapace', min: 1, max: 1, damagedPart: true },
    { itemId: 'rock_lizard_mineral_crystal', min: 1, max: 2 },
  ],
  red_maned_ape: [
    { itemId: 'red_maned_ape_tendon', min: 1, max: 1 },
    { itemId: 'beast_bone', min: 2, max: 4 },
    { itemId: 'low_grade_beast_essence', min: 1, max: 2 },
    { itemId: 'mature_first_tier_beast_core', min: 1, max: 1, variants: ['strong'], chance: 0.25 },
  ],
  cold_pool_scale_python: [
    { itemId: 'cold_pool_python_scale', min: 2, max: 4, damagedPart: true },
    { itemId: 'cold_pool_python_tendon', min: 1, max: 2 },
    { itemId: 'cold_pool_python_cold_sac', min: 1, max: 1 },
    { itemId: 'complete_second_tier_beast_core', min: 1, max: 1 },
    { itemId: 'high_grade_beast_essence', min: 1, max: 1 },
  ],
  one_horned_azure_wolf: [
    { itemId: 'azure_wolf_pelt', min: 1, max: 1, damagedPart: true },
    { itemId: 'azure_wolf_horn', min: 1, max: 1 },
    { itemId: 'complete_second_tier_beast_core', min: 1, max: 1 },
    { itemId: 'high_grade_beast_essence', min: 2, max: 2 },
  ],
}

export function isOrdinaryBeast(beastId: BeastId): boolean {
  return (ORDINARY_BEAST_IDS as readonly BeastId[]).includes(beastId)
}
