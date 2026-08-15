import type { EquipmentSlot, ItemQuality } from './equipment'

export type ItemCategory =
  | 'material'
  | 'pill'
  | 'artifact'
  | 'weapon'
  | 'armor'
  | 'talisman'
  | 'special'
  | 'storage-bag'

export interface ItemDefinition {
  id: string
  name: string
  category: ItemCategory
  stackLimit: number
  slotCost: number
  capacityBonus?: number
  equipmentSlot?: EquipmentSlot
  tier?: number
  quality?: ItemQuality
  description?: string
  ruleTags?: readonly string[]
}

export interface InventoryStack {
  itemId: string
  quantity: number
}

export interface InventoryState {
  stacks: Record<string, InventoryStack>
  baseCapacitySlots: number
  storageBagItemId: string | null
}

export interface InventoryUsage {
  usedSlots: number
  capacitySlots: number
}
