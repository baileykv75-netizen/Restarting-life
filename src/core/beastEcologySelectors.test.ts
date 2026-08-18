import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import { createInitialGameState } from './gameState'
import { getOrdinaryBeastEncounterWeightMultiplier } from './beastEcologySelectors'
import { getBeastPopulationKey, materializeBeastEcology } from './beastEngine'

describe('R22 ordinary beast encounter pressure weights', () => {
  it('maps canonical pressure 0/1/2/3 to 0/0.5/1/1.5 and treats missing state as baseline two', () => {
    const base: GameState = { ...createInitialGameState({ runSeed: 'r22-weight' }), lifeStage: 'adult' }
    expect(getOrdinaryBeastEncounterWeightMultiplier(base, 'beast_ridge', 'greenback_wolf')).toBe(1)

    const key = getBeastPopulationKey('beast_ridge', 'greenback_wolf')
    for (const [pressure, expected] of [[0, 0], [1, 0.5], [2, 1], [3, 1.5]] as const) {
      const materialized = materializeBeastEcology(base)
      const state: GameState = {
        ...materialized,
        beastEcology: {
          ...materialized.beastEcology!,
          populations: {
            ...materialized.beastEcology!.populations,
            [key]: { pressure, baseline: 2, lastRecoveryCheckDay: 0 },
          },
        },
      }
      expect(getOrdinaryBeastEncounterWeightMultiplier(state, 'beast_ridge', 'greenback_wolf')).toBe(expected)
    }
  })
})
