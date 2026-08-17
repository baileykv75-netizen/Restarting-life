import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import type { GameSession, PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { addItem, getInventoryQuantity, resolveInventoryInitialization } from './inventoryEngine'
import { addInjuries, addOrExtendCombatSevereInjury, getActiveInjuries, resolveRecuperateDays, resolveUseTreatmentItem } from './injuryEngine'
import { applyGameAction } from './gameActionReducer'
import { createInitialGameState } from './gameState'
import { advanceWorldTime } from './worldEngine'
import {
  getActivePoison,
  hasActivePoison,
  resolveApplyPoisonCondition,
} from './poisonEngine'
import { calculateCultivationPreview } from './cultivationEngine'
import { resolveRegionExploration } from './regionExplorationEngine'
import { resolveTravel } from './travelEngine'
import { calculateFoundationBreakthroughPreview } from './foundationBreakthroughEngine'
import { resolveGoldenCoreBreakthrough } from './goldenCoreBreakthroughEngine'
import { executeSessionCommand } from './sessionEngine'
import { getGameStateDigest } from './stateDigest'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function adultState(seed = 'r21-health', locationId = 'qingxia_market'): GameState {
  const base = createInitialGameState({ runSeed: seed })
  let state: GameState = {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: locationId },
    knowledge: { locations: { [locationId]: 'discovered', qingstone_town: 'discovered', qingxia_market: 'discovered', blackwind_mountain: 'discovered' } },
    flags: { ...base.flags, location_knowledge_initialized: true },
    identity: { ...base.identity, spiritRootId: 'metal-single', talentIds: [] },
    cultivation: {
      realm: 'qi',
      stage: 5,
      practiceInitialized: true,
      knownTechniqueIds: ['xiaozhoutian_tuna'],
      mainTechniqueId: 'xiaozhoutian_tuna',
    },
  }
  const inventory = resolveInventoryInitialization(state)
  if (!inventory.applied) throw new Error(inventory.reason)
  state = inventory.state
  return state
}

function addTreatmentItems(state: GameState, quantities: Partial<Record<'zhixue_san' | 'qingdu_san' | 'yangmai_dan', number>> = {}): GameState {
  let next = state
  for (const [itemId, quantity] of Object.entries(quantities)) {
    if (!quantity) continue
    const added = addItem(next, itemId, quantity)
    if (!added.applied) throw new Error(added.reason)
    next = added.state
  }
  return next
}

function mildPoison(state: GameState): GameState {
  const applied = resolveApplyPoisonCondition(state, 'bishui_venom')
  if (!applied.applied) throw new Error(applied.reason)
  return applied.state
}

function seriousPoison(state: GameState): GameState {
  return mildPoison(mildPoison(state))
}

function secretRealmRuntime() {
  return {
    sunkenVeinChamber: {
      anchorSublocationId: 'sub:blackwind_mountain:1',
      discovered: true,
      active: false,
      currentNodeId: null,
      gateOpened: false,
      gateMethod: null,
      coreLockedBehindPlayer: false,
      cleared: false,
      nodeClaims: { herbBed: false, sideRoom: false, core: false },
      knowledge: { ventSequence: false, mineIncidentEvidence: false },
      pendingMaterials: {},
      rewards: { herbBed: {}, sideRoom: {}, core: {}, coreSpiritStones: 8 },
      encounter: 'unresolved' as const,
    },
  }
}

describe('R21 injury, poison, and treatment loop', () => {
  it('keeps poison absent from old states and preserves the old no-poison time path', () => {
    const state = adultState('r21-old-state')
    expect(state.poison).toBeUndefined()
    const advanced = advanceWorldTime(state, 3)
    expect(advanced.elapsedDays).toBe(3)
    expect(advanced.state.worldDay).toBe(state.worldDay + 3)
    expect(advanced.state.poison).toBeUndefined()
  })

  it('applies Bishui venom as mild, worsens at day 10, and kills at day 20 when untreated', () => {
    let state = mildPoison(adultState('r21-poison-clock'))
    expect(getActivePoison(state, 'bishui_venom')).toMatchObject({ severity: 'mild', appliedDay: 0, nextWorsenDay: 10 })
    state = advanceWorldTime(state, 9).state
    expect(getActivePoison(state, 'bishui_venom')?.severity).toBe('mild')
    state = advanceWorldTime(state, 1).state
    expect(getActivePoison(state, 'bishui_venom')).toMatchObject({ severity: 'serious', nextWorsenDay: 20 })
    state = advanceWorldTime(state, 9).state
    expect(state.status).toBe('playing')
    state = advanceWorldTime(state, 1).state
    expect(state.status).toBe('dead')
    expect(state.worldDay).toBe(20)
    expect(state.endReason).toContain('碧水蛇毒')
    expect(state.chronicle.at(-1)?.title).toBe('毒发身亡')
  })

  it('upgrades repeated mild exposure immediately but never creates a third layer or refreshes serious poison', () => {
    let state = mildPoison(adultState('r21-repeat'))
    state = advanceWorldTime(state, 3).state
    state = mildPoison(state)
    expect(getActivePoison(state, 'bishui_venom')).toMatchObject({ severity: 'serious', nextWorsenDay: 13 })
    state = advanceWorldTime(state, 2).state
    const before = getActivePoison(state, 'bishui_venom')
    const reapplied = resolveApplyPoisonCondition(state, 'bishui_venom')
    expect(reapplied.applied).toBe(true)
    expect(getActivePoison(reapplied.state, 'bishui_venom')).toEqual(before)
  })

  it('stops long time advancement at the actual poison death day instead of jumping to the requested end', () => {
    const state = mildPoison(adultState('r21-long-action'))
    const result = advanceWorldTime(state, 30)
    expect(result.state.status).toBe('dead')
    expect(result.state.worldDay).toBe(20)
    expect(result.elapsedDays).toBe(20)
  })

  it('lets Qingdu San clear mild poison, but serious poison needs two real doses', () => {
    let state = addTreatmentItems(mildPoison(adultState('r21-qingdu-mild')), { qingdu_san: 1 })
    let treated = resolveUseTreatmentItem(state, 'qingdu_san')
    expect(treated.applied).toBe(true)
    expect(hasActivePoison(treated.state)).toBe(false)
    expect(getInventoryQuantity(treated.state, 'qingdu_san')).toBe(0)

    state = addTreatmentItems(seriousPoison(adultState('r21-qingdu-serious')), { qingdu_san: 2 })
    treated = resolveUseTreatmentItem(state, 'qingdu_san')
    expect(treated.applied).toBe(true)
    expect(getActivePoison(treated.state, 'bishui_venom')).toMatchObject({ severity: 'mild', nextWorsenDay: state.worldDay + 10 })
    expect(getInventoryQuantity(treated.state, 'qingdu_san')).toBe(1)
    treated = resolveUseTreatmentItem(treated.state, 'qingdu_san')
    expect(treated.applied).toBe(true)
    expect(hasActivePoison(treated.state)).toBe(false)
    expect(getInventoryQuantity(treated.state, 'qingdu_san')).toBe(0)
  })

  it('uses Zhixue San once per external injury and never consumes it on an invalid meridian target', () => {
    let state = adultState('r21-zhixue')
    state = addInjuries(state, 'test', [
      { kind: 'light', recoveryDays: 10 },
      { kind: 'severe', recoveryDays: 45 },
      { kind: 'meridian', recoveryDays: 90 },
    ])
    state = addTreatmentItems(state, { zhixue_san: 3 })
    const [light, severe, meridian] = getActiveInjuries(state)

    let treated = resolveUseTreatmentItem(state, 'zhixue_san', light.id)
    expect(treated.applied).toBe(true)
    expect(getActiveInjuries(treated.state).find((injury) => injury.id === light.id)?.recoveryDay).toBe(3)
    expect(getInventoryQuantity(treated.state, 'zhixue_san')).toBe(2)
    const repeated = resolveUseTreatmentItem(treated.state, 'zhixue_san', light.id)
    expect(repeated.applied).toBe(false)
    expect(repeated.reason).toBe('INJURY_ALREADY_TREATED_BY_ITEM')
    expect(getInventoryQuantity(repeated.state, 'zhixue_san')).toBe(2)

    treated = resolveUseTreatmentItem(treated.state, 'zhixue_san', severe.id)
    expect(getActiveInjuries(treated.state).find((injury) => injury.id === severe.id)?.recoveryDay).toBe(40)
    const invalid = resolveUseTreatmentItem(treated.state, 'zhixue_san', meridian.id)
    expect(invalid.applied).toBe(false)
    expect(invalid.reason).toBe('ZHIXUE_SAN_REQUIRES_EXTERNAL_INJURY')
    expect(getInventoryQuantity(invalid.state, 'zhixue_san')).toBe(1)
  })

  it('uses Yangmai Dan once per meridian injury and shortens 90 days to 60 without touching severe injury', () => {
    let state = adultState('r21-yangmai')
    state = addInjuries(state, 'test', [{ kind: 'severe', recoveryDays: 90 }, { kind: 'meridian', recoveryDays: 90 }])
    state = addTreatmentItems(state, { yangmai_dan: 2 })
    const severe = getActiveInjuries(state).find((injury) => injury.kind === 'severe')!
    const meridian = getActiveInjuries(state).find((injury) => injury.kind === 'meridian')!
    const treated = resolveUseTreatmentItem(state, 'yangmai_dan', meridian.id)
    expect(treated.applied).toBe(true)
    expect(getActiveInjuries(treated.state).find((injury) => injury.id === meridian.id)?.recoveryDay).toBe(60)
    expect(getActiveInjuries(treated.state).find((injury) => injury.id === severe.id)?.recoveryDay).toBe(90)
    const repeat = resolveUseTreatmentItem(treated.state, 'yangmai_dan', meridian.id)
    expect(repeat.applied).toBe(false)
    expect(getInventoryQuantity(repeat.state, 'yangmai_dan')).toBe(1)
  })

  it('extends an already active combat severe injury by 15 days with a 90-day remaining cap', () => {
    let state = addInjuries(adultState('r21-severe-extension'), 'first', [{ kind: 'severe', recoveryDays: 45 }])
    state = addOrExtendCombatSevereInjury(state, 'second')
    expect(getActiveInjuries(state).filter((injury) => injury.kind === 'severe')).toHaveLength(1)
    expect(getActiveInjuries(state)[0].recoveryDay).toBe(60)
    state = addOrExtendCombatSevereInjury(state, 'third')
    state = addOrExtendCombatSevereInjury(state, 'fourth')
    state = addOrExtendCombatSevereInjury(state, 'fifth')
    expect(getActiveInjuries(state)[0].recoveryDay).toBe(90)
    state = addOrExtendCombatSevereInjury(state, 'sixth')
    expect(getActiveInjuries(state)[0].recoveryDay).toBe(90)
  })

  it('keeps light injury and mild poison cultivation penalties at one 0.90 multiplier rather than multiplying twice', () => {
    const healthy = adultState('r21-cultivation')
    const healthyPreview = calculateCultivationPreview(healthy, 'xiaozhoutian_tuna', 10)!
    const light = addInjuries(healthy, 'light', [{ kind: 'light', recoveryDays: 10 }])
    const lightPreview = calculateCultivationPreview(light, 'xiaozhoutian_tuna', 10)!
    const both = mildPoison(light)
    const bothPreview = calculateCultivationPreview(both, 'xiaozhoutian_tuna', 10)!
    expect(lightPreview.gain).toBeLessThan(healthyPreview.gain)
    expect(bothPreview.gain).toBe(lightPreview.gain)
    expect(bothPreview.factors.some((factor) => factor.label === '轻伤与轻度中毒影响' && factor.multiplier === 0.9)).toBe(true)
  })

  it('blocks new wilderness exploration for severe injury or serious poison, while meridian injury remains explorable', () => {
    const wilderness = adultState('r21-explore', 'blackwind_mountain')
    const severe = addInjuries(wilderness, 'severe', [{ kind: 'severe', recoveryDays: 45 }])
    expect(resolveRegionExploration(severe, 1).reason).toBe('SEVERE_INJURY_BLOCKS_EXPLORATION')
    const serious = seriousPoison(wilderness)
    expect(resolveRegionExploration(serious, 1).reason).toBe('SERIOUS_POISON_BLOCKS_EXPLORATION')
    const meridian = addInjuries(wilderness, 'meridian', [{ kind: 'meridian', recoveryDays: 45 }])
    expect(resolveRegionExploration(meridian, 1).applied).toBe(true)
  })

  it('does not award exploration progress after poison kills the character during the action', () => {
    let state = adultState('r21-explore-death', 'blackwind_mountain')
    state = {
      ...state,
      poison: { conditions: { bishui_venom: { family: 'bishui_venom', severity: 'serious', appliedDay: 0, nextWorsenDay: 3 } } },
    }
    const result = resolveRegionExploration(state, 10)
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(false)
    expect(result.state.status).toBe('dead')
    expect(result.state.worldDay).toBe(3)
    expect(result.state.exploration).toBeUndefined()
  })

  it('allows poisoned travel toward safety but stops before arrival when the poison deadline is reached en route', () => {
    let state = adultState('r21-travel-death', 'qingxia_market')
    state = {
      ...state,
      poison: { conditions: { bishui_venom: { family: 'bishui_venom', severity: 'serious', appliedDay: 0, nextWorsenDay: 1 } } },
    }
    const result = resolveTravel(state, 'qingstone_town')
    expect(result.applied).toBe(true)
    expect(result.arrived).toBe(false)
    expect(result.state.status).toBe('dead')
    expect(result.state.worldDay).toBe(1)
    expect(result.state.world.currentLocationId).toBe('qingxia_market')
  })

  it('applies the stronger severe HP penalty, independent meridian Qi penalty, and serious-poison HP penalty at combat start', () => {
    let state = adultState('r21-combat-penalties')
    state = addInjuries(state, 'injuries', [{ kind: 'severe', recoveryDays: 45 }, { kind: 'meridian', recoveryDays: 45 }])
    state = seriousPoison(state)
    let started = applyGameAction(state, { type: 'START_COMBAT', opponentId: 'greenback-wolf', source: 'field' })
    expect(started.applied).toBe(true)
    expect(started.state.combat?.player).toMatchObject({ maxHP: 98, maxQi: 65, baseAttack: 18 })

    const poisonOnly = seriousPoison(adultState('r21-combat-poison-only'))
    started = applyGameAction(poisonOnly, { type: 'START_COMBAT', opponentId: 'greenback-wolf', source: 'field' })
    expect(started.state.combat?.player.maxHP).toBe(119)
    expect(started.state.combat?.player.maxQi).toBe(100)
  })

  it('blocks both major breakthroughs while any poison remains active', () => {
    let foundation: GameState = {
      ...adultState('r21-foundation-poison'),
      cultivation: { realm: 'qi', stage: 9, practiceInitialized: true, knownTechniqueIds: ['xiaozhoutian_tuna'], mainTechniqueId: 'xiaozhoutian_tuna' },
      resources: { spiritStones: 0, cultivation: 1000 },
    }
    foundation = mildPoison(foundation)
    const preview = calculateFoundationBreakthroughPreview(foundation, { usePozhangDan: false, useNingjiDan: false, spiritStoneInvestment: 0 })
    expect(preview?.canAttempt).toBe(false)
    expect(preview?.blockReason).toBe('POISON_BLOCKS_FOUNDATION')

    let golden: GameState = {
      ...adultState('r21-golden-poison'),
      cultivation: { realm: 'foundation', stage: 4, practiceInitialized: true, knownTechniqueIds: ['guiyuan_shouyi'], mainTechniqueId: 'guiyuan_shouyi' },
      resources: { spiritStones: 0, cultivation: 1000 },
    }
    golden = mildPoison(golden)
    const result = resolveGoldenCoreBreakthrough(golden, { route: 'standard', useBaoyuanDan: false, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 0 })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('POISON_BLOCKS_GOLDEN_CORE')
  })

  it('blocks only new secret-realm entry for severe injury or serious poison', () => {
    const base = { ...adultState('r21-secret', 'blackwind_mountain'), secretRealm: secretRealmRuntime() }
    const severeState = addInjuries(base, 'severe', [{ kind: 'severe', recoveryDays: 45 }])
    const severeSession: GameSession = { state: severeState, debugLog: [], pendingResult: null, pendingAction: null }
    expect(executeSessionCommand(severeSession, { type: 'secret-realm', action: 'enter' }).reason).toBe('SEVERE_INJURY_BLOCKS_SECRET_REALM')

    const seriousState = seriousPoison(base)
    const seriousSession: GameSession = { state: seriousState, debugLog: [], pendingResult: null, pendingAction: null }
    expect(executeSessionCommand(seriousSession, { type: 'secret-realm', action: 'enter' }).reason).toBe('SERIOUS_POISON_BLOCKS_SECRET_REALM')
  })

  it('lets recuperation advance injury recovery while poison continues to worsen and can still kill', () => {
    let state = addInjuries(mildPoison(adultState('r21-rest')), 'light', [{ kind: 'light', recoveryDays: 10 }])
    const ten = resolveRecuperateDays(state, 10)
    expect(ten.applied).toBe(true)
    expect(ten.completed).toBe(true)
    expect(getActiveInjuries(ten.state)).toHaveLength(0)
    expect(getActivePoison(ten.state, 'bishui_venom')?.severity).toBe('serious')

    state = mildPoison(adultState('r21-rest-death'))
    const thirty = resolveRecuperateDays(state, 30)
    expect(thirty.applied).toBe(true)
    expect(thirty.completed).toBe(false)
    expect(thirty.state.status).toBe('dead')
    expect(thirty.state.worldDay).toBe(20)
  })

  it('deep-clones poison and treatment metadata on save/reload while old saves remain legal', () => {
    let state = addInjuries(mildPoison(adultState('r21-save')), 'light', [{ kind: 'light', recoveryDays: 10 }])
    state = addTreatmentItems(state, { zhixue_san: 1 })
    const injuryId = getActiveInjuries(state)[0].id
    state = resolveUseTreatmentItem(state, 'zhixue_san', injuryId).state
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
    expect(loaded?.poison).toEqual(state.poison)
    expect(loaded?.poison).not.toBe(state.poison)
    expect(loaded?.injuries?.conditions[0].treatmentKeys).toEqual(['zhixue_san'])
    expect(loaded?.injuries?.conditions[0].treatmentKeys).not.toBe(state.injuries?.conditions[0].treatmentKeys)
  })

  it('logs poison and treatment as deterministic SessionCommands for replay', () => {
    const state = addTreatmentItems(adultState('r21-session'), { qingdu_san: 1 })
    const initial: GameSession = { state, debugLog: [], pendingResult: null, pendingAction: null }
    const run = () => {
      const poisoned = executeSessionCommand(initial, { type: 'apply-poison-condition', family: 'bishui_venom' })
      expect(poisoned.applied).toBe(true)
      const treated = executeSessionCommand(poisoned.session, { type: 'use-treatment-item', itemId: 'qingdu_san' })
      expect(treated.applied).toBe(true)
      return treated.session
    }
    const first = run()
    const second = run()
    expect(first.debugLog.map((entry) => entry.effectTypes)).toEqual([['health:apply-poison'], ['health:treatment']])
    expect(first.debugLog.map((entry) => entry.command)).toEqual(second.debugLog.map((entry) => entry.command))
    expect(getGameStateDigest(first.state)).toBe(getGameStateDigest(second.state))
  })
})
