import { describe, expect, it } from 'vitest'
import { performBasicCultivation } from './cultivationEngine'
import { createInitialGameState } from './gameState'

describe('minimal cultivation engine', () => {
  it('advances one year and grants fixed stage-1 cultivation', () => {
    const base = createInitialGameState({ runSeed: 'cultivation' })
    const cultivator = {
      ...base,
      cultivation: {
        ...base.cultivation,
        realm: 'qi' as const,
        stage: 1,
      },
    }

    const result = performBasicCultivation(cultivator)

    expect(result.applied).toBe(true)
    expect(result.state.timeMonths).toBe(12)
    expect(result.state.resources.cultivation).toBe(55)
    expect(result.state.status).toBe('playing')
  })

  it('does not let a mortal use the cultivation action', () => {
    const state = createInitialGameState({ runSeed: 'mortal-cannot-cultivate' })
    const result = performBasicCultivation(state)

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('NOT_A_CULTIVATOR')
    expect(result.state).toBe(state)
  })
})
