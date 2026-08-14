import { describe, expect, it } from 'vitest'
import type { Condition } from '../types/event'
import { createInitialGameState } from './gameState'
import { matchesAllConditions, matchesCondition } from './conditionEngine'
import { DAYS_PER_YEAR } from './timeEngine'

function createRichState() {
  const base = createInitialGameState({ runSeed: 'condition-seed' })
  return {
    ...base,
    worldDay: base.identity.birthDay + 18 * DAYS_PER_YEAR,
    identity: { ...base.identity, faction: 'qingyun' as const },
    cultivation: { realm: 'qi' as const, stage: 3 },
    stats: { ...base.stats, spiritSense: 8, luck: 4 },
    resources: { spiritStones: 12, cultivation: 150 },
    tags: ['cave_clue'],
    flags: { oath: true },
    relationships: { elder: 20 },
  }
}

describe('conditionEngine', () => {
  it('supports the full V1 condition whitelist on the day clock', () => {
    const state = createRichState()
    const conditions: Condition[] = [
      { type: 'ageMin', years: 18 },
      { type: 'ageMax', years: 18 },
      { type: 'realm', realm: 'qi' },
      { type: 'stageMin', stage: 2 },
      { type: 'stageMax', stage: 3 },
      { type: 'statMin', stat: 'spiritSense', value: 8 },
      { type: 'statMax', stat: 'luck', value: 4 },
      { type: 'hasTag', tag: 'cave_clue' },
      { type: 'notTag', tag: 'enemy_mark' },
      { type: 'flagEquals', key: 'oath', value: true },
      { type: 'flagMissing', key: 'missing_flag' },
      { type: 'faction', faction: 'qingyun' },
      { type: 'relationshipMin', id: 'elder', value: 20 },
      { type: 'resourceMin', resource: 'spiritStones', value: 12 },
    ]

    expect(matchesAllConditions(state, conditions)).toBe(true)
    expect(matchesCondition(state, { type: 'ageMin', years: 19 })).toBe(false)
  })
})
