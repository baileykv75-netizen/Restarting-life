import { describe, expect, it } from 'vitest'
import { nextRandom, randomInt, seedToState, weightedPick } from './rng'

describe('seeded RNG', () => {
  it('replays the same sequence from the same seed', () => {
    const seed = 'stage-1-replay'
    let firstState = seedToState(seed)
    let secondState = seedToState(seed)
    const firstSequence: number[] = []
    const secondSequence: number[] = []

    for (let index = 0; index < 8; index += 1) {
      const firstStep = nextRandom(firstState)
      const secondStep = nextRandom(secondState)
      firstSequence.push(firstStep.value)
      secondSequence.push(secondStep.value)
      firstState = firstStep.nextState
      secondState = secondStep.nextState
    }

    expect(firstSequence).toEqual(secondSequence)
    expect(firstState).toBe(secondState)
  })

  it('keeps random values inside the requested integer range', () => {
    let state = seedToState('bounded-rolls')

    for (let index = 0; index < 100; index += 1) {
      const step = randomInt(state, 2, 6)
      expect(step.value).toBeGreaterThanOrEqual(2)
      expect(step.value).toBeLessThanOrEqual(6)
      state = step.nextState
    }
  })

  it('makes weighted choices deterministically', () => {
    const items = [
      { id: 'a', weight: 1 },
      { id: 'b', weight: 3 },
    ] as const
    const state = seedToState('weighted-choice')

    expect(weightedPick(state, items)).toEqual(weightedPick(state, items))
  })
})
