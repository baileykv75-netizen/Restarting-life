import { describe, expect, it } from 'vitest'
import { BACKGROUNDS, getBackgroundById, LEGACY_BIRTH_BACKGROUNDS } from './backgrounds'
import { PHYSIQUES } from './physiques'
import { getSpiritRootById, LEGACY_BIRTH_SPIRIT_ROOTS, SPIRIT_ROOTS } from './spiritRoots'
import { getTalentById, LEGACY_BIRTH_TALENTS, TALENTS } from './talents'

function expectUniqueIds(items: readonly { id: string }[]): void { expect(new Set(items.map((item) => item.id)).size).toBe(items.length) }
function expectPositiveWeights(items: readonly { weight: number }[]): void { for (const item of items) expect(item.weight).toBeGreaterThan(0) }

describe('V2 content integrity', () => {
  it('locks the first-playable birth content counts and unique IDs', () => {
    expect(BACKGROUNDS).toHaveLength(8)
    expect(SPIRIT_ROOTS).toHaveLength(35)
    expect(PHYSIQUES).toHaveLength(8)
    expect(TALENTS).toHaveLength(12)
    expectUniqueIds(BACKGROUNDS); expectUniqueIds(SPIRIT_ROOTS); expectUniqueIds(PHYSIQUES); expectUniqueIds(TALENTS)
  })

  it('keeps every random content weight positive', () => {
    expectPositiveWeights(BACKGROUNDS); expectPositiveWeights(SPIRIT_ROOTS); expectPositiveWeights(PHYSIQUES); expectPositiveWeights(TALENTS)
  })

  it('keeps legacy birth IDs readable after V2 content replaces the active pools', () => {
    for (const background of LEGACY_BIRTH_BACKGROUNDS) expect(getBackgroundById(background.id)).toBeDefined()
    for (const root of LEGACY_BIRTH_SPIRIT_ROOTS) expect(getSpiritRootById(root.id)).toBeDefined()
    for (const talent of LEGACY_BIRTH_TALENTS) expect(getTalentById(talent.id)).toBeDefined()
  })

  it('keeps root multipliers ordered by normal root count while variants stay strong', () => {
    expect(getSpiritRootById('none')?.cultivationMultiplier).toBe(0)
    expect(getSpiritRootById('five')?.cultivationMultiplier).toBe(0.7)
    expect(getSpiritRootById('single_metal')?.cultivationMultiplier).toBe(1.2)
    expect(getSpiritRootById('thunder')?.cultivationMultiplier).toBeGreaterThan(1.2)
  })
})
