import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import type { PersistentGame, GameSession } from '../types/persistence'
import type { SecretRealmMaterialCounts } from '../types/secretRealm'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { createInitialGameState } from './gameState'
import {
  addItem,
  BASE_INVENTORY_CAPACITY,
  canAddItem,
  getInventoryQuantity,
  getInventoryUsage,
  removeItem,
  resolveInventoryDrop,
  resolveInventoryInitialization,
} from './inventoryEngine'
import { executeSessionCommand } from './sessionEngine'
import { generateSunkenVeinRewards } from './secretRealmEngine'
import { getGameStateDigest } from './stateDigest'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function baseState(seed = 'r14-base'): GameState {
  return createInitialGameState({ runSeed: seed })
}

function stateWithPending(
  pendingMaterials: SecretRealmMaterialCounts,
  seed = 'r14-pending',
): GameState {
  const state = baseState(seed)
  return {
    ...state,
    secretRealm: {
      sunkenVeinChamber: {
        anchorSublocationId: 'sub:blackwind_mountain:1',
        discovered: true,
        active: false,
        currentNodeId: null,
        gateOpened: true,
        gateMethod: 'safe',
        coreLockedBehindPlayer: false,
        cleared: true,
        nodeClaims: { herbBed: true, sideRoom: true, core: true },
        knowledge: { ventSequence: true, mineIncidentEvidence: true },
        pendingMaterials,
        rewards: generateSunkenVeinRewards(seed),
        encounter: 'victory',
      },
    },
  }
}

function initializedState(seed = 'r14-initialized'): GameState {
  const result = resolveInventoryInitialization(baseState(seed))
  if (!result.applied || !result.state.inventory) throw new Error('test inventory failed to initialize')
  return result.state
}

describe('R14 inventory runtime', () => {
  it('keeps pre-R14 states legal and materializes inventory only through explicit initialization', () => {
    const state = baseState()
    expect(state.inventory).toBeUndefined()
    expect(getInventoryUsage(state)).toEqual({ usedSlots: 0, capacitySlots: 0 })

    const beforeDay = state.worldDay
    const beforeRng = state.rngState
    const initialized = resolveInventoryInitialization(state)
    expect(initialized.applied).toBe(true)
    expect(initialized.state.inventory).toEqual({ stacks: {}, baseCapacitySlots: 12, storageBagItemId: null })
    expect(initialized.state.worldDay).toBe(beforeDay)
    expect(initialized.state.rngState).toBe(beforeRng)

    const second = resolveInventoryInitialization(initialized.state)
    expect(second.applied).toBe(false)
    expect(second.reason).toBe('INVENTORY_ALREADY_INITIALIZED')
  })

  it('atomically migrates every R13 pending material and clears the old pending claims once', () => {
    const pending: SecretRealmMaterialCounts = {
      green_dew_grass: 4,
      water_spirit_moss: 3,
      jade_marrow_fungus: 1,
      black_iron: 3,
      red_pattern_iron: 2,
      shattered_spirit_crystal: 6,
      rock_lizard_carapace: 1,
      rock_lizard_mineral_crystal: 1,
    }
    const state = stateWithPending(pending)
    const result = resolveInventoryInitialization(state)
    expect(result.applied).toBe(true)
    for (const [itemId, quantity] of Object.entries(pending)) {
      expect(getInventoryQuantity(result.state, itemId)).toBe(quantity)
    }
    expect(result.state.secretRealm?.sunkenVeinChamber.pendingMaterials).toEqual({})
    expect(getInventoryUsage(result.state).usedSlots).toBe(9)
    expect(resolveInventoryInitialization(result.state).applied).toBe(false)
  })

  it('rejects an unknown pending id without creating inventory or deleting pending data', () => {
    const invalidPending = { unknown_mine_fragment: 1 } as unknown as SecretRealmMaterialCounts
    const state = stateWithPending(invalidPending, 'r14-invalid-pending')
    const result = resolveInventoryInitialization(state)
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('INVENTORY_PENDING_UNKNOWN_ITEM')
    expect(result.state.inventory).toBeUndefined()
    expect(result.state.secretRealm?.sunkenVeinChamber.pendingMaterials).toEqual(invalidPending)
  })

  it('stacks canonical items and derives extra slot use after stackLimit is crossed', () => {
    let state = initializedState('r14-stack')
    state = addItem(state, 'green_dew_grass', 10).state
    expect(getInventoryUsage(state)).toEqual({ usedSlots: 1, capacitySlots: BASE_INVENTORY_CAPACITY })
    state = addItem(state, 'green_dew_grass', 4).state
    expect(getInventoryQuantity(state, 'green_dew_grass')).toBe(14)
    expect(getInventoryUsage(state)).toEqual({ usedSlots: 2, capacitySlots: BASE_INVENTORY_CAPACITY })
  })

  it('counts large materials by slotCost and rejects additions that exceed capacity without mutation', () => {
    let state = initializedState('r14-capacity')
    const filled = addItem(state, 'rock_lizard_carapace', 6)
    expect(filled.applied).toBe(true)
    state = filled.state
    expect(getInventoryUsage(state)).toEqual({ usedSlots: 12, capacitySlots: 12 })
    expect(canAddItem(state, 'black_iron', 1)).toBe(false)
    const beforeDigest = getGameStateDigest(state)
    const overflow = addItem(state, 'black_iron', 1)
    expect(overflow.applied).toBe(false)
    expect(overflow.reason).toBe('INVENTORY_CAPACITY_EXCEEDED')
    expect(getGameStateDigest(overflow.state)).toBe(beforeDigest)
  })

  it('removes exact quantities, deletes zero stacks, and refuses invalid over-removal', () => {
    let state = initializedState('r14-remove')
    state = addItem(state, 'black_iron', 3).state
    const partial = removeItem(state, 'black_iron', 2)
    expect(partial.applied).toBe(true)
    expect(getInventoryQuantity(partial.state, 'black_iron')).toBe(1)
    const final = resolveInventoryDrop(partial.state, 'black_iron', 1)
    expect(final.applied).toBe(true)
    expect(final.state.inventory?.stacks.black_iron).toBeUndefined()
    const tooMany = removeItem(state, 'black_iron', 4)
    expect(tooMany.applied).toBe(false)
    expect(tooMany.reason).toBe('INVENTORY_NOT_ENOUGH_ITEMS')
  })

  it('lets one small storage bag raise effective capacity from 12 to 24 without stacking bonuses', () => {
    let state = initializedState('r14-bag')
    const oneBag = addItem(state, 'small_storage_bag', 1)
    expect(oneBag.applied).toBe(true)
    state = oneBag.state
    expect(state.inventory?.storageBagItemId).toBe('small_storage_bag')
    expect(getInventoryUsage(state)).toEqual({ usedSlots: 1, capacitySlots: 24 })

    const secondBag = addItem(state, 'small_storage_bag', 1)
    expect(secondBag.applied).toBe(true)
    expect(getInventoryQuantity(secondBag.state, 'small_storage_bag')).toBe(2)
    expect(getInventoryUsage(secondBag.state)).toEqual({ usedSlots: 2, capacitySlots: 24 })
  })

  it('does not allow dropping the active storage bag when the remaining items no longer fit', () => {
    let state = initializedState('r14-bag-drop')
    state = addItem(state, 'small_storage_bag', 1).state
    state = addItem(state, 'rock_lizard_carapace', 7).state
    expect(getInventoryUsage(state)).toEqual({ usedSlots: 15, capacitySlots: 24 })
    const result = resolveInventoryDrop(state, 'small_storage_bag', 1)
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('取下后背包容量不足')
    expect(getInventoryQuantity(result.state, 'small_storage_bag')).toBe(1)
  })

  it('persists inventory stacks and active storage bag across save reload with deep cloning', () => {
    let state = initializedState('r14-save')
    state = addItem(state, 'small_storage_bag', 1).state
    state = addItem(state, 'green_dew_grass', 14).state
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.inventory).toEqual(state.inventory)
    expect(loaded?.inventory).not.toBe(state.inventory)
    expect(loaded?.inventory?.stacks).not.toBe(state.inventory?.stacks)
  })

  it('replays initialize and drop commands deterministically from the same session snapshot', () => {
    const state = stateWithPending({ green_dew_grass: 3 }, 'r14-replay')
    const initial: GameSession = { state, debugLog: [], pendingResult: null, pendingAction: null }

    const run = () => {
      const initialized = executeSessionCommand(initial, { type: 'initialize-inventory' })
      expect(initialized.applied).toBe(true)
      const dropped = executeSessionCommand(initialized.session, { type: 'inventory-drop', itemId: 'green_dew_grass', quantity: 1 })
      expect(dropped.applied).toBe(true)
      return dropped.session
    }

    const first = run()
    const second = run()
    expect(first.debugLog.map((entry) => entry.command)).toEqual(second.debugLog.map((entry) => entry.command))
    expect(getGameStateDigest(first.state)).toBe(getGameStateDigest(second.state))
    expect(first.state.rngState).toBe(state.rngState)
    expect(first.state.worldDay).toBe(state.worldDay)
  })
})
