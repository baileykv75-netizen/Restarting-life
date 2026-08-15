import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import type { FoundationBreakthroughOptions, FoundationFailureSeverity } from './foundationBreakthroughEngine'
import type { GameSession, PersistentGame, ResolvedOutcome } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { calculateCultivationPreview, resolveCultivateDays } from './cultivationEngine'
import {
  calculateFoundationBreakthroughPreview,
  resolveFoundationBreakthrough,
} from './foundationBreakthroughEngine'
import { createInitialGameState } from './gameState'
import { addInjuries, getActiveInjuries, resolveRecuperateDays } from './injuryEngine'
import { nextRandom } from './rng'
import { executeSessionCommand } from './sessionEngine'
import { getGameStateDigest } from './stateDigest'
import { DAYS_PER_YEAR } from './timeEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const NO_PREP: FoundationBreakthroughOptions = {
  usePozhangDan: false,
  useNingjiDan: false,
  spiritStoneInvestment: 0,
}

function foundationReadyState(seed = 'r18-base'): GameState {
  const base = createInitialGameState({ runSeed: seed })
  return {
    ...base,
    lifeStage: 'adult',
    worldDay: 16 * DAYS_PER_YEAR,
    adultEntry: {
      optionIds: ['test'],
      selectedOptionId: 'test',
      resolved: true,
      originLocationSeed: 'qingxia_market',
      startingLocationSeed: 'qingxia_market',
    },
    identity: {
      ...base.identity,
      spiritRootId: 'single_fire',
      faction: 'loose',
      talentIds: [],
      physiqueIds: [],
    },
    resources: { spiritStones: 500, cultivation: 1000 },
    cultivation: {
      realm: 'qi',
      stage: 9,
      practiceInitialized: true,
      knownTechniqueIds: ['xiaozhoutian_tuna'],
      mainTechniqueId: 'xiaozhoutian_tuna',
      techniqueSystemInitialized: true,
      auxiliaryTechniqueIds: [],
      techniquePractice: { xiaozhoutian_tuna: { proficiencyPoints: 0 } },
    },
    world: { currentLocationId: 'qingxia_market' },
    inventory: {
      stacks: {},
      baseCapacitySlots: 12,
      storageBagItemId: null,
    },
    flags: { location_knowledge_initialized: true },
  }
}

function withPills(state: GameState): GameState {
  if (!state.inventory) throw new Error('fixture inventory missing')
  return {
    ...state,
    inventory: {
      ...state.inventory,
      stacks: {
        ...state.inventory.stacks,
        pozhang_dan: { itemId: 'pozhang_dan', quantity: 2 },
        ningji_dan: { itemId: 'ningji_dan', quantity: 2 },
      },
    },
  }
}

function findRngState(
  successPercent: number,
  wanted: 'success' | FoundationFailureSeverity,
  extremeDeath?: boolean,
): number {
  for (let state = 1; state < 250_000; state += 1) {
    const first = nextRandom(state)
    const succeeds = first.value < successPercent / 100
    if (wanted === 'success') {
      if (succeeds) return state
      continue
    }
    if (succeeds) continue

    const second = nextRandom(first.nextState)
    const p = second.value * 100
    const distribution = successPercent >= 70
      ? { light: 65, severe: 30 }
      : successPercent >= 45
        ? { light: 50, severe: 38 }
        : { light: 35, severe: 45 }
    const severity: FoundationFailureSeverity = p < distribution.light
      ? 'light'
      : p < distribution.light + distribution.severe
        ? 'severe'
        : 'extreme'
    if (severity !== wanted) continue
    if (wanted !== 'extreme' || extremeDeath === undefined) return state

    const third = nextRandom(second.nextState)
    if ((third.value < 0.5) === extremeDeath) return state
  }
  throw new Error(`unable to find rng state for ${wanted}`)
}

function runForced(
  wanted: 'success' | FoundationFailureSeverity,
  extremeDeath?: boolean,
  options: FoundationBreakthroughOptions = NO_PREP,
) {
  let state = foundationReadyState(`r18-${wanted}-${String(extremeDeath)}`)
  const preview = calculateFoundationBreakthroughPreview(state, options)
  if (!preview) throw new Error('preview missing')
  state = { ...state, rngState: findRngState(preview.successPercent, wanted, extremeDeath) }
  return resolveFoundationBreakthrough(state, options)
}

function dummyResult(): ResolvedOutcome {
  return { title: '待确认结果', narrative: '', changes: [], consequence: null }
}

describe('R18 foundation breakthrough and injury runtime', () => {
  it('keeps pre-R18 states valid without materializing an empty injury store', () => {
    const state = foundationReadyState('r18-no-injury-field')
    expect(state.injuries).toBeUndefined()
    expect(getActiveInjuries(state)).toEqual([])
    expect(calculateFoundationBreakthroughPreview(state, NO_PREP)?.canAttempt).toBe(true)
  })

  it('requires qi nine 100%, a real main technique, and a usable 14-day site', () => {
    const state = foundationReadyState('r18-prerequisites')
    expect(resolveFoundationBreakthrough({ ...state, resources: { ...state.resources, cultivation: 999 } }, NO_PREP).reason).toBe('QI_NINE_NOT_COMPLETE')
    expect(resolveFoundationBreakthrough({ ...state, cultivation: { ...state.cultivation, mainTechniqueId: null } }, NO_PREP).reason).toBe('NO_MAIN_TECHNIQUE')
    const beast = { ...state, world: { currentLocationId: 'beast_ridge' } }
    expect(resolveFoundationBreakthrough(beast, NO_PREP).reason).toBe('FOUNDATION_SITE_UNSAFE')
    expect(resolveFoundationBreakthrough({ ...beast, tags: [...beast.tags, 'breakthrough_shelter:beast_ridge'] }, NO_PREP).reason).not.toBe('FOUNDATION_SITE_UNSAFE')
  })

  it('uses the explicit additive success model for affinity, proficiency, stability, talent, environment and guidance', () => {
    const base = foundationReadyState('r18-preview')
    const basePreview = calculateFoundationBreakthroughPreview(base, NO_PREP)!
    expect(basePreview.successPercent).toBe(33)
    expect(basePreview.modifiers.find((entry) => entry.id === 'stable-technique')?.percent).toBe(3)

    const fireTechnique: GameState = {
      ...base,
      cultivation: {
        ...base.cultivation,
        knownTechniqueIds: ['chiyang_jue'],
        mainTechniqueId: 'chiyang_jue',
        techniquePractice: { chiyang_jue: { proficiencyPoints: 3000 } },
      },
      identity: { ...base.identity, spiritRootId: 'single_fire', talentIds: ['still_mind'] },
      flags: { ...base.flags, 'breakthrough_guidance:foundation': true },
    }
    const matched = calculateFoundationBreakthroughPreview(fireTechnique, NO_PREP)!
    expect(matched.modifiers.find((entry) => entry.id === 'affinity')?.percent).toBe(5)
    expect(matched.modifiers.find((entry) => entry.id === 'proficiency')?.percent).toBe(8)
    expect(matched.modifiers.find((entry) => entry.id === 'still-mind')?.percent).toBe(4)
    expect(matched.modifiers.find((entry) => entry.id === 'foundation-guidance')?.percent).toBe(8)

    const mismatched = calculateFoundationBreakthroughPreview(
      { ...fireTechnique, identity: { ...fireTechnique.identity, spiritRootId: 'single_water' } },
      NO_PREP,
    )!
    expect(mismatched.modifiers.find((entry) => entry.id === 'affinity')?.percent).toBe(-10)

    for (const [points, expected] of [[0, 0], [1000, 4], [3000, 8], [6000, 12]] as const) {
      const state = {
        ...base,
        cultivation: {
          ...base.cultivation,
          techniquePractice: { xiaozhoutian_tuna: { proficiencyPoints: points } },
        },
      }
      expect(calculateFoundationBreakthroughPreview(state, NO_PREP)!.modifiers.find((entry) => entry.id === 'proficiency')?.percent ?? 0).toBe(expected)
    }
  })

  it('does not let a Qingyun visitor borrow the core high-qi modifier and applies Blackwind instability separately', () => {
    const base = foundationReadyState('r18-environment')
    const market = calculateFoundationBreakthroughPreview(base, NO_PREP)!.successPercent
    const qingyunVisitor = calculateFoundationBreakthroughPreview({ ...base, world: { currentLocationId: 'qingyun_sect' } }, NO_PREP)!
    expect(qingyunVisitor.successPercent).toBe(market)
    expect(qingyunVisitor.modifiers.some((entry) => entry.label === '青云宗外围环境')).toBe(true)
    const qingyunMember = calculateFoundationBreakthroughPreview({ ...base, identity: { ...base.identity, faction: 'qingyun' }, world: { currentLocationId: 'qingyun_sect' } }, NO_PREP)!
    expect(qingyunMember.successPercent).toBe(market + 6)
    const blackwind = calculateFoundationBreakthroughPreview({ ...base, world: { currentLocationId: 'blackwind_mountain' } }, NO_PREP)!
    expect(blackwind.modifiers.find((entry) => entry.id === 'blackwind-instability')?.percent).toBe(-5)
  })

  it('requires real pills and only accepts 0/30/60 stones without partial consumption', () => {
    const base = foundationReadyState('r18-preparation')
    expect(calculateFoundationBreakthroughPreview(base, { ...NO_PREP, usePozhangDan: true })?.blockReason).toBe('POZHANG_DAN_NOT_OWNED')
    expect(calculateFoundationBreakthroughPreview(base, { ...NO_PREP, useNingjiDan: true })?.blockReason).toBe('NINGJI_DAN_NOT_OWNED')
    const pills = withPills(base)
    expect(calculateFoundationBreakthroughPreview(pills, { usePozhangDan: true, useNingjiDan: true, spiritStoneInvestment: 60 })?.modifiers.map((entry) => entry.id)).toEqual(expect.arrayContaining(['pozhang-dan', 'ningji-dan', 'stones-60']))

    const invalid = { usePozhangDan: false, useNingjiDan: false, spiritStoneInvestment: 47 } as unknown as FoundationBreakthroughOptions
    expect(resolveFoundationBreakthrough(base, invalid).reason).toBe('INVALID_SPIRIT_STONE_INVESTMENT')

    const poor = { ...pills, resources: { ...pills.resources, spiritStones: 20 } }
    const beforeInventory = poor.inventory
    const rejected = resolveFoundationBreakthrough(poor, { usePozhangDan: true, useNingjiDan: true, spiritStoneInvestment: 30 })
    expect(rejected.reason).toBe('NOT_ENOUGH_SPIRIT_STONES')
    expect(rejected.state.resources.spiritStones).toBe(20)
    expect(rejected.state.inventory).toBe(beforeInventory)
  })

  it('clamps a fully prepared normal route at 95%', () => {
    let state = withPills(foundationReadyState('r18-cap'))
    state = {
      ...state,
      identity: { ...state.identity, faction: 'qingyun', talentIds: ['still_mind'] },
      world: { currentLocationId: 'qingyun_sect' },
      flags: { ...state.flags, 'breakthrough_guidance:foundation': true },
      cultivation: {
        ...state.cultivation,
        knownTechniqueIds: ['chiyang_jue'],
        mainTechniqueId: 'chiyang_jue',
        techniquePractice: { chiyang_jue: { proficiencyPoints: 6000 } },
      },
    }
    expect(calculateFoundationBreakthroughPreview(state, { usePozhangDan: true, useNingjiDan: true, spiritStoneInvestment: 60 })?.successPercent).toBe(95)
  })

  it('exposes low/mid/high preparation failure severity distributions', () => {
    const low = calculateFoundationBreakthroughPreview(foundationReadyState('r18-severity-low'), NO_PREP)!
    expect(low.successPercent).toBeLessThan(45)
    expect(low.severity).toEqual({ light: 35, severe: 45, extreme: 20 })

    const midState = withPills(foundationReadyState('r18-severity-mid'))
    const mid = calculateFoundationBreakthroughPreview(midState, { usePozhangDan: true, useNingjiDan: false, spiritStoneInvestment: 30 })!
    expect(mid.successPercent).toBeGreaterThanOrEqual(45)
    expect(mid.successPercent).toBeLessThan(70)
    expect(mid.severity).toEqual({ light: 50, severe: 38, extreme: 12 })

    const high = calculateFoundationBreakthroughPreview(midState, { usePozhangDan: true, useNingjiDan: true, spiritStoneInvestment: 60 })!
    expect(high.successPercent).toBeGreaterThanOrEqual(70)
    expect(high.severity).toEqual({ light: 65, severe: 30, extreme: 5 })
  })

  it('consumes selected preparation, advances exactly 14 days and succeeds without granting unrelated rewards', () => {
    let state = withPills(foundationReadyState('r18-success'))
    const options: FoundationBreakthroughOptions = { usePozhangDan: true, useNingjiDan: true, spiritStoneInvestment: 60 }
    const preview = calculateFoundationBreakthroughPreview(state, options)!
    state = { ...state, rngState: findRngState(preview.successPercent, 'success') }
    const knownBefore = [...(state.cultivation.knownTechniqueIds ?? [])]
    const factionBefore = state.identity.faction
    const equipmentBefore = state.equipment
    const result = resolveFoundationBreakthrough(state, options)
    expect(result.applied).toBe(true)
    expect(result.success).toBe(true)
    expect(result.state.worldDay).toBe(state.worldDay + 14)
    expect(result.state.resources.spiritStones).toBe(440)
    expect(result.state.inventory?.stacks.pozhang_dan?.quantity).toBe(1)
    expect(result.state.inventory?.stacks.ningji_dan?.quantity).toBe(1)
    expect(result.state.cultivation.realm).toBe('foundation')
    expect(result.state.cultivation.stage).toBe(1)
    expect(result.state.resources.cultivation).toBe(0)
    expect(result.state.cultivation.knownTechniqueIds).toEqual(knownBefore)
    expect(result.state.identity.faction).toBe(factionBefore)
    expect(result.state.equipment).toBe(equipmentBefore)
    expect(result.state.chronicle.at(-1)?.sourceId).toBe('foundation-success')
  })

  it('makes natural death during the 14-day attempt take priority after preparation is consumed and before RNG', () => {
    let state = withPills(foundationReadyState('r18-natural-death'))
    state = {
      ...state,
      worldDay: state.identity.birthDay + 120 * DAYS_PER_YEAR - 5,
      rngState: 123456,
    }
    const result = resolveFoundationBreakthrough(state, { usePozhangDan: true, useNingjiDan: true, spiritStoneInvestment: 30 })
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(false)
    expect(result.state.status).toBe('dead')
    expect(result.state.endReason).toBe('寿元耗尽')
    expect(result.state.resources.spiritStones).toBe(state.resources.spiritStones - 30)
    expect(result.state.inventory?.stacks.pozhang_dan?.quantity).toBe(1)
    expect(result.state.inventory?.stacks.ningji_dan?.quantity).toBe(1)
    expect(result.state.rngState).toBe(state.rngState)
  })

  it('applies the frozen light, severe, extreme-survival and extreme-death consequences', () => {
    const light = runForced('light')
    expect(light.state.resources.cultivation).toBe(780)
    expect(getActiveInjuries(light.state).map((entry) => entry.kind)).toEqual(['light'])
    expect(getActiveInjuries(light.state)[0]?.recoveryDay - light.state.worldDay).toBe(10)

    const severe = runForced('severe')
    expect(severe.state.resources.cultivation).toBe(500)
    expect(getActiveInjuries(severe.state).map((entry) => entry.kind).sort()).toEqual(['meridian', 'severe'])
    expect(getActiveInjuries(severe.state).every((entry) => entry.recoveryDay - severe.state.worldDay === 45)).toBe(true)

    const extremeSurvivor = runForced('extreme', false)
    expect(extremeSurvivor.state.status).toBe('playing')
    expect(extremeSurvivor.state.resources.cultivation).toBe(300)
    expect(getActiveInjuries(extremeSurvivor.state).every((entry) => entry.recoveryDay - extremeSurvivor.state.worldDay === 90)).toBe(true)

    const extremeDeath = runForced('extreme', true)
    expect(extremeDeath.state.status).toBe('dead')
    expect(extremeDeath.state.endReason).toBe('筑基反噬，经脉崩裂')
  })

  it('lets light injury reduce formal R16 cultivation by 10% and lets severe/meridian injury block it until expiry', () => {
    const baseReady = foundationReadyState('r18-cultivation-injury')
    const practiceBase: GameState = {
      ...baseReady,
      cultivation: { ...baseReady.cultivation, realm: 'qi', stage: 3 },
      resources: { ...baseReady.resources, cultivation: 100 },
    }
    const healthyPreview = calculateCultivationPreview(practiceBase, 'xiaozhoutian_tuna', 30)!
    const light = addInjuries(practiceBase, 'test-light', [{ kind: 'light', recoveryDays: 10 }])
    const lightPreview = calculateCultivationPreview(light, 'xiaozhoutian_tuna', 30)!
    expect(lightPreview.gain).toBe(Math.floor(healthyPreview.gain * 0.9))

    const severe = addInjuries(practiceBase, 'test-severe', [{ kind: 'severe', recoveryDays: 45 }])
    expect(resolveCultivateDays(severe, 10).reason).toBe('INJURY_BLOCKS_CULTIVATION')
    const expired = { ...severe, worldDay: severe.worldDay + 45 }
    expect(resolveCultivateDays(expired, 10).applied).toBe(true)
  })

  it('blocks renewed foundation attempts under severe/meridian injury while light injury remains a visible negative modifier', () => {
    const base = foundationReadyState('r18-injury-breakthrough')
    const light = addInjuries(base, 'light', [{ kind: 'light', recoveryDays: 10 }])
    const lightPreview = calculateFoundationBreakthroughPreview(light, NO_PREP)!
    expect(lightPreview.canAttempt).toBe(true)
    expect(lightPreview.modifiers.find((entry) => entry.id === 'light-injury')?.percent).toBe(-8)

    const severe = addInjuries(base, 'severe', [{ kind: 'severe', recoveryDays: 45 }, { kind: 'meridian', recoveryDays: 45 }])
    expect(resolveFoundationBreakthrough(severe, NO_PREP).reason).toBe('INJURY_BLOCKS_FOUNDATION')
  })

  it('recuperates only by advancing worldDay and naturally expires conditions without adding stats/resources/cultivation', () => {
    const base = foundationReadyState('r18-recuperate')
    const injured = addInjuries(base, 'test-severe', [{ kind: 'severe', recoveryDays: 45 }, { kind: 'meridian', recoveryDays: 45 }])
    const resourcesBefore = { ...injured.resources }
    const statsBefore = { ...injured.stats }
    const chronicleLength = injured.chronicle.length
    const first = resolveRecuperateDays(injured, 30)
    expect(first.applied).toBe(true)
    expect(first.state.worldDay).toBe(injured.worldDay + 30)
    expect(first.state.resources).toEqual(resourcesBefore)
    expect(first.state.stats).toEqual(statsBefore)
    expect(first.state.chronicle).toHaveLength(chronicleLength)
    expect(getActiveInjuries(first.state)).toHaveLength(2)
    const second = resolveRecuperateDays(first.state, 30)
    expect(getActiveInjuries(second.state)).toHaveLength(0)
    expect(resolveRecuperateDays(second.state, 10).reason).toBe('NO_ACTIVE_INJURY')
  })

  it('deep-clones injury conditions on save/reload', () => {
    const state = addInjuries(foundationReadyState('r18-save'), 'save-test', [{ kind: 'light', recoveryDays: 10 }])
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
    expect(loaded?.injuries).toEqual(state.injuries)
    expect(loaded?.injuries).not.toBe(state.injuries)
    expect(loaded?.injuries?.conditions).not.toBe(state.injuries?.conditions)
    expect(loaded?.injuries?.conditions[0]).not.toBe(state.injuries?.conditions[0])
  })

  it('replays foundation and recuperation commands deterministically and preserves pending-result gating', () => {
    let state = foundationReadyState('r18-replay')
    const preview = calculateFoundationBreakthroughPreview(state, NO_PREP)!
    state = { ...state, rngState: findRngState(preview.successPercent, 'light') }
    const initial: GameSession = { state, debugLog: [], pendingResult: null, pendingAction: null }
    const run = () => {
      const attempted = executeSessionCommand(initial, {
        type: 'attempt-foundation-breakthrough',
        usePozhangDan: false,
        useNingjiDan: false,
        spiritStoneInvestment: 0,
      })
      expect(attempted.applied).toBe(true)
      expect(attempted.session.pendingResult).not.toBeNull()
      expect(executeSessionCommand(attempted.session, { type: 'recuperate-days', days: 10 }).reason).toBe('RESULT_PENDING')
      const continued = executeSessionCommand(attempted.session, { type: 'continue' })
      const recuperated = executeSessionCommand(continued.session, { type: 'recuperate-days', days: 10 })
      expect(recuperated.applied).toBe(true)
      return recuperated.session
    }
    const a = run()
    const b = run()
    expect(a.debugLog.map((entry) => entry.command)).toEqual(b.debugLog.map((entry) => entry.command))
    expect(getGameStateDigest(a.state)).toBe(getGameStateDigest(b.state))

    const blocked: GameSession = { ...initial, pendingResult: dummyResult() }
    expect(executeSessionCommand(blocked, { type: 'attempt-foundation-breakthrough', usePozhangDan: false, useNingjiDan: false, spiritStoneInvestment: 0 }).reason).toBe('RESULT_PENDING')
  })
})
