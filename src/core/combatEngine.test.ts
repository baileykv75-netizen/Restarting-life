import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import type { GameSession, PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { addItem, getInventoryQuantity, resolveInventoryInitialization } from './inventoryEngine'
import { resolveEquipItem, resolveEquipmentInitialization } from './equipmentEngine'
import { applyGameAction } from './gameActionReducer'
import { createInitialGameState } from './gameState'
import { executeSessionCommand } from './sessionEngine'
import { getGameStateDigest } from './stateDigest'
import { getCombatMoveViews, getPlayerFleePreview } from './combatEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function preparedState(seed = 'r20-combat'): GameState {
  const base = createInitialGameState({ runSeed: seed })
  let state: GameState = {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: 'blackwind_mountain' },
    identity: { ...base.identity, spiritRootId: 'metal-single', talentIds: [] },
    cultivation: {
      realm: 'qi', stage: 5, practiceInitialized: true,
      knownTechniqueIds: ['qingfeng_jianjue', 'chiyan_shu', 'futeng_shu', 'shuimu_shu', 'shijia_shu', 'jinmang_jue'],
      mainTechniqueId: 'xiaozhoutian_tuna', techniqueSystemInitialized: true,
      auxiliaryTechniqueIds: ['qingfeng_jianjue', 'chiyan_shu', 'futeng_shu', 'shuimu_shu', 'shijia_shu', 'jinmang_jue'],
      techniquePractice: {
        qingfeng_jianjue: { proficiencyPoints: 3000 }, chiyan_shu: { proficiencyPoints: 0 }, futeng_shu: { proficiencyPoints: 0 },
        shuimu_shu: { proficiencyPoints: 0 }, shijia_shu: { proficiencyPoints: 0 }, jinmang_jue: { proficiencyPoints: 0 },
      },
    },
  }
  const inventory = resolveInventoryInitialization(state)
  if (!inventory.applied) throw new Error(inventory.reason)
  state = inventory.state
  const equipment = resolveEquipmentInitialization(state)
  if (!equipment.applied) throw new Error(equipment.reason)
  state = equipment.state
  for (const itemId of ['qingfeng_sword', 'black_iron_greatsword', 'black_iron_armor', 'flowing_cloud_boots', 'huiqi_dan', 'fire_talisman', 'protective_talisman', 'thunderfire_orb', 'beast_binding_rope']) {
    state = addItem(state, itemId, itemId === 'huiqi_dan' ? 3 : 1).state
  }
  state = resolveEquipItem(state, 'qingfeng_sword').state
  return state
}

function start(state: GameState, opponentId: 'greenback-wolf' | 'adult-rock-lizard' | 'red-maned-ape' | 'ordinary-loose-cultivator' = 'greenback-wolf'): GameState {
  const result = applyGameAction(state, { type: 'START_COMBAT', opponentId, source: 'field' })
  if (!result.applied || !result.state.combat) throw new Error(result.reason)
  return result.state
}

function runAction(state: GameState, action: import('../types/combat').CombatAction): GameState {
  const result = applyGameAction(state, { type: 'COMBAT_ACTION', action })
  if (!result.applied) throw new Error(result.reason)
  return result.state
}

function secretCoreState(seed = 'r20-secret'): GameState {
  const state = preparedState(seed)
  return {
    ...state,
    secretRealm: {
      sunkenVeinChamber: {
        anchorSublocationId: 'sub:blackwind_mountain:1', discovered: true, active: true, currentNodeId: 'vein-heart-chamber', gateOpened: true,
        gateMethod: 'safe', coreLockedBehindPlayer: true, cleared: false,
        nodeClaims: { herbBed: false, sideRoom: true, core: false }, knowledge: { ventSequence: true, mineIncidentEvidence: false },
        pendingMaterials: {}, rewards: { herbBed: {}, sideRoom: {}, core: {}, coreSpiritStones: 8 }, encounter: 'unresolved',
      },
    },
  }
}

describe('R20 formal combat runtime', () => {
  it('keeps combat optional for pre-R20 states and initializes one battle without advancing world time', () => {
    const before = preparedState('r20-start')
    expect(before.combat).toBeUndefined()
    const day = before.worldDay
    const rng = before.rngState
    const result = applyGameAction(before, { type: 'START_COMBAT', opponentId: 'greenback-wolf', source: 'field' })
    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(day)
    expect(result.state.rngState).not.toBe(rng)
    expect(result.state.combat?.player).toMatchObject({ maxHP: 140, maxQi: 100, baseAttack: 18 })
    expect(result.state.combat?.opponent).toMatchObject({ maxHP: 105, baseAttack: 12 })
    expect(applyGameAction(result.state, { type: 'START_COMBAT', opponentId: 'greenback-wolf', source: 'field' }).reason).toBe('COMBAT_ACTIVE')
  })

  it('uses the C20 basic damage and beat model, including the greatsword slow interval without switch-reset exploits', () => {
    let state = start(preparedState('r20-beats'))
    state = runAction(state, { type: 'basic' })
    expect(state.combat?.opponent.currentHP).toBeLessThan(105)
    const beat = state.combat!.beat
    state = runAction(state, { type: 'switch-weapon', itemId: 'black_iron_greatsword' })
    expect(state.combat?.beat).toBe(beat)
    state = runAction(state, { type: 'basic' })
    const ready = state.combat?.player.nextBasicAttackBeat
    expect(ready).toBe((state.combat?.beat ?? 0) + 1)
    state = runAction(state, { type: 'switch-weapon', itemId: 'qingfeng_sword' })
    expect(state.combat?.player.nextBasicAttackBeat).toBe(ready)
  })

  it('snapshots at most four real unlocked auxiliary moves and enforces Qi/cooldown/weapon requirements', () => {
    let state = start(preparedState('r20-moves'), 'red-maned-ape')
    const moves = getCombatMoveViews(state)
    expect(moves).toHaveLength(4)
    expect(moves.map((move) => move.name)).toEqual(['刺', '斩', '御剑追击', '火弹'])
    const beforeQi = state.combat!.player.currentQi
    state = runAction(state, { type: 'move', techniqueId: 'qingfeng_jianjue', moveId: 'slash' })
    expect(state.combat?.player.currentQi).toBe(beforeQi - 14)
    expect(getCombatMoveViews(state).find((move) => move.moveId === 'slash')?.ready).toBe(false)
  })

  it('consumes real combat items, caps Huiqi Dan at two per battle, and never invents a second inventory', () => {
    let state = start(preparedState('r20-items'), 'red-maned-ape')
    state = { ...state, combat: { ...state.combat!, player: { ...state.combat!.player, currentQi: 0 } } }
    state = runAction(state, { type: 'item', itemId: 'huiqi_dan' })
    state = runAction(state, { type: 'item', itemId: 'huiqi_dan' })
    expect(state.combat?.qiPillsUsed).toBe(2)
    expect(getInventoryQuantity(state, 'huiqi_dan')).toBe(1)
    const third = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'item', itemId: 'huiqi_dan' } })
    expect(third.applied).toBe(false)
    expect(third.reason).toBe('HUIQI_DAN_BATTLE_LIMIT')
    expect(getInventoryQuantity(third.state, 'huiqi_dan')).toBe(1)
  })

  it('shows exact flee modifiers, uses seeded combat RNG, and blocks fleeing from the sealed secret-realm core', () => {
    let field = preparedState('r20-flee')
    field = { ...field, identity: { ...field.identity, talentIds: ['light_foot'] } }
    field = resolveEquipItem(field, 'black_iron_armor').state
    field = resolveEquipItem(field, 'flowing_cloud_boots').state
    field = start(field, 'adult-rock-lizard')
    const preview = getPlayerFleePreview(field)
    expect(preview?.chance).toBeGreaterThan(50)
    expect(preview?.modifiers.some((modifier) => modifier.label === '身轻步稳')).toBe(true)
    expect(preview?.modifiers.some((modifier) => modifier.label === '流云靴')).toBe(true)

    const secretStart = applyGameAction(secretCoreState(), { type: 'START_COMBAT', opponentId: 'adult-rock-lizard', source: 'sunken-vein-core' })
    expect(secretStart.applied).toBe(true)
    expect(getPlayerFleePreview(secretStart.state)?.blockedReason).toBe('FLEE_BLOCKED_BY_SECRET_REALM_LOCK')
    const flee = applyGameAction(secretStart.state, { type: 'COMBAT_ACTION', action: { type: 'flee' } })
    expect(flee.applied).toBe(false)
    expect(flee.reason).toBe('FLEE_BLOCKED_BY_SECRET_REALM_LOCK')
  })

  it('telegraphs the rock lizard sweep one beat ahead and exposes it after the sweep resolves', () => {
    let state = start(preparedState('r20-telegraph'), 'adult-rock-lizard')
    state = runAction(state, { type: 'basic' })
    expect(state.combat?.beat).toBe(2)
    expect(state.combat?.telegraph).toBeNull()
    state = runAction(state, { type: 'basic' })
    expect(state.combat?.beat).toBe(3)
    expect(state.combat?.telegraph?.id).toBe('tail-sweep')
    state = runAction(state, { type: 'item', itemId: 'protective_talisman' })
    expect(state.combat?.opponent.statuses.exposed).toBe(true)
  })

  it('turns a surviving low-HP battle end into the existing injury runtime and clears combat', () => {
    let state = start(preparedState('r20-injury'))
    state = {
      ...state,
      combat: {
        ...state.combat!,
        player: { ...state.combat!.player, currentHP: 30 },
        opponent: { ...state.combat!.opponent, currentHP: 1 },
      },
    }
    state = runAction(state, { type: 'basic' })
    expect(state.combat).toBeUndefined()
    expect(state.injuries?.conditions.some((condition) => condition.kind === 'light')).toBe(true)
  })

  it('uses the unique death path at HP zero and clears the combat runtime', () => {
    let state = start(preparedState('r20-death'), 'red-maned-ape')
    state = { ...state, combat: { ...state.combat!, player: { ...state.combat!.player, currentHP: 1 } } }
    state = runAction(state, { type: 'basic' })
    expect(state.status).toBe('dead')
    expect(state.combat).toBeUndefined()
    expect(state.endReason).toContain('赤鬃山猿')
    expect(state.chronicle.at(-1)?.title).toBe('战斗中身死')
  })

  it('replaces the actual secret-realm player path with formal combat and writes victory back to the realm runtime', () => {
    let state = secretCoreState('r20-secret-victory')
    state = applyGameAction(state, { type: 'START_COMBAT', opponentId: 'adult-rock-lizard', source: 'sunken-vein-core' }).state
    state = {
      ...state,
      combat: { ...state.combat!, opponent: { ...state.combat!.opponent, currentHP: 1 } },
    }
    state = runAction(state, { type: 'basic' })
    expect(state.combat).toBeUndefined()
    expect(state.secretRealm?.sunkenVeinChamber.encounter).toBe('victory')
    expect(state.secretRealm?.sunkenVeinChamber.active).toBe(true)
    expect(state.secretRealm?.sunkenVeinChamber.currentNodeId).toBe('vein-heart-chamber')
  })

  it('deep-clones active combat on save/reload', () => {
    const state = start(preparedState('r20-save'), 'adult-rock-lizard')
    const persistent: PersistentGame = {
      schemaVersion: 3, phase: 'life', currentSession: { state, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null, archives: [], meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.combat).toEqual(state.combat)
    expect(loaded?.combat).not.toBe(state.combat)
    expect(loaded?.combat?.player).not.toBe(state.combat?.player)
    expect(loaded?.combat?.log).not.toBe(state.combat?.log)
  })

  it('keeps SessionCommand/game-action combat transitions deterministic for replay logging', () => {
    const state = preparedState('r20-session')
    const initial: GameSession = { state, debugLog: [], pendingResult: null, pendingAction: null }
    const run = () => {
      const started = executeSessionCommand(initial, { type: 'game-action', action: { type: 'START_COMBAT', opponentId: 'adult-rock-lizard', source: 'field' } })
      expect(started.applied).toBe(true)
      const beat1 = executeSessionCommand(started.session, { type: 'game-action', action: { type: 'COMBAT_ACTION', action: { type: 'basic' } } })
      expect(beat1.applied).toBe(true)
      const beat2 = executeSessionCommand(beat1.session, { type: 'game-action', action: { type: 'COMBAT_ACTION', action: { type: 'move', techniqueId: 'chiyan_shu', moveId: 'firebolt' } } })
      expect(beat2.applied).toBe(true)
      return beat2.session
    }
    const first = run()
    const second = run()
    expect(first.debugLog.map((entry) => entry.command)).toEqual(second.debugLog.map((entry) => entry.command))
    expect(getGameStateDigest(first.state)).toBe(getGameStateDigest(second.state))
    expect(first.state.worldDay).toBe(state.worldDay)
  })
})
