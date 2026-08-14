import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './gameState'

describe('GameState', () => {
  it('creates a deterministic neutral V3 state with the minimum V2 migration fields', () => {
    const first = createInitialGameState({ runSeed: 'same-seed' })
    const second = createInitialGameState({ runSeed: 'same-seed' })

    expect(first).toEqual(second)
    expect(first.schemaVersion).toBe(3)
    expect(first.status).toBe('playing')
    expect(first.lifeStage).toBe('legacy-adult')
    expect(first.worldDay).toBe(0)
    expect(first.identity.birthDay).toBe(0)
    expect(first.identity.physiqueIds).toEqual([])
    expect(first.world.currentLocationId).toBeNull()
    expect(first.knowledge.locations).toEqual({})
    expect(first.cultivation.realm).toBe('mortal')
    expect(first.resources.cultivation).toBe(0)
  })

  it('rejects an empty run seed', () => {
    expect(() => createInitialGameState({ runSeed: '   ' })).toThrow(
      'runSeed must not be empty',
    )
  })
})
