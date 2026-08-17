import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import { calculateCultivationPreview, resolveCultivateDays } from './cultivationEngine'
import { createInitialGameState } from './gameState'
import { calculateGoldenCoreBreakthroughPreview, resolveGoldenCoreBreakthrough } from './goldenCoreBreakthroughEngine'
import { addItem } from './inventoryEngine'
import { getEffectiveMaxLifespanYears, resolveUseLifespanItem } from './lifespanEngine'
import { getMainTechniqueChangePreview, resolveChangeMainTechnique } from './techniqueEngine'
import { DAYS_PER_YEAR } from './timeEngine'

function foundationState(seed = 'r19-foundation'): GameState {
  const base = createInitialGameState({ runSeed: seed })
  return {
    ...base,
    lifeStage: 'adult',
    identity: { ...base.identity, spiritRootId: 'single_water', faction: 'qingyun' },
    world: { currentLocationId: 'qingyun_sect' },
    inventory: { stacks: {}, baseCapacitySlots: 12, storageBagItemId: null },
    cultivation: {
      realm: 'foundation',
      stage: 1,
      practiceInitialized: true,
      knownTechniqueIds: ['qingyuan_yinqi', 'qingyuan_guizhen', 'guiyuan_shouyi', 'yinsui_ningcha'],
      mainTechniqueId: 'qingyuan_guizhen',
      techniqueSystemInitialized: true,
      auxiliaryTechniqueIds: [],
      techniquePractice: {
        qingyuan_guizhen: { proficiencyPoints: 3000 },
        guiyuan_shouyi: { proficiencyPoints: 0 },
        yinsui_ningcha: { proficiencyPoints: 3000 },
      },
    },
  }
}

describe('R19 lifespan and foundation cultivation', () => {
  it('uses a lifespan item once and does not consume a duplicate', () => {
    let state = foundationState('r19-lifespan')
    state = addItem(state, 'yanyuan_dan', 2).state
    const first = resolveUseLifespanItem(state, 'yanyuan_dan')
    expect(first.applied).toBe(true)
    expect(first.state.inventory?.stacks.yanyuan_dan?.quantity).toBe(1)
    expect(getEffectiveMaxLifespanYears(first.state)).toBe(230)
    const second = resolveUseLifespanItem(first.state, 'yanyuan_dan')
    expect(second.applied).toBe(false)
    expect(second.reason).toBe('LIFESPAN_EFFECT_ALREADY_APPLIED')
    expect(second.state.inventory?.stacks.yanyuan_dan?.quantity).toBe(1)
  })

  it('allows a frozen foundation technique and blocks a low-realm main technique', () => {
    const state = foundationState('r19-cultivation')
    const preview = calculateCultivationPreview(state, 'qingyuan_guizhen', 10)
    expect(preview).not.toBeNull()
    expect(preview?.factors.some((factor) => factor.label === '筑基阶段积累')).toBe(true)
    const cultivated = resolveCultivateDays(state, 30)
    expect(cultivated.applied).toBe(true)
    expect(cultivated.gainApplied).toBeGreaterThan(0)

    const low = { ...state, cultivation: { ...state.cultivation, mainTechniqueId: 'qingyuan_yinqi' } }
    const blocked = resolveCultivateDays(low, 10)
    expect(blocked.applied).toBe(false)
    expect(blocked.reason).toBe('MAIN_TECHNIQUE_REALM_UNSUPPORTED')
  })

  it('applies the yinsui entry penalty once and previews the resulting lifespan', () => {
    const state = foundationState('r19-yinsui')
    const preview = getMainTechniqueChangePreview(state, 'yinsui_ningcha')
    expect(preview?.permanentLifespanPenaltyYears).toBe(10)
    expect(preview?.effectiveMaxLifespanYearsAfter).toBe(210)
    const changed = resolveChangeMainTechnique(state, 'yinsui_ningcha')
    expect(changed.applied).toBe(true)
    expect(changed.state.lifespan?.permanentPenaltyKeys).toEqual(['lifespan_penalty:yinsui_ningcha_entry'])
    expect(getEffectiveMaxLifespanYears(changed.state)).toBe(210)
    const back = resolveChangeMainTechnique(changed.state, 'qingyuan_guizhen')
    expect(back.applied).toBe(true)
    const again = resolveChangeMainTechnique(back.state, 'yinsui_ningcha')
    expect(again.applied).toBe(true)
    expect(again.state.lifespan?.permanentPenaltyKeys).toHaveLength(1)
  })
})

describe('R19 golden core', () => {
  function readyState(seed: string): GameState {
    let state = foundationState(seed)
    state = {
      ...state,
      resources: { spiritStones: 500, cultivation: 1000 },
      cultivation: {
        ...state.cultivation,
        stage: 4,
        mainTechniqueId: 'qingyuan_guizhen',
        techniquePractice: { ...state.cultivation.techniquePractice, qingyuan_guizhen: { proficiencyPoints: 6000 } },
      },
    }
    state = addItem(state, 'baoyuan_dan', 1).state
    state = addItem(state, 'century_spirit_ginseng', 1).state
    return state
  }

  it('shows the exact capped preview and consumes only selected real resources', () => {
    const state = readyState('r19-golden-preview')
    const options = { route: 'standard' as const, useBaoyuanDan: true, useCenturySpiritGinsengForRecovery: true, spiritStoneInvestment: 400 as const }
    const preview = calculateGoldenCoreBreakthroughPreview(state, options)
    expect(preview?.successPercent).toBeLessThanOrEqual(90)
    expect(preview?.modifiers.some((modifier) => modifier.label === '抱元丹' && modifier.percent === 25)).toBe(true)
    const result = resolveGoldenCoreBreakthrough(state, options)
    expect(result.applied).toBe(true)
    expect(result.state.resources.spiritStones).toBe(100)
    expect(result.state.inventory?.stacks.baoyuan_dan).toBeUndefined()
    expect(result.state.inventory?.stacks.century_spirit_ginseng).toBeUndefined()
  })

  it('consumes preparation but does not draw RNG when lifespan ends during the 60 days', () => {
    const original = readyState('r19-golden-lifespan')
    const state = { ...original, worldDay: 220 * DAYS_PER_YEAR - 30 }
    const rngBefore = state.rngState
    const result = resolveGoldenCoreBreakthrough(state, { route: 'standard', useBaoyuanDan: true, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 200 })
    expect(result.applied).toBe(true)
    expect(result.completed).toBe(false)
    expect(result.state.status).toBe('dead')
    expect(result.state.rngState).toBe(rngBefore)
    expect(result.state.resources.spiritStones).toBe(300)
    expect(result.state.inventory?.stacks.baoyuan_dan).toBeUndefined()
  })

  it('requires real evil-route resources and rejects baoyuan on the evil route', () => {
    const base = readyState('r19-evil')
    const yinsui = { ...base, cultivation: { ...base.cultivation, mainTechniqueId: 'yinsui_ningcha' } }
    const invalid = calculateGoldenCoreBreakthroughPreview(yinsui, { route: 'evil', useBaoyuanDan: true, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 0 })
    expect(invalid).toBeNull()
    const missing = resolveGoldenCoreBreakthrough(yinsui, { route: 'evil', useBaoyuanDan: false, useCenturySpiritGinsengForRecovery: false, spiritStoneInvestment: 0 })
    expect(missing.applied).toBe(false)
    expect(missing.reason).toBe('COMPLETE_SECOND_TIER_BEAST_CORE_NOT_OWNED')
  })
})
