const ZERO_STATE_FALLBACK = 0x6d2b79f5
const UINT32_RANGE = 0x1_0000_0000

function normalizeState(state: number): number {
  const normalized = state >>> 0
  return normalized === 0 ? ZERO_STATE_FALLBACK : normalized
}

export function seedToState(seed: string): number {
  let hash = 0x811c9dc5

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return normalizeState(hash)
}

export interface RandomStep {
  value: number
  nextState: number
}

export function nextRandom(state: number): RandomStep {
  let nextState = normalizeState(state)

  nextState ^= nextState << 13
  nextState ^= nextState >>> 17
  nextState ^= nextState << 5
  nextState >>>= 0

  nextState = normalizeState(nextState)

  return {
    value: nextState / UINT32_RANGE,
    nextState,
  }
}

export function randomInt(
  state: number,
  minInclusive: number,
  maxInclusive: number,
): { value: number; nextState: number } {
  if (!Number.isSafeInteger(minInclusive) || !Number.isSafeInteger(maxInclusive)) {
    throw new RangeError('randomInt bounds must be safe integers')
  }

  if (maxInclusive < minInclusive) {
    throw new RangeError('maxInclusive must be greater than or equal to minInclusive')
  }

  const step = nextRandom(state)
  const span = maxInclusive - minInclusive + 1

  return {
    value: minInclusive + Math.floor(step.value * span),
    nextState: step.nextState,
  }
}
