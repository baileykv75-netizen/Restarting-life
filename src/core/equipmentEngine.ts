import { getItemDefinition } from '../data/items'
import type { EquipmentSlot, EquipmentState } from '../types/equipment'
import type { GameState } from '../types/game'

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['main-weapon', 'armor', 'protective-artifact', 'support-artifact']

export interface EquipmentMutationResult {
  state: GameState
  applied: boolean
  reason?: string
}

function emptyEquipment(): EquipmentState {
  return {
    mainWeaponItemId: null,
    armorItemId: null,
    protectiveArtifactItemId: null,
    supportArtifactItemId: null,
  }
}

function getSlotValue(equipment: EquipmentState, slot: EquipmentSlot): string | null {
  if (slot === 'main-weapon') return equipment.mainWeaponItemId
  if (slot === 'armor') return equipment.armorItemId
  if (slot === 'protective-artifact') return equipment.protectiveArtifactItemId
  return equipment.supportArtifactItemId
}

function withSlotValue(equipment: EquipmentState, slot: EquipmentSlot, itemId: string | null): EquipmentState {
  if (slot === 'main-weapon') return { ...equipment, mainWeaponItemId: itemId }
  if (slot === 'armor') return { ...equipment, armorItemId: itemId }
  if (slot === 'protective-artifact') return { ...equipment, protectiveArtifactItemId: itemId }
  return { ...equipment, supportArtifactItemId: itemId }
}

export function getEquippedItemId(state: GameState, slot: EquipmentSlot): string | null {
  return state.equipment ? getSlotValue(state.equipment, slot) : null
}

export function isItemEquipped(state: GameState, itemId: string): boolean {
  if (!state.equipment) return false
  return EQUIPMENT_SLOTS.some((slot) => getSlotValue(state.equipment!, slot) === itemId)
}

export function resolveEquipmentInitialization(state: GameState): EquipmentMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (!state.inventory) return { state, applied: false, reason: 'INVENTORY_NOT_INITIALIZED' }
  if (state.equipment) return { state, applied: false, reason: 'EQUIPMENT_ALREADY_INITIALIZED' }
  return { state: { ...state, equipment: emptyEquipment() }, applied: true }
}

export function resolveEquipItem(state: GameState, itemId: string): EquipmentMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (!state.inventory) return { state, applied: false, reason: 'INVENTORY_NOT_INITIALIZED' }
  if (!state.equipment) return { state, applied: false, reason: 'EQUIPMENT_NOT_INITIALIZED' }
  const definition = getItemDefinition(itemId)
  if (!definition) return { state, applied: false, reason: 'INVENTORY_UNKNOWN_ITEM' }
  if (!definition.equipmentSlot) return { state, applied: false, reason: 'ITEM_NOT_EQUIPPABLE' }
  if ((state.inventory.stacks[itemId]?.quantity ?? 0) < 1) return { state, applied: false, reason: 'ITEM_NOT_OWNED' }

  return {
    state: {
      ...state,
      equipment: withSlotValue(state.equipment, definition.equipmentSlot, itemId),
    },
    applied: true,
  }
}

export function resolveUnequipSlot(state: GameState, slot: EquipmentSlot): EquipmentMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (!state.equipment) return { state, applied: false, reason: 'EQUIPMENT_NOT_INITIALIZED' }
  if (!getSlotValue(state.equipment, slot)) return { state, applied: false, reason: 'EQUIPMENT_SLOT_EMPTY' }
  return { state: { ...state, equipment: withSlotValue(state.equipment, slot, null) }, applied: true }
}
