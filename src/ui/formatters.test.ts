import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import { createInitialGameState } from '../core/gameState'
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../core/timeEngine'
import { formatAge, formatFaction, formatRealm, formatRemainingLifespan } from './formatters'

describe('UI formatters', () => {
  it('formats age, realm, faction and remaining lifespan from GameState', () => {
    const base = createInitialGameState({ runSeed: 'ui-format' })
    const state: GameState = {
      ...base,
      worldDay: 20 * DAYS_PER_YEAR + 6 * DAYS_PER_MONTH,
      identity: { ...base.identity, faction: 'qingyun' },
      cultivation: { realm: 'foundation', stage: 2 },
    }

    expect(formatAge(state.worldDay, state.identity.birthDay)).toBe('20岁6个月')
    expect(formatRealm(state)).toBe('筑基中期')
    expect(formatFaction(state)).toBe('青云宗')
    expect(formatRemainingLifespan(state)).toBe('约199年6个月')
  })
})
