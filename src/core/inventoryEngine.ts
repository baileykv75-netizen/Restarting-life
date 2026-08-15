import { getItemDefinition } from '../data/items'
import type { GameState } from '../types/game'
import type { InventoryState, InventoryUsage } from '../types/inventory'

export const BASE_INVENTORY_CAPACITY = 12
export const SMALL_STORAGE_BAG_ID = 'small_storage_bag'

export interface InventoryMutationResult {
  state: GameState
  applied: boolean
  reason?: string
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0
}

function cloneInventory(inventory: InventoryState): InventoryState {
  return {
    ...inventory,
    stacks: Object.fromEntries(
      Object.entries(inventory.stacks).map(([id, stack]) => [id, { ...stack }]),
    ),
  }
}

function getUsageFromInventory(inventory: InventoryState): InventoryUsage {
  let usedSlots = 0
  for (const stack of Object.values(inventory.stacks)) {
    const definition = getItemDefinition(stack.itemId)
    if (!definition || !isPositiveInteger(stack.quantity)) continue
    usedSlots += Math.ceil(stack.quantity / definition.stackLimit) * definition.slotCost
  }

  let capacitySlots = inventory.baseCapacitySlots
  if (inventory.storageBagItemId) {
    const activeStack = inventory.stacks[inventory.storageBagItemId]
    const activeDefinition = getItemDefinition(inventory.storageBagItemId)
    if (activeStack && activeStack.quantity > 0 && activeDefinition?.capacityBonus) {
      capacitySlots += activeDefinition.capacityBonus
    }
  }

  return { usedSlots, capacitySlots }
}

function withQuantity(inventory: InventoryState, itemId: string, quantity: number): InventoryState {
  const next = cloneInventory(inventory)
  if (quantity <= 0) {
    delete next.stacks[itemId]
  } else {
    next.stacks[itemId] = { itemId, quantity }
  }
  return next
}

function addToInventory(inventory: InventoryState, itemId: string, quantity: number): { inventory?: InventoryState; reason?: string } {
  const definition = getItemDefinition(itemId)
  if (!definition) return { reason: 'INVENTORY_UNKNOWN_ITEM' }
  if (!isPositiveInteger(quantity)) return { reason: 'INVENTORY_INVALID_QUANTITY' }

  const currentQuantity = inventory.stacks[itemId]?.quantity ?? 0
  let next = withQuantity(inventory, itemId, currentQuantity + quantity)
  if (definition.category === 'storage-bag' && next.storageBagItemId === null) {
    next = { ...next, storageBagItemId: itemId }
  }

  const usage = getUsageFromInventory(next)
  if (usage.usedSlots > usage.capacitySlots) return { reason: 'INVENTORY_CAPACITY_EXCEEDED' }
  return { inventory: next }
}

function removeFromInventory(inventory: InventoryState, itemId: string, quantity: number): { inventory?: InventoryState; reason?: string } {
  const definition = getItemDefinition(itemId)
  if (!definition) return { reason: 'INVENTORY_UNKNOWN_ITEM' }
  if (!isPositiveInteger(quantity)) return { reason: 'INVENTORY_INVALID_QUANTITY' }

  const currentQuantity = inventory.stacks[itemId]?.quantity ?? 0
  if (currentQuantity < quantity) return { reason: 'INVENTORY_NOT_ENOUGH_ITEMS' }

  const remaining = currentQuantity - quantity
  let next = withQuantity(inventory, itemId, remaining)
  if (inventory.storageBagItemId === itemId && remaining === 0) {
    next = { ...next, storageBagItemId: null }
  }

  const usage = getUsageFromInventory(next)
  if (usage.usedSlots > usage.capacitySlots) {
    return {
      reason: definition.category === 'storage-bag'
        ? '取下后背包容量不足'
        : 'INVENTORY_CAPACITY_EXCEEDED',
    }
  }
  return { inventory: next }
}

function migratePendingMaterials(
  state: GameState,
  startingInventory: InventoryState,
): { inventory?: InventoryState; reason?: string } {
  let inventory = cloneInventory(startingInventory)
  const pending = state.secretRealm?.sunkenVeinChamber.pendingMaterials ?? {}
  for (const [itemId, rawQuantity] of Object.entries(pending)) {
    if (rawQuantity === undefined || rawQuantity === 0) continue
    if (!getItemDefinition(itemId)) return { reason: 'INVENTORY_PENDING_UNKNOWN_ITEM' }
    if (!isPositiveInteger(rawQuantity)) return { reason: 'INVENTORY_PENDING_INVALID_QUANTITY' }
    const result = addToInventory(inventory, itemId, rawQuantity)
    if (!result.inventory) return { reason: result.reason ?? 'INVENTORY_PENDING_MIGRATION_FAILED' }
    inventory = result.inventory
  }
  return { inventory }
}

function clearPendingMaterials(state: GameState, inventory: InventoryState): GameState {
  if (!state.secretRealm) return { ...state, inventory }
  return {
    ...state,
    inventory,
    secretRealm: {
      sunkenVeinChamber: {
        ...state.secretRealm.sunkenVeinChamber,
        pendingMaterials: {},
      },
    },
  }
}

export function getInventoryUsage(state: GameState): InventoryUsage {
  return state.inventory
    ? getUsageFromInventory(state.inventory)
    : { usedSlots: 0, capacitySlots: 0 }
}

export function getInventoryQuantity(state: GameState, itemId: string): number {
  return state.inventory?.stacks[itemId]?.quantity ?? 0
}

export function canAddItem(state: GameState, itemId: string, quantity: number): boolean {
  if (!state.inventory) return false
  return addToInventory(state.inventory, itemId, quantity).inventory !== undefined
}

export function addItem(state: GameState, itemId: string, quantity: number): InventoryMutationResult {
  if (!state.inventory) return { state, applied: false, reason: 'INVENTORY_NOT_INITIALIZED' }
  const result = addToInventory(state.inventory, itemId, quantity)
  if (!result.inventory) return { state, applied: false, reason: result.reason }
  return { state: { ...state, inventory: result.inventory }, applied: true }
}

export function removeItem(state: GameState, itemId: string, quantity: number): InventoryMutationResult {
  if (!state.inventory) return { state, applied: false, reason: 'INVENTORY_NOT_INITIALIZED' }
  if (isPositiveInteger(quantity) && state.equipment) {
    const currentQuantity = state.inventory.stacks[itemId]?.quantity ?? 0
    const isEquipped = Object.values(state.equipment).some((equippedId) => equippedId === itemId)
    if (isEquipped && currentQuantity - quantity < 1) {
      return { state, applied: false, reason: '请先卸下正在装备的物品' }
    }
  }
  const result = removeFromInventory(state.inventory, itemId, quantity)
  if (!result.inventory) return { state, applied: false, reason: result.reason }
  return { state: { ...state, inventory: result.inventory }, applied: true }
}

export function resolveInventoryInitialization(state: GameState): InventoryMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.inventory) return { state, applied: false, reason: 'INVENTORY_ALREADY_INITIALIZED' }

  const emptyInventory: InventoryState = {
    stacks: {},
    baseCapacitySlots: BASE_INVENTORY_CAPACITY,
    storageBagItemId: null,
  }
  const migration = migratePendingMaterials(state, emptyInventory)
  if (!migration.inventory) return { state, applied: false, reason: migration.reason }
  return { state: clearPendingMaterials(state, migration.inventory), applied: true }
}

/**
 * R13 compatibility bridge: once formal inventory exists, any newly resolved
 * secret-realm materials are atomically moved out of the legacy pending field.
 * A failed transfer leaves the caller free to reject the originating command.
 */
export function resolvePendingMaterialsTransfer(state: GameState): InventoryMutationResult {
  if (!state.inventory) return { state, applied: false, reason: 'INVENTORY_NOT_INITIALIZED' }
  const migration = migratePendingMaterials(state, state.inventory)
  if (!migration.inventory) return { state, applied: false, reason: migration.reason }
  return { state: clearPendingMaterials(state, migration.inventory), applied: true }
}

export function resolveInventoryDrop(state: GameState, itemId: string, quantity: number): InventoryMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  return removeItem(state, itemId, quantity)
}
