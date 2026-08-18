import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import { getBeastPopulationKey, materializeBeastEcology } from './beastEngine'
import { createInitialGameState } from './gameState'
import { getRegionRiskAssessment } from './riskAssessmentEngine'
import { getOrdinaryWildernessEncounterPool } from './wildernessEncounterEngine'

const RISK_RANK = { low: 0, manageable: 1, high: 2, extreme: 3 } as const

function adultState(locationId = 'blackwind_mountain', stage = 5): GameState {
  const base = createInitialGameState({ runSeed: `r23-risk-${locationId}-${stage}` })
  return {
    ...base,
    lifeStage: 'adult',
    cultivation: { realm: 'qi', stage },
    world: { currentLocationId: locationId },
    knowledge: { locations: { [locationId]: 'discovered' } },
    flags: { ...base.flags, location_knowledge_initialized: true },
  }
}

function equipped(state: GameState): GameState {
  return {
    ...state,
    equipment: {
      mainWeaponItemId: 'black_iron_greatsword',
      armorItemId: 'black_iron_armor',
      protectiveArtifactItemId: 'heart_guard_mirror',
      supportArtifactItemId: 'flowing_cloud_boots',
    },
    cultivation: {
      ...state.cultivation,
      knownTechniqueIds: ['liuyun_bu'],
      auxiliaryTechniqueIds: ['liuyun_bu'],
    },
  }
}

describe('R23 state-aware region risk', () => {
  it('keeps the old realm anchors while reading the real combat baseline', () => {
    const mortal = { ...adultState('beast_ridge'), cultivation: { realm: 'mortal' as const, stage: 0 } }
    expect(getRegionRiskAssessment(mortal, 'beast_ridge', 'extreme').risk).toBe('extreme')

    const foundation = { ...mortal, cultivation: { realm: 'foundation' as const, stage: 1 } }
    expect(getRegionRiskAssessment(foundation, 'beast_ridge', 'extreme').risk).toBe('manageable')
  })

  it('improves judgement when real combat equipment and movement preparation are present', () => {
    const naked = adultState('blackwind_mountain', 5)
    const nakedRisk = getRegionRiskAssessment(naked, 'blackwind_mountain', 'high')
    const preparedRisk = getRegionRiskAssessment(equipped(naked), 'blackwind_mountain', 'high')
    expect(RISK_RANK[preparedRisk.risk]).toBeLessThan(RISK_RANK[nakedRisk.risk])
    expect(preparedRisk.signals).toContain('主武器已准备')
    expect(preparedRisk.signals).toContain('护甲能提供真实减伤')
  })

  it('worsens judgement for severe injury, meridian injury, and serious poison', () => {
    const healthy = adultState('blackwind_mountain', 5)
    const healthyRank = RISK_RANK[getRegionRiskAssessment(healthy, 'blackwind_mountain', 'high').risk]
    const severe: GameState = {
      ...healthy,
      injuries: { conditions: [{ id: 'severe', kind: 'severe', sourceId: 'test', startedDay: healthy.worldDay, recoveryDay: healthy.worldDay + 30 }] },
    }
    const meridian: GameState = {
      ...healthy,
      injuries: { conditions: [{ id: 'meridian', kind: 'meridian', sourceId: 'test', startedDay: healthy.worldDay, recoveryDay: healthy.worldDay + 30 }] },
    }
    const poisoned: GameState = {
      ...healthy,
      poison: { conditions: { bishui_venom: { family: 'bishui_venom', severity: 'serious', appliedDay: healthy.worldDay, nextWorsenDay: healthy.worldDay + 10 } } },
    }
    expect(RISK_RANK[getRegionRiskAssessment(severe, 'blackwind_mountain', 'high').risk]).toBeGreaterThan(healthyRank)
    expect(RISK_RANK[getRegionRiskAssessment(meridian, 'blackwind_mountain', 'high').risk]).toBeGreaterThan(healthyRank)
    expect(RISK_RANK[getRegionRiskAssessment(poisoned, 'blackwind_mountain', 'high').risk]).toBeGreaterThan(healthyRank)
  })

  it('reads ordinary ecology pressure without inventing a second danger state', () => {
    const base = materializeBeastEcology(adultState('blackwind_mountain', 5))
    const populations = { ...base.beastEcology!.populations }
    for (const candidate of getOrdinaryWildernessEncounterPool('blackwind_mountain')) {
      populations[getBeastPopulationKey('blackwind_mountain', candidate.beastId)] = {
        pressure: 0,
        baseline: 2,
        lastRecoveryCheckDay: base.worldDay,
      }
    }
    const sparse: GameState = { ...base, beastEcology: { ...base.beastEcology!, populations } }
    const baseline = getRegionRiskAssessment(base, 'blackwind_mountain', 'high')
    const depleted = getRegionRiskAssessment(sparse, 'blackwind_mountain', 'high')
    expect(RISK_RANK[depleted.risk]).toBeLessThan(RISK_RANK[baseline.risk])
    expect(depleted.signals).toContain('这一带普通妖兽活动已经明显变稀')
  })

  it('lets known strong territory raise the judgement only after the player can know it', () => {
    const hidden = materializeBeastEcology(adultState('beast_ridge', 9))
    const before = getRegionRiskAssessment(hidden, 'beast_ridge', 'extreme')
    const discovered: GameState = {
      ...hidden,
      exploration: { locations: { beast_ridge: { locationId: 'beast_ridge', exploredDays: 15 } } },
    }
    const after = getRegionRiskAssessment(discovered, 'beast_ridge', 'extreme')
    expect(RISK_RANK[after.risk]).toBeGreaterThanOrEqual(RISK_RANK[before.risk])
    expect(before.signals.some((signal) => signal.includes('远强于外围'))).toBe(false)
    expect(after.signals.some((signal) => signal.includes('远强于外围'))).toBe(true)
  })

  it('uses danger sense as extra warning, not as a hidden stat buff', () => {
    const base = adultState('beast_ridge', 3)
    const sensed: GameState = { ...base, identity: { ...base.identity, talentIds: [...base.identity.talentIds, 'danger_sense'] } }
    const normal = getRegionRiskAssessment(base, 'beast_ridge', 'extreme')
    const warned = getRegionRiskAssessment(sensed, 'beast_ridge', 'extreme')
    expect(warned.risk).toBe(normal.risk)
    expect(warned.signals.some((signal) => signal.startsWith('危机直觉'))).toBe(true)
  })
})
