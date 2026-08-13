import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import {
  calculateCultivationGain,
  getEffectiveSpiritRootMultiplier,
  performBasicCultivation,
} from './cultivationEngine'
import { createInitialGameState } from './gameState'

describe('cultivation engine', () => {
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
    expect(result.state.timeMonths).toBe(12)
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

  it('does not let a mortal use the cultivation action', () => {
    const state = createInitialGameState({ runSeed: 'mortal-cannot-cultivate' })
    const result = performBasicCultivation(state)

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('NOT_A_CULTIVATOR')
    expect(result.state).toBe(state)
  })
})
