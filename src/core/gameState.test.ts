import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './gameState'

describe('GameState', () => {
  it('creates a deterministic neutral V2 state', () => {
    const first = createInitialGameState({ runSeed: 'same-seed' })
    const second = createInitialGameState({ runSeed: 'same-seed' })

    expect(first).toEqual(second)
    expect(first.schemaVersion).toBe(2)
    expect(first.status).toBe('playing')
    expect(first.worldDay).toBe(0)
    expect(first.identity.birthDay).toBe(0)
    expect(first.cultivation.realm).toBe('mortal')
    expect(first.resources.cultivation).toBe(0)
  })

  it('rejects an empty run seed', () => {
    expect(() => createInitialGameState({ runSeed: '   ' })).toThrow(
      'runSeed must not be empty',
    )
  })
})
