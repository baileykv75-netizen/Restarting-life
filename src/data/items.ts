import type { ItemDefinition } from '../types/inventory'

export const ITEM_DEFINITIONS = [
  { id: 'green_dew_grass', name: '青露草', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'water_spirit_moss', name: '水灵苔', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'jade_marrow_fungus', name: '玉髓芝', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'black_iron', name: '黑铁', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'red_pattern_iron', name: '赤纹铁', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'shattered_spirit_crystal', name: '碎灵晶', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'rock_lizard_carapace', name: '岩甲蜥背甲', category: 'material', stackLimit: 1, slotCost: 2 },
  { id: 'rock_lizard_mineral_crystal', name: '岩甲蜥矿性结晶', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'small_storage_bag', name: '小型储物袋', category: 'storage-bag', stackLimit: 1, slotCost: 1, capacityBonus: 12 },
] as const satisfies readonly ItemDefinition[]

const ITEM_BY_ID = new Map<string, ItemDefinition>(ITEM_DEFINITIONS.map((item) => [item.id, item]))

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return ITEM_BY_ID.get(itemId)
}
