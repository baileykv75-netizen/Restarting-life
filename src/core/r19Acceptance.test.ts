import { describe, expect, it } from 'vitest'
import { getCultivationTechniqueById } from '../data/techniques'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import type { GameState } from '../types/game'
import type { GameSession, PersistentGame, ResolvedOutcome } from '../types/persistence'
import { resolveCultivateDays } from './cultivationEngine'
import {
  calculateGoldenCoreBreakthroughPreview,
  resolveGoldenCoreBreakthrough,
  type GoldenCoreBreakthroughOptions,
  type GoldenCoreFailureSeverity,
} from './goldenCoreBreakthroughEngine'
import { createInitialGameState } from './gameState'
import { addInjuries, getActiveInjuries } from './injuryEngine'
import { addItem } from './inventoryEngine'
import { getEffectiveMaxLifespanYears, resolveUseLifespanItem } from './lifespanEngine'
import { nextRandom } from './rng'
import { executeSessionCommand } from './sessionEngine'
import { getGameStateDigest } from './stateDigest'
import { resolveChangeMainTechnique } from './techniqueEngine'
import { DAYS_PER_YEAR } from './timeEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function foundationState(seed: string): GameState {
  const base = createInitialGameState({ runSeed: seed })
  return {
    ...base,
    lifeStage: 'adult',
    worldDay: base.identity.birthDay + 40 * DAYS_PER_YEAR,
    adultEntry: { optionIds: ['test'], selectedOptionId: 'test', resolved: true, originLocationSeed: 'qingyun_sect', startingLocationSeed: 'qingyun_sect' },
    identity: { ...base.identity, spiritRootId: 'single_water', faction: 'qingyun', talentIds: [], physiqueIds: [] },
    resources: { spiritStones: 800, cultivation: 0 },
    world: { currentLocationId: 'qingyun_sect' },
    inventory: { stacks: {}, baseCapacitySlots: 12, storageBagItemId: null },
    cultivation: {
      realm: 'foundation', stage: 1, practiceInitialized: true,
      knownTechniqueIds: ['qingyuan_yinqi', 'qingyuan_guizhen', 'guiyuan_shouyi', 'yinsui_ningcha'],
      mainTechniqueId: 'qingyuan_guizhen', techniqueSystemInitialized: true, auxiliaryTechniqueIds: [],
      techniquePractice: { qingyuan_yinqi: { proficiencyPoints: 3000 }, qingyuan_guizhen: { proficiencyPoints: 6000 }, guiyuan_shouyi: { proficiencyPoints: 0 }, yinsui_ningcha: { proficiencyPoints: 6000 } },
    },
    flags: { location_knowledge_initialized: true },
  }
}

function goldenReady(seed: string, mainTechniqueId: 'qingyuan_guizhen' | 'yinsui_ningcha' = 'qingyuan_guizhen'): GameState {
  let state = foundationState(seed)
  state = { ...state, cultivation: { ...state.cultivation, stage: 4, mainTechniqueId }, resources: { ...state.resources, cultivation: 1000 } }
  state = addItem(state, 'baoyuan_dan', 1).state
  state = addItem(state, 'century_spirit_ginseng', 1).state
  state = addItem(state, 'complete_second_tier_beast_core', 1).state
  state = addItem(state, 'high_grade_beast_essence', 1).state
  return state
}

function severityThresholds(successPercent: number, evil: boolean) {
  const base = successPercent >= 65 ? { light: 60, severe: 32 } : successPercent >= 35 ? { light: 45, severe: 40 } : { light: 30, severe: 45 }
  return evil ? { light: base.light - 10, severe: base.severe + 5 } : base
}

function findRng(successPercent: number, wanted: 'success' | GoldenCoreFailureSeverity, evil = false, extremeDeath?: boolean): number {
  for (let state = 1; state < 400_000; state += 1) {
    const first = nextRandom(state)
    const success = first.value < successPercent / 100
    if (wanted === 'success') { if (success) return state; continue }
    if (success) continue
    const second = nextRandom(first.nextState)
    const thresholds = severityThresholds(successPercent, evil)
    const p = second.value * 100
    const severity: GoldenCoreFailureSeverity = p < thresholds.light ? 'light' : p < thresholds.light + thresholds.severe ? 'severe' : 'extreme'
    if (severity !== wanted) continue
    if (wanted !== 'extreme' || extremeDeath === undefined) return state
    const third = nextRandom(second.nextState)
    if ((third.value < 0.6) === extremeDeath) return state
  }
  throw new Error(`rng not found: ${wanted}`)
}

function findFailureWindow(successPercent: number, minSeverityRoll: number, maxSeverityRoll: number): number {
  for (let state = 1; state < 400_000; state += 1) {
    const first = nextRandom(state)
    if (first.value < successPercent / 100) continue
    const second = nextRandom(first.nextState)
    const p = second.value * 100
    if (p >= minSeverityRoll && p < maxSeverityRoll) return state
  }
  throw new Error('risk-shift rng not found')
}

function dummyResult(): ResolvedOutcome { return { title: '待确认', narrative: '', changes: [], consequence: null } }

describe('R19 acceptance coverage', () => {
  it('freezes the three exact foundation efficiencies without filling pending low-realm techniques', () => {
    expect(getCultivationTechniqueById('qingyuan_guizhen')?.baseEfficiency).toBe(1.05)
    expect(getCultivationTechniqueById('guiyuan_shouyi')?.baseEfficiency).toBe(1)
    expect(getCultivationTechniqueById('yinsui_ningcha')?.baseEfficiency).toBe(1.1)
    expect(getCultivationTechniqueById('gengjin_ruili')).toBeUndefined()
  })

  it('advances foundation 1→2→3→4, reuses injury blocking, and stops at perfection 100%', () => {
    let state = foundationState('r19-foundation-progression')
    for (const nextStage of [2, 3, 4] as const) {
      state = { ...state, resources: { ...state.resources, cultivation: 990 } }
      const result = resolveCultivateDays(state, 30)
      expect(result.applied).toBe(true)
      expect(result.state.cultivation.stage).toBe(nextStage)
      expect(result.state.cultivation.techniquePractice?.qingyuan_guizhen?.proficiencyPoints).toBeGreaterThanOrEqual(state.cultivation.techniquePractice?.qingyuan_guizhen?.proficiencyPoints ?? 0)
      state = result.state
    }
    state = { ...state, resources: { ...state.resources, cultivation: 1000 } }
    expect(resolveCultivateDays(state, 10).reason).toBe('FOUNDATION_COMPLETE')
    const injured = addInjuries(foundationState('r19-foundation-injury'), 'test', [{ kind: 'meridian', recoveryDays: 30 }])
    expect(resolveCultivateDays(injured, 10).reason).toBe('INJURY_BLOCKS_CULTIVATION')
  })

  it('persists the yinsui -10 once across switching away and back', () => {
    const state = foundationState('r19-yinsui-repeat')
    const first = resolveChangeMainTechnique(state, 'yinsui_ningcha')
    expect(first.state.lifespan?.permanentPenaltyKeys).toEqual(['lifespan_penalty:yinsui_ningcha_entry'])
    expect(getEffectiveMaxLifespanYears(first.state)).toBe(210)
    const away = resolveChangeMainTechnique(first.state, 'qingyuan_guizhen')
    const back = resolveChangeMainTechnique(away.state, 'yinsui_ningcha')
    expect(back.state.lifespan?.permanentPenaltyKeys).toEqual(['lifespan_penalty:yinsui_ningcha_entry'])
    expect(getEffectiveMaxLifespanYears(back.state)).toBe(210)
  })

  it('deep-clones lifespan state through save/load', () => {
    const state = { ...foundationState('r19-save'), lifespan: { appliedEffectKeys: ['lifespan_effect:yanyuan_dan'], permanentPenaltyKeys: ['lifespan_penalty:yinsui_ningcha_entry'] } }
    const persistent: PersistentGame = { schemaVersion: 3, phase: 'life', currentSession: { state, debugLog: [], pendingResult: null, pendingAction: null }, pendingBirthSelection: null, archives: [], meta: { totalRuns: 1 } }
    const storage = new MemoryStorage(); savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.lifespan).toEqual(state.lifespan)
    expect(loaded?.lifespan).not.toBe(state.lifespan)
    expect(loaded?.lifespan?.appliedEffectKeys).not.toBe(state.lifespan.appliedEffectKeys)
    expect(loaded?.lifespan?.permanentPenaltyKeys).not.toBe(state.lifespan.permanentPenaltyKeys)
  })

  it('uses the same real century ginseng for either recovery or lifespan, never both', () => {
    let state = goldenReady('r19-ginseng-exclusive')
    const options: GoldenCoreBreakthroughOptions = { route: 'standard', useBaoyuanDan: false, useCenturySpiritGinsengForRecovery: true, spiritStoneInvestment: 0 }
    const preview = calculateGoldenCoreBreakthroughPreview(state, options)!
    state = { ...state, rngState: findRng(preview.successPercent, 'severe') }
    const failed = resolveGoldenCoreBreakthrough(state, options)
    expect(failed.state.inventory?.stacks.century_spirit_ginseng).toBeUndefined()
    expect(getActiveInjuries(failed.state)[0]!.recoveryDay - failed.state.worldDay).toBe(203)
    const lifespan = resolveUseLifespanItem({ ...failed.state, injuries: undefined }, 'century_spirit_ginseng')
    expect(lifespan.applied).toBe(false)
    expect(lifespan.reason).toBe('LIFESPAN_ITEM_NOT_OWNED')
  })

  it('forces seeded ordinary success to golden core with finite 450-year base and no unrelated grants', () => {
    let state = goldenReady('r19-golden-success')
    const options: GoldenCoreBreakthroughOptions = { route: 'standard', useBaoyuanDan: true, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 400 }
    const preview = calculateGoldenCoreBreakthroughPreview(state, options)!
    state = { ...state, rngState: findRng(preview.successPercent, 'success') }
    const known = [...(state.cultivation.knownTechniqueIds ?? [])]
    const result = resolveGoldenCoreBreakthrough(state, options)
    expect(result.success).toBe(true)
    expect(result.state.worldDay).toBe(state.worldDay + 60)
    expect(result.state.cultivation).toMatchObject({ realm: 'golden_core', stage: 0 })
    expect(result.state.resources.cultivation).toBe(0)
    expect(getEffectiveMaxLifespanYears(result.state)).toBe(450)
    expect(result.state.cultivation.knownTechniqueIds).toEqual(known)
    expect(result.state.inventory?.stacks.baoyuan_dan).toBeUndefined()
  })

  it('locks light/severe/extreme-survival/extreme-death consequences and ginseng changes recovery only', () => {
    const options: GoldenCoreBreakthroughOptions = { route: 'standard', useBaoyuanDan: false, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 0 }
    for (const [severity, stage, cultivation, recovery] of [['light', 3, 800, 90], ['severe', 2, 500, 270]] as const) {
      let state = goldenReady(`r19-${severity}`)
      const chance = calculateGoldenCoreBreakthroughPreview(state, options)!.successPercent
      state = { ...state, rngState: findRng(chance, severity) }
      const result = resolveGoldenCoreBreakthrough(state, options)
      expect(result.severity).toBe(severity); expect(result.state.cultivation.stage).toBe(stage); expect(result.state.resources.cultivation).toBe(cultivation)
      expect(getActiveInjuries(result.state).every((injury) => injury.recoveryDay - result.state.worldDay === recovery)).toBe(true)
    }
    let survivor = goldenReady('r19-extreme-survive'); const chance = calculateGoldenCoreBreakthroughPreview(survivor, options)!.successPercent; survivor = { ...survivor, rngState: findRng(chance, 'extreme', false, false) }
    const survived = resolveGoldenCoreBreakthrough(survivor, options); expect(survived.state.status).toBe('playing'); expect(survived.state.cultivation.stage).toBe(1); expect(survived.state.resources.cultivation).toBe(300); expect(getActiveInjuries(survived.state).every((injury) => injury.recoveryDay - survived.state.worldDay === 540)).toBe(true)
    let death = goldenReady('r19-extreme-death'); death = { ...death, rngState: findRng(calculateGoldenCoreBreakthroughPreview(death, options)!.successPercent, 'extreme', false, true) }
    const died = resolveGoldenCoreBreakthrough(death, options); expect(died.state.status).toBe('dead'); expect(died.state.endReason).toBe('结丹反噬，丹田崩裂')
  })

  it('locks the evil failure shift: mid-tier 45/40/15 becomes 35/45/20', () => {
    const normalOptions: GoldenCoreBreakthroughOptions = { route: 'standard', useBaoyuanDan: false, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 0 }
    const evilOptions: GoldenCoreBreakthroughOptions = { ...normalOptions, route: 'evil' }
    const base = goldenReady('r19-risk-base', 'yinsui_ningcha')
    const chance = calculateGoldenCoreBreakthroughPreview(base, normalOptions)!.successPercent
    expect(chance).toBeGreaterThanOrEqual(35); expect(chance).toBeLessThan(65)

    const lightToSevereRng = findFailureWindow(chance, 35, 45)
    const normalLight = resolveGoldenCoreBreakthrough({ ...goldenReady('r19-risk-normal-light', 'yinsui_ningcha'), rngState: lightToSevereRng }, normalOptions)
    const evilSevere = resolveGoldenCoreBreakthrough({ ...goldenReady('r19-risk-evil-severe', 'yinsui_ningcha'), rngState: lightToSevereRng }, evilOptions)
    expect(normalLight.severity).toBe('light'); expect(evilSevere.severity).toBe('severe')

    const severeToExtremeRng = findFailureWindow(chance, 80, 85)
    const normalSevere = resolveGoldenCoreBreakthrough({ ...goldenReady('r19-risk-normal-severe', 'yinsui_ningcha'), rngState: severeToExtremeRng }, normalOptions)
    const evilExtreme = resolveGoldenCoreBreakthrough({ ...goldenReady('r19-risk-evil-extreme', 'yinsui_ningcha'), rngState: severeToExtremeRng }, evilOptions)
    expect(normalSevere.severity).toBe('severe'); expect(evilExtreme.severity).toBe('extreme')
  })

  it('consumes evil resources and stacks successful -20 with the existing yinsui -10', () => {
    let state = goldenReady('r19-evil-success', 'yinsui_ningcha')
    state = { ...state, lifespan: { appliedEffectKeys: [], permanentPenaltyKeys: ['lifespan_penalty:yinsui_ningcha_entry'] } }
    const options: GoldenCoreBreakthroughOptions = { route: 'evil', useBaoyuanDan: false, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 400 }
    const preview = calculateGoldenCoreBreakthroughPreview(state, options)!
    state = { ...state, rngState: findRng(preview.successPercent, 'success', true) }
    const result = resolveGoldenCoreBreakthrough(state, options)
    expect(result.success).toBe(true)
    expect(result.state.inventory?.stacks.complete_second_tier_beast_core).toBeUndefined()
    expect(result.state.inventory?.stacks.high_grade_beast_essence).toBeUndefined()
    expect(result.state.lifespan?.permanentPenaltyKeys).toEqual(expect.arrayContaining(['lifespan_penalty:yinsui_ningcha_entry', 'lifespan_penalty:evil_core_success']))
    expect(getEffectiveMaxLifespanYears(result.state)).toBe(420)
  })

  it('keeps both new Session commands deterministic and RESULT_PENDING-gated', () => {
    let lifespanState = foundationState('r19-session-life'); lifespanState = addItem(lifespanState, 'yanyuan_dan', 1).state
    const lifespanSession: GameSession = { state: lifespanState, debugLog: [], pendingResult: null, pendingAction: null }
    const lifeA = executeSessionCommand(lifespanSession, { type: 'use-lifespan-item', itemId: 'yanyuan_dan' }); const lifeB = executeSessionCommand(lifespanSession, { type: 'use-lifespan-item', itemId: 'yanyuan_dan' })
    expect(lifeA.session.debugLog.at(-1)?.effectTypes).toEqual(['lifespan:use-item']); expect(getGameStateDigest(lifeA.session.state)).toBe(getGameStateDigest(lifeB.session.state))
    expect(executeSessionCommand({ ...lifespanSession, pendingResult: dummyResult() }, { type: 'use-lifespan-item', itemId: 'yanyuan_dan' }).reason).toBe('RESULT_PENDING')

    let goldState = goldenReady('r19-session-gold'); const options: GoldenCoreBreakthroughOptions = { route: 'standard', useBaoyuanDan: false, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 0 }; const chance = calculateGoldenCoreBreakthroughPreview(goldState, options)!.successPercent; goldState = { ...goldState, rngState: findRng(chance, 'light') }
    const goldSession: GameSession = { state: goldState, debugLog: [], pendingResult: null, pendingAction: null }
    const command = { type: 'attempt-golden-core-breakthrough' as const, ...options }
    const goldA = executeSessionCommand(goldSession, command); const goldB = executeSessionCommand(goldSession, command)
    expect(goldA.session.debugLog.at(-1)?.effectTypes).toEqual(['cultivation:golden-core-breakthrough']); expect(getGameStateDigest(goldA.session.state)).toBe(getGameStateDigest(goldB.session.state)); expect(goldA.session.pendingResult).not.toBeNull()
    expect(executeSessionCommand({ ...goldSession, pendingResult: dummyResult() }, command).reason).toBe('RESULT_PENDING')
  })
})
