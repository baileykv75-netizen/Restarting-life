import type { Duration, ResolvedDuration } from '../types/time'
import { randomInt } from './rng'

function assertDays(days: number, label: string): void {
  if (!Number.isSafeInteger(days) || days < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`)
  }
}

export function resolveDuration(duration: Duration, rngState: number): ResolvedDuration {
  if (duration.type === 'fixed') {
    assertDays(duration.days, 'duration.days')
    return { days: duration.days, rngState }
  }

  assertDays(duration.minDays, 'duration.minDays')
  assertDays(duration.maxDays, 'duration.maxDays')
  if (duration.maxDays < duration.minDays) {
    throw new RangeError('duration.maxDays must be greater than or equal to duration.minDays')
  }

  const rolled = randomInt(rngState, duration.minDays, duration.maxDays)
  return { days: rolled.value, rngState: rolled.nextState }
}
