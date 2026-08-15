import { describe, expect, it } from 'vitest'
import { ITEM_DEFINITIONS, getItemDefinition } from '../data/items'
import type { PersistentGame, GameSession } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { formatItemGrade } from '../ui/itemFormatters'
import { addItem, getInventoryQuantity, resolveInventoryDrop, resolveInventoryInitialization } from './inventoryEngine'
import { createInitialGameState } from './gameState'
import { EQUIPMENT_SLOTS, resolveEquipItem, resolveEquipmentInitialization, resolveUnequipSlot } from './equipmentEngine'
import { executeSessionCommand } from './sessionEngine'
import { getGameStateDigest } from './stateDigest'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function inventoryState(seed = 'r15-base') {
  const state = createInitialGameState({ runSeed: seed })
  const inventory = resolveInventoryInitialization(state)
  if (!inventory.applied) throw new Error('inventory failed to initialize')
  return inventory.state
}

function equipmentState(seed = 'r15-equipped') {
  const state = inventoryState(seed)
  const equipment = resolveEquipmentInitialization(state)
  if (!equipment.applied || !equipment.state.equipment) throw new Error('equipment failed to initialize')
  return equipment.state
}

describe('R15 equipment state', () => {
  it('keeps R14 and older states legal and bootstraps equipment exactly once without time or RNG changes', () => {
    const before = inventoryState('r15-bootstrap')
    expect(before.equipment).toBeUndefined()
    const result = resolveEquipmentInitialization(before)
    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(before.worldDay)
    expect(result.state.rngState).toBe(before.rngState)
    expect(Object.keys(result.state.equipment ?? {})).toHaveLength(4)
    expect(EQUIPMENT_SLOTS).toEqual(['main-weapon', 'armor', 'protective-artifact', 'support-artifact'])
    expect(resolveEquipmentInitialization(result.state).reason).toBe('EQUIPMENT_ALREADY_INITIALIZED')
  })

  it('rejects non-equipment items and equipment that is not actually owned', () => {
    const state = equipmentState('r15-invalid-equip')
    expect(resolveEquipItem(state, 'green_dew_grass').reason).toBe('ITEM_NOT_EQUIPPABLE')
    expect(resolveEquipItem(state, 'qingfeng_sword').reason).toBe('ITEM_NOT_OWNED')
  })

  it('maps the ten frozen first-version equipment items into only the four formal slots', () => {
    const expected = {
      qingfeng_sword: 'main-weapon',
      black_iron_greatsword: 'main-weapon',
      red_pattern_blade: 'main-weapon',
      green_bamboo_spirit_bow: 'main-weapon',
      black_iron_armor: 'armor',
      green_wolf_soft_armor: 'armor',
      heart_guard_mirror: 'protective-artifact',
      spirit_suppressing_jade: 'protective-artifact',
      flowing_cloud_boots: 'support-artifact',
      spirit_seeking_compass: 'support-artifact',
    } as const
    for (const [id, slot] of Object.entries(expected)) expect(getItemDefinition(id)?.equipmentSlot).toBe(slot)
    expect(getItemDefinition('small_storage_bag')?.equipmentSlot).toBeUndefined()
    expect(getItemDefinition('willow_leaf_double_blades')).toBeUndefined()
  })

  it('equips, replaces and unequips references without copying or deleting inventory ownership', () => {
    let state = equipmentState('r15-reference-semantics')
    state = addItem(state, 'qingfeng_sword', 1).state
    state = addItem(state, 'black_iron_greatsword', 1).state
    const beforeSword = getInventoryQuantity(state, 'qingfeng_sword')
    const beforeGreatsword = getInventoryQuantity(state, 'black_iron_greatsword')

    let result = resolveEquipItem(state, 'qingfeng_sword')
    expect(result.applied).toBe(true)
    expect(result.state.equipment?.mainWeaponItemId).toBe('qingfeng_sword')
    result = resolveEquipItem(result.state, 'black_iron_greatsword')
    expect(result.state.equipment?.mainWeaponItemId).toBe('black_iron_greatsword')
    expect(getInventoryQuantity(result.state, 'qingfeng_sword')).toBe(beforeSword)
    expect(getInventoryQuantity(result.state, 'black_iron_greatsword')).toBe(beforeGreatsword)

    const unequipped = resolveUnequipSlot(result.state, 'main-weapon')
    expect(unequipped.applied).toBe(true)
    expect(unequipped.state.equipment?.mainWeaponItemId).toBeNull()
    expect(getInventoryQuantity(unequipped.state, 'black_iron_greatsword')).toBe(beforeGreatsword)
    expect(resolveUnequipSlot(unequipped.state, 'main-weapon').reason).toBe('EQUIPMENT_SLOT_EMPTY')
  })

  it('protects the final equipped copy from dropping while allowing surplus copies to be discarded', () => {
    let state = equipmentState('r15-drop-protection')
    state = addItem(state, 'qingfeng_sword', 2).state
    state = resolveEquipItem(state, 'qingfeng_sword').state
    const surplus = resolveInventoryDrop(state, 'qingfeng_sword', 1)
    expect(surplus.applied).toBe(true)
    expect(getInventoryQuantity(surplus.state, 'qingfeng_sword')).toBe(1)
    const finalCopy = resolveInventoryDrop(surplus.state, 'qingfeng_sword', 1)
    expect(finalCopy.applied).toBe(false)
    expect(finalCopy.reason).toBe('请先卸下正在装备的物品')
    expect(getInventoryQuantity(finalCopy.state, 'qingfeng_sword')).toBe(1)
  })

  it('formats the world grade system without inventing grades for the ten unfrozen equipment items', () => {
    expect(formatItemGrade({ tier: 1, quality: 'low' })).toBe('一阶下品')
    expect(formatItemGrade({ tier: 1, quality: 'mid' })).toBe('一阶中品')
    expect(formatItemGrade({ tier: 1, quality: 'high' })).toBe('一阶上品')
    expect(formatItemGrade({ tier: 2, quality: 'low' })).toBe('二阶下品')
    expect(formatItemGrade({})).toBe('品阶未标定')
    const equipmentDefinitions = ITEM_DEFINITIONS.filter((item) => 'equipmentSlot' in item)
    expect(equipmentDefinitions).toHaveLength(10)
    for (const item of equipmentDefinitions) expect(formatItemGrade(getItemDefinition(item.id)!)).toBe('品阶未标定')
  })

  it('persists and deep-clones the four equipment references on save/reload', () => {
    let state = equipmentState('r15-save')
    state = addItem(state, 'black_iron_armor', 1).state
    state = resolveEquipItem(state, 'black_iron_armor').state
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
    expect(loaded?.equipment).toEqual(state.equipment)
    expect(loaded?.equipment).not.toBe(state.equipment)
  })

  it('replays initialize, equip and unequip SessionCommands deterministically', () => {
    let state = inventoryState('r15-replay')
    state = addItem(state, 'flowing_cloud_boots', 1).state
    const initial: GameSession = { state, debugLog: [], pendingResult: null, pendingAction: null }

    const run = () => {
      const initialized = executeSessionCommand(initial, { type: 'initialize-equipment' })
      expect(initialized.applied).toBe(true)
      const equipped = executeSessionCommand(initialized.session, { type: 'equip-item', itemId: 'flowing_cloud_boots' })
      expect(equipped.applied).toBe(true)
      const unequipped = executeSessionCommand(equipped.session, { type: 'unequip-slot', slot: 'support-artifact' })
      expect(unequipped.applied).toBe(true)
      return unequipped.session
    }

    const first = run()
    const second = run()
    expect(first.debugLog.map((entry) => entry.command)).toEqual(second.debugLog.map((entry) => entry.command))
    expect(getGameStateDigest(first.state)).toBe(getGameStateDigest(second.state))
    expect(first.state.worldDay).toBe(state.worldDay)
    expect(first.state.rngState).toBe(state.rngState)
  })
})
