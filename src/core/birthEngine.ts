import { BACKGROUNDS } from '../data/backgrounds'
import { SPIRIT_ROOTS } from '../data/spiritRoots'
import { TALENTS } from '../data/talents'
import type { StatModifiers } from '../types/content'
import type { GameState } from '../types/game'
import { createInitialGameState, type CreateGameStateOptions } from './gameState'
import { randomInt, weightedPick } from './rng'
import { DAYS_PER_YEAR } from './timeEngine'

const BASE_STAT_MIN = 4
const BASE_STAT_MAX = 6
export const PLAYABLE_START_AGE_YEARS = 16
export const PLAYABLE_START_AGE_DAYS = PLAYABLE_START_AGE_YEARS * DAYS_PER_YEAR

function applyStatModifiers(
  stats: GameState['stats'],
  modifiers: StatModifiers,
): GameState['stats'] {
  const nextStats = { ...stats }

  for (const [key, modifier] of Object.entries(modifiers)) {
    const statKey = key as keyof GameState['stats']
    const currentValue = nextStats[statKey]
    nextStats[statKey] = Math.max(1, currentValue + (modifier ?? 0))
  }

  return nextStats
}

function rollBaseStats(
  rngState: number,
): { stats: GameState['stats']; nextState: number } {
  let state = rngState

  const constitution = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX)
  state = constitution.nextState
  const comprehension = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX)
  state = comprehension.nextState
  const spiritSense = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX)
  state = spiritSense.nextState
  const mentality = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX)
  state = mentality.nextState
  const luck = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX)

  return {
    stats: {
      constitution: constitution.value,
      comprehension: comprehension.value,
      spiritSense: spiritSense.value,
      mentality: mentality.value,
      luck: luck.value,
    },
    nextState: luck.nextState,
  }
}

export function generateBirthState(options: CreateGameStateOptions): GameState {
  const initial = createInitialGameState(options)
  const baseStatsRoll = rollBaseStats(initial.rngState)

  const backgroundRoll = weightedPick(baseStatsRoll.nextState, BACKGROUNDS)
  const rootRoll = weightedPick(backgroundRoll.nextState, SPIRIT_ROOTS)

  const firstTalentRoll = weightedPick(rootRoll.nextState, TALENTS)
  const remainingTalents = TALENTS.filter(
    (talent) => talent.id !== firstTalentRoll.item.id,
  )
  const secondTalentRoll = weightedPick(firstTalentRoll.nextState, remainingTalents)
  const selectedTalents = [firstTalentRoll.item, secondTalentRoll.item]

  let stats = applyStatModifiers(
    baseStatsRoll.stats,
    backgroundRoll.item.statModifiers,
  )
  let spiritStones = backgroundRoll.item.spiritStones

  for (const talent of selectedTalents) {
    stats = applyStatModifiers(stats, talent.statModifiers)
    spiritStones += talent.spiritStones
  }

  const rootAvailabilityTag =
    rootRoll.item.id === 'none' ? 'no_spirit_root' : 'has_spirit_root'

  return {
    ...initial,
    worldDay: initial.identity.birthDay + PLAYABLE_START_AGE_DAYS,
    rngState: secondTalentRoll.nextState,
    identity: {
      ...initial.identity,
      backgroundId: backgroundRoll.item.id,
      spiritRootId: rootRoll.item.id,
      talentIds: selectedTalents.map((talent) => talent.id),
    },
    stats,
    resources: {
      ...initial.resources,
      spiritStones,
    },
    tags: [
      ...backgroundRoll.item.tags,
      rootAvailabilityTag,
      `spirit_root:${rootRoll.item.id}`,
    ],
  }
}
