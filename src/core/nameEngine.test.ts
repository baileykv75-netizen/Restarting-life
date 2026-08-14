import { describe, expect, it } from 'vitest'
import { generateBirthState } from './birthEngine'
import { deriveCharacterName, getCharacterDisplayName } from './nameEngine'

describe('character names', () => {
  it('derives a stable name without consuming gameplay RNG', () => {
    expect(deriveCharacterName('same-seed')).toBe(deriveCharacterName('same-seed'))
    expect(deriveCharacterName('same-seed')).not.toBe('未命名')
  })

  it('persists the generated name on new lives', () => {
    const state = generateBirthState({ runSeed: 'named-life' })
    expect(state.identity.name).toBe(deriveCharacterName('named-life'))
  })

  it('gives old placeholder saves a deterministic display name', () => {
    expect(getCharacterDisplayName('未命名', 'legacy-life')).toBe(deriveCharacterName('legacy-life'))
  })
})
