import { describe, expect, it } from 'vitest'
import type { GameAction } from '../types/gameAction'
import { createInitialGameState } from './gameState'
import { applyGameAction } from './gameActionReducer'
import { DAYS_PER_YEAR } from './timeEngine'

describe('GameAction reducer', () => {
  it('applies the minimal V2 state actions immutably', () => {
    const initial = createInitialGameState({ runSeed: 'game-actions' })
    const flag = applyGameAction(initial, { type: 'SET_FLAG', key: 'met_elder', value: true })
    expect(flag.applied).toBe(true)
    expect(flag.state.flags.met_elder).toBe(true)
    expect(initial.flags.met_elder).toBeUndefined()

    const stage = applyGameAction(flag.state, { type: 'SET_LIFE_STAGE', stage: 'adult' })
    expect(stage.state.lifeStage).toBe('adult')
    const located = applyGameAction(stage.state, { type: 'SET_CURRENT_LOCATION', locationId: 'qingxia_market' })
    expect(located.state.world.currentLocationId).toBe('qingxia_market')

    const rumored = applyGameAction(located.state, { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'blackwind_mountain', status: 'rumored' })
    expect(rumored.state.knowledge.locations.blackwind_mountain).toBe('rumored')
    const discovered = applyGameAction(rumored.state, { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'blackwind_mountain', status: 'discovered' })
    expect(discovered.state.knowledge.locations.blackwind_mountain).toBe('discovered')

    const removed = applyGameAction(discovered.state, { type: 'REMOVE_FLAG', key: 'met_elder' })
    expect(removed.applied).toBe(true)
    expect(removed.state.flags.met_elder).toBeUndefined()
  })

  it('rejects invalid inputs and unknown fixed-world ids without partially modifying state', () => {
    const initial = createInitialGameState({ runSeed: 'invalid-game-actions' })
    const invalidActions: GameAction[] = [
      { type: 'ADVANCE_TIME', days: 0 },
      { type: 'ADVANCE_TIME', days: 1.5 },
      { type: 'SET_FLAG', key: '   ', value: true },
      { type: 'REMOVE_FLAG', key: 'missing' },
      { type: 'SET_CURRENT_LOCATION', locationId: '   ' },
      { type: 'SET_LOCATION_KNOWLEDGE', locationId: '   ', status: 'rumored' },
      { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'not_a_real_location', status: 'rumored' },
    ]
    for (const action of invalidActions) {
      const result = applyGameAction(initial, action)
      expect(result.applied).toBe(false)
      expect(result.state).toBe(initial)
    }
  })

  it('never downgrades discovered location knowledge back to rumored', () => {
    const initial = createInitialGameState({ runSeed: 'knowledge-order' })
    const discovered = applyGameAction(initial, { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'qingxia_market', status: 'discovered' })
    const downgraded = applyGameAction(discovered.state, { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'qingxia_market', status: 'rumored' })
    expect(downgraded.applied).toBe(false)
    expect(downgraded.reason).toBe('LOCATION_KNOWLEDGE_CANNOT_DOWNGRADE')
    expect(downgraded.state.knowledge.locations.qingxia_market).toBe('discovered')
  })

  it('advances the one world clock and preserves natural death resolution', () => {
    const initial = createInitialGameState({ runSeed: 'natural-death-action' })
    const nearDeath = { ...initial, worldDay: initial.identity.birthDay + 80 * DAYS_PER_YEAR - 1 }
    const result = applyGameAction(nearDeath, { type: 'ADVANCE_TIME', days: 1 })
    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(initial.identity.birthDay + 80 * DAYS_PER_YEAR)
    expect(result.state.status).toBe('dead')
    expect(result.state.endReason).toBe('寿元耗尽')
  })

  it('rejects all V2 state actions after the life has ended', () => {
    const initial = createInitialGameState({ runSeed: 'ended-action' })
    const ended = { ...initial, status: 'dead' as const, endReason: '测试结束' }
    const result = applyGameAction(ended, { type: 'SET_FLAG', key: 'afterlife', value: true })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('GAME_ENDED')
    expect(result.state).toBe(ended)
  })
})
