import { describe, expect, it } from 'vitest'
import { R16_TECHNIQUES } from '../data/techniques'
import type { GameState } from '../types/game'
import type { GameSession, PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import {
  calculateCultivationGain,
  calculateCultivationPreview,
  getEffectiveSpiritRootMultiplier,
  performBasicCultivation,
  resolveCultivateDays,
  resolveCultivationInitialization,
  resolveMainTechniqueSelection,
} from './cultivationEngine'
import { createInitialGameState } from './gameState'
import { executeSessionCommand } from './sessionEngine'
import { getGameStateDigest } from './stateDigest'
import { DAYS_PER_YEAR } from './timeEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function adultState(seed = 'r16-base', methodSeed: string | null = 'xiaozhoutian_tuna', rootId = 'single_fire'): GameState {
  const base = createInitialGameState({ runSeed: seed })
  return {
    ...base,
    lifeStage: 'adult',
    worldDay: 16 * DAYS_PER_YEAR,
    adultEntry: {
      optionIds: ['test-a', 'test-b'],
      selectedOptionId: 'test-a',
      resolved: true,
      originLocationSeed: 'qingxia_market',
      startingLocationSeed: 'qingxia_market',
    },
    identity: { ...base.identity, spiritRootId: rootId },
    flags: methodSeed ? { cultivation_method_access_seed: methodSeed, adult_entry_resolved: true, location_knowledge_initialized: true } : { adult_entry_resolved: true, location_knowledge_initialized: true },
    world: { currentLocationId: 'qingxia_market' },
  }
}

function initializedState(seed = 'r16-initialized', methodSeed: string | null = 'xiaozhoutian_tuna', rootId = 'single_fire') {
  const result = resolveCultivationInitialization(adultState(seed, methodSeed, rootId))
  if (!result.applied) throw new Error(`cultivation init failed: ${result.reason}`)
  return result.state
}

function practicingState(seed = 'r16-practice', techniqueId = 'xiaozhoutian_tuna') {
  let state = initializedState(seed)
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(techniqueId)) {
    state = { ...state, cultivation: { ...state.cultivation, knownTechniqueIds: [...(state.cultivation.knownTechniqueIds ?? []), techniqueId] } }
  }
  const selected = resolveMainTechniqueSelection(state, techniqueId)
  if (!selected.applied) throw new Error(`main technique failed: ${selected.reason}`)
  return selected.state
}

describe('legacy cultivation engine compatibility', () => {
  it('uses stats, spirit root and realm factor for deterministic cultivation gain', () => {
    const base = createInitialGameState({ runSeed: 'cultivation' })
    const cultivator: GameState = {
      ...base,
      identity: { ...base.identity, spiritRootId: 'three' },
      cultivation: { realm: 'qi', stage: 1 },
    }
    expect(calculateCultivationGain(cultivator)).toBe(50)
    const result = performBasicCultivation(cultivator)
    expect(result.applied).toBe(true)
    expect(result.gain).toBe(50)
    expect(result.state.worldDay).toBe(DAYS_PER_YEAR)
    expect(result.state.resources.cultivation).toBe(50)
  })

  it('automatically advances small qi stages and carries leftover cultivation', () => {
    const base = createInitialGameState({ runSeed: 'small-stage' })
    const cultivator: GameState = {
      ...base,
      identity: { ...base.identity, spiritRootId: 'special' },
      cultivation: { realm: 'qi', stage: 1 },
      resources: { ...base.resources, cultivation: 90 },
    }
    const result = performBasicCultivation(cultivator)
    expect(result.gain).toBe(69)
    expect(result.state.cultivation.stage).toBe(2)
    expect(result.state.resources.cultivation).toBe(59)
  })

  it('supports the preset reformed-root flag without changing the original birth id', () => {
    const base = createInitialGameState({ runSeed: 'reformed-root' })
    const cultivator: GameState = {
      ...base,
      identity: { ...base.identity, spiritRootId: 'none' },
      flags: { reformed_spirit_root_multiplier: 0.7 },
      cultivation: { realm: 'qi', stage: 1 },
    }
    expect(getEffectiveSpiritRootMultiplier(cultivator)).toBe(0.7)
    expect(calculateCultivationGain(cultivator)).toBeGreaterThan(0)
  })

  it('does not let a mortal use the legacy cultivation action', () => {
    const state = createInitialGameState({ runSeed: 'mortal-cannot-cultivate' })
    const result = performBasicCultivation(state)
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('NOT_A_CULTIVATOR')
    expect(result.state).toBe(state)
  })
})

describe('R16 formal basic cultivation', () => {
  it('bootstraps once without time or RNG changes and maps only real R07 method seeds', () => {
    const before = adultState('r16-bootstrap')
    const result = resolveCultivationInitialization(before)
    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(before.worldDay)
    expect(result.state.rngState).toBe(before.rngState)
    expect(result.state.cultivation.knownTechniqueIds).toEqual(['xiaozhoutian_tuna'])
    expect(resolveCultivationInitialization(result.state).reason).toBe('CULTIVATION_ALREADY_INITIALIZED')
    expect(resolveCultivationInitialization(adultState('r16-qingyun', 'qingyuan_yinqi')).state.cultivation.knownTechniqueIds).toEqual(['qingyuan_yinqi'])
    expect(resolveCultivationInitialization(adultState('r16-xie', 'xie_basic_qi_method')).state.cultivation.knownTechniqueIds).toEqual(['xiaozhoutian_tuna'])
    expect(resolveCultivationInitialization(adultState('r16-lu', 'lu_basic_qi_method')).state.cultivation.knownTechniqueIds).toEqual(['xiaozhoutian_tuna'])
    const accessOnly = adultState('r16-access-only', null)
    accessOnly.flags.adult_access_seed = 'wandering_cultivator_contact'
    expect(resolveCultivationInitialization(accessOnly).state.cultivation.knownTechniqueIds).toEqual([])
  })

  it('uses exactly the six frozen R16 technique definitions', () => {
    expect(R16_TECHNIQUES.map((entry) => entry.name)).toEqual([
      '《小周天吐纳法》', '《青元引气诀》', '《春木养元功》', '《赤阳诀》', '《寒水经》', '《厚土养气篇》',
    ])
  })

  it('rejects ordinary practice without a spirit root or a genuinely known main technique', () => {
    const noRoot = initializedState('r16-no-root', 'xiaozhoutian_tuna', 'none')
    expect(resolveMainTechniqueSelection(noRoot, 'xiaozhoutian_tuna').reason).toBe('NO_SPIRIT_ROOT')
    expect(resolveCultivateDays(noRoot, 10).reason).toBe('NO_SPIRIT_ROOT')
    const noMethod = initializedState('r16-no-method', null)
    expect(resolveMainTechniqueSelection(noMethod, 'xiaozhoutian_tuna').reason).toBe('TECHNIQUE_NOT_KNOWN')
  })

  it('distinguishes elemental affinity and only applies frozen cultivation traits', () => {
    const fire = practicingState('r16-affinity-fire', 'chiyang_jue')
    const waterRoot = { ...fire, identity: { ...fire.identity, spiritRootId: 'single_water' } }
    expect(calculateCultivationPreview(fire, 'chiyang_jue', 10)!.gain).toBeGreaterThan(calculateCultivationPreview(waterRoot, 'chiyang_jue', 10)!.gain)

    const still = { ...fire, identity: { ...fire.identity, talentIds: ['still_mind'] } }
    expect(calculateCultivationPreview(still, 'chiyang_jue', 3)!.gain).toBe(calculateCultivationPreview(fire, 'chiyang_jue', 3)!.gain)
    expect(calculateCultivationPreview(still, 'chiyang_jue', 10)!.gain).toBeGreaterThan(calculateCultivationPreview(fire, 'chiyang_jue', 10)!.gain)

    const redYang = { ...fire, identity: { ...fire.identity, physiqueIds: ['red_yang_body'] } }
    expect(calculateCultivationPreview(redYang, 'chiyang_jue', 10)!.gain).toBeGreaterThan(calculateCultivationPreview(fire, 'chiyang_jue', 10)!.gain)
    const unrelated = { ...fire, identity: { ...fire.identity, physiqueIds: ['hundred_herbs_body'] } }
    expect(calculateCultivationPreview(unrelated, 'chiyang_jue', 10)!.gain).toBe(calculateCultivationPreview(fire, 'chiyang_jue', 10)!.gain)
  })

  it('uses qiDensity without rewarding wilderness danger or giving visitors Qingyun core high multiplier', () => {
    const state = practicingState('r16-environment')
    const market = calculateCultivationPreview(state, 'xiaozhoutian_tuna', 10)!.gain
    expect(calculateCultivationPreview({ ...state, world: { currentLocationId: 'blackwind_mountain' } }, 'xiaozhoutian_tuna', 10)!.gain).toBe(market)
    expect(calculateCultivationPreview({ ...state, world: { currentLocationId: 'beast_ridge' } }, 'xiaozhoutian_tuna', 10)!.gain).toBe(market)
    expect(calculateCultivationPreview({ ...state, world: { currentLocationId: 'qingyun_sect' } }, 'xiaozhoutian_tuna', 10)!.gain).toBe(market)
    expect(calculateCultivationPreview({ ...state, identity: { ...state.identity, faction: 'qingyun' }, world: { currentLocationId: 'qingyun_sect' } }, 'xiaozhoutian_tuna', 10)!.gain).toBeGreaterThan(market)
  })

  it('advances 1/3/10/30 days deterministically using the same preview calculation', () => {
    for (const days of [1, 3, 10, 30] as const) {
      const state = practicingState(`r16-days-${days}`)
      const result = resolveCultivateDays(state, days)
      expect(result.applied).toBe(true)
      expect(result.state.worldDay).toBe(state.worldDay + days)
      expect(result.state.rngState).toBe(state.rngState)
      expect(result.gainApplied).toBe(calculateCultivationPreview(state, 'xiaozhoutian_tuna', days)!.gain)
    }
  })

  it('enters qi naturally, preserves overflow, crosses small layers, and only chronicles first entry', () => {
    let mortal = practicingState('r16-enter-qi')
    mortal = { ...mortal, resources: { ...mortal.resources, cultivation: 995 } }
    const entered = resolveCultivateDays(mortal, 3)
    expect(entered.enteredQi).toBe(true)
    expect(entered.state.cultivation.realm).toBe('qi')
    expect(entered.state.cultivation.stage).toBe(1)
    expect(entered.state.chronicle.filter((entry) => entry.sourceId === 'cultivation-entered-qi')).toHaveLength(1)

    let qi = practicingState('r16-cross-layer')
    qi = { ...qi, cultivation: { ...qi.cultivation, realm: 'qi', stage: 2 }, resources: { ...qi.resources, cultivation: 990 } }
    const crossed = resolveCultivateDays(qi, 30)
    expect(crossed.state.cultivation.stage).toBe(3)
    expect(crossed.state.resources.cultivation).toBeGreaterThan(0)
    expect(crossed.state.chronicle).toHaveLength(qi.chronicle.length)
  })

  it('caps qi nine at 100% and refuses further ordinary cultivation without auto-foundation', () => {
    let state = practicingState('r16-qi9-cap')
    state = { ...state, cultivation: { ...state.cultivation, realm: 'qi', stage: 9 }, resources: { ...state.resources, cultivation: 990 } }
    const capped = resolveCultivateDays(state, 30)
    expect(capped.state.cultivation.realm).toBe('qi')
    expect(capped.state.cultivation.stage).toBe(9)
    expect(capped.state.resources.cultivation).toBe(1000)
    expect(resolveCultivateDays(capped.state, 1).reason).toBe('QI_NINE_COMPLETE')
  })

  it('prioritizes natural death during cultivation and does not apply cultivation afterward', () => {
    let state = practicingState('r16-natural-death')
    state = { ...state, worldDay: state.identity.birthDay + 80 * DAYS_PER_YEAR - 1, resources: { ...state.resources, cultivation: 500 } }
    const result = resolveCultivateDays(state, 3)
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(false)
    expect(result.state.status).toBe('dead')
    expect(result.state.endReason).toBe('寿元耗尽')
    expect(result.state.resources.cultivation).toBe(500)
    expect(result.outcome).toBeUndefined()
  })

  it('persists and deep-clones known technique ids', () => {
    const state = practicingState('r16-save')
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
    expect(loaded?.cultivation).toEqual(state.cultivation)
    expect(loaded?.cultivation.knownTechniqueIds).not.toBe(state.cultivation.knownTechniqueIds)
  })

  it('replays initialize, select and cultivate deterministically and keeps result gating explicit', () => {
    const state = adultState('r16-replay')
    const initial: GameSession = { state, debugLog: [], pendingResult: null, pendingAction: null }
    const run = () => {
      const initialized = executeSessionCommand(initial, { type: 'initialize-cultivation' })
      expect(initialized.applied).toBe(true)
      const selected = executeSessionCommand(initialized.session, { type: 'select-main-technique', techniqueId: 'xiaozhoutian_tuna' })
      expect(selected.applied).toBe(true)
      const practiced = executeSessionCommand(selected.session, { type: 'cultivate-days', days: 10 })
      expect(practiced.applied).toBe(true)
      expect(practiced.session.pendingResult?.title).toBe('闭关10日')
      expect(executeSessionCommand(practiced.session, { type: 'cultivate-days', days: 1 }).reason).toBe('RESULT_PENDING')
      return practiced.session
    }
    const first = run()
    const second = run()
    expect(first.debugLog.map((entry) => entry.command)).toEqual(second.debugLog.map((entry) => entry.command))
    expect(getGameStateDigest(first.state)).toBe(getGameStateDigest(second.state))
  })
})
