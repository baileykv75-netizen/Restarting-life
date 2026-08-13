import { describe, expect, it } from 'vitest'
import { BACKGROUNDS } from '../data/backgrounds'
import { SPIRIT_ROOTS } from '../data/spiritRoots'
import { TALENTS } from '../data/talents'
import { generateBirthState, PLAYABLE_START_AGE_YEARS } from './birthEngine'
import { MONTHS_PER_YEAR } from './timeEngine'

describe('birth engine', () => {
  it('produces exactly the same birth from the same seed', () => {
    const first = generateBirthState({ runSeed: 'same-life-seed' })
    const second = generateBirthState({ runSeed: 'same-life-seed' })

    expect(first).toEqual(second)
  })

  it('starts a real playable life at age sixteen', () => {
    const state = generateBirthState({ runSeed: 'playable-start' })
    expect(state.timeMonths).toBe(PLAYABLE_START_AGE_YEARS * MONTHS_PER_YEAR)
    expect(PLAYABLE_START_AGE_YEARS).toBe(16)
  })

  it('produces two unique talents from the fixed content table', () => {
    const state = generateBirthState({ runSeed: 'two-talents' })

    expect(state.identity.talentIds).toHaveLength(2)
    expect(new Set(state.identity.talentIds).size).toBe(2)

    for (const talentId of state.identity.talentIds) {
      expect(TALENTS.some((talent) => talent.id === talentId)).toBe(true)
    }
  })

  it('only emits valid background and spirit-root IDs and matching root tags', () => {
    for (let index = 0; index < 100; index += 1) {
      const state = generateBirthState({ runSeed: `valid-content-${index}` })

      expect(
        BACKGROUNDS.some((item) => item.id === state.identity.backgroundId),
      ).toBe(true)
      expect(
        SPIRIT_ROOTS.some((item) => item.id === state.identity.spiritRootId),
      ).toBe(true)
      expect(state.tags).toContain(`spirit_root:${state.identity.spiritRootId}`)

      if (state.identity.spiritRootId === 'none') {
        expect(state.tags).toContain('no_spirit_root')
        expect(state.tags).not.toContain('has_spirit_root')
      } else {
        expect(state.tags).toContain('has_spirit_root')
        expect(state.tags).not.toContain('no_spirit_root')
      }
    }
  })

  it('keeps every generated starting stat at one or above', () => {
    for (let index = 0; index < 200; index += 1) {
      const state = generateBirthState({ runSeed: `stat-safety-${index}` })

      for (const value of Object.values(state.stats)) {
        expect(value).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('changes births across a sample of different seeds', () => {
    const signatures = new Set(
      Array.from({ length: 20 }, (_, index) => {
        const state = generateBirthState({ runSeed: `variety-${index}` })
        return JSON.stringify({
          background: state.identity.backgroundId,
          root: state.identity.spiritRootId,
          talents: state.identity.talentIds,
          stats: state.stats,
        })
      }),
    )

    expect(signatures.size).toBeGreaterThan(1)
  })
})
