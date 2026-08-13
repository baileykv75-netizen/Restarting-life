import { describe, expect, it } from 'vitest'
import { BACKGROUNDS } from './backgrounds'
import { SPIRIT_ROOTS } from './spiritRoots'
import { TALENTS } from './talents'

function expectUniqueIds(items: readonly { id: string }[]): void {
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length)
}

function expectPositiveWeights(items: readonly { weight: number }[]): void {
  for (const item of items) {
    expect(item.weight).toBeGreaterThan(0)
  }
}

describe('stage-2 content integrity', () => {
  it('locks the V1 content counts and unique IDs', () => {
    expect(BACKGROUNDS).toHaveLength(5)
    expect(SPIRIT_ROOTS).toHaveLength(6)
    expect(TALENTS).toHaveLength(10)

    expectUniqueIds(BACKGROUNDS)
    expectUniqueIds(SPIRIT_ROOTS)
    expectUniqueIds(TALENTS)
  })

  it('keeps every random content weight positive', () => {
    expectPositiveWeights(BACKGROUNDS)
    expectPositiveWeights(SPIRIT_ROOTS)
    expectPositiveWeights(TALENTS)
  })

  it('matches the locked spirit-root cultivation multipliers', () => {
    expect(SPIRIT_ROOTS.map((root) => root.cultivationMultiplier)).toEqual([
      0,
      0.7,
      0.9,
      1.05,
      1.2,
      1.25,
    ])
  })
})
