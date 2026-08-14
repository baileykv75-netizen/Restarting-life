import type { PlayerAction } from '../types/command'
import type { Duration } from '../types/time'
import { DAYS_PER_YEAR } from '../core/timeEngine'

/**
 * Transitional Stage 3 durations for the old macro actions. Stage 6 replaces
 * explore/livelihood with concrete location activities. These values exist so
 * the fixed six-month global cadence disappears now rather than surviving
 * until the activity-system rewrite.
 */
export const ACTION_DURATIONS: Readonly<Partial<Record<PlayerAction, Duration>>> = {
  cultivate: { type: 'fixed', days: DAYS_PER_YEAR },
  explore: { type: 'range', minDays: 8, maxDays: 20 },
  livelihood: { type: 'range', minDays: 30, maxDays: 60 },
}

export function getActionDuration(action: PlayerAction): Duration | null {
  return ACTION_DURATIONS[action] ?? null
}
