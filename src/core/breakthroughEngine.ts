import { BREAKTHROUGH_RULES, type BreakthroughRule } from '../data/realms'
import type { GameState } from '../types/game'
import type { EventCatalog } from './eventEngine'
import { getAvailableChoices, startEventById } from './eventEngine'
import { applyEffects } from './effectEngine'
import { nextRandom } from './rng'

export interface BreakthroughResult {
  state: GameState
  chance: number
  roll: number
  success: boolean
}

export function getBreakthroughRule(state: GameState): BreakthroughRule | null {
  return (
    BREAKTHROUGH_RULES.find(
      (rule) =>
        rule.fromRealm === state.cultivation.realm &&
        rule.requiredStage === state.cultivation.stage,
    ) ?? null
  )
}

export function canAttemptBreakthrough(state: GameState): boolean {
  if (state.status !== 'playing' || state.events.currentEventId !== null) {
    return false
  }

  const rule = getBreakthroughRule(state)
  if (!rule || state.resources.cultivation < rule.requiredCultivation) {
    return false
  }

  if (rule.id === 'qi_entry') {
    return (
      state.identity.spiritRootId !== '' &&
      state.identity.spiritRootId !== 'none' &&
      state.flags.has_cultivation_method === true
    )
  }

  return true
}

export function calculateBreakthroughChance(
  state: GameState,
  rule: BreakthroughRule,
): number {
  const chance =
    rule.baseChance +
    (state.stats.constitution - 5) * 0.03 +
    (state.stats.comprehension - 5) * 0.03 +
    (state.stats.mentality - 5) * 0.02

  return Math.max(0.05, Math.min(0.95, chance))
}

export function startBreakthrough(
  state: GameState,
  catalog: EventCatalog,
): GameState {
  if (!canAttemptBreakthrough(state)) {
    throw new Error('Breakthrough is not currently available')
  }

  const rule = getBreakthroughRule(state)
  if (!rule) {
    throw new Error('Missing breakthrough rule')
  }

  return startEventById(state, catalog, rule.eventId)
}

export function resolveBreakthroughAttempt(
  state: GameState,
  catalog: EventCatalog,
): BreakthroughResult {
  const rule = getBreakthroughRule(state)
  if (!rule || state.events.currentEventId !== rule.eventId) {
    throw new Error('No matching breakthrough event is active')
  }

  const event = catalog.get(rule.eventId)
  if (!event || event.category !== 'breakthrough') {
    throw new Error(`Invalid breakthrough event: ${rule.eventId}`)
  }

  const attemptChoice = getAvailableChoices(state, event).find(
    (choice) => choice.id === 'attempt',
  )
  if (!attemptChoice) {
    throw new Error(`Breakthrough attempt choice is unavailable: ${rule.eventId}`)
  }

  const chance = calculateBreakthroughChance(state, rule)
  const randomStep = nextRandom(state.rngState)
  const rolledSuccess = randomStep.value < chance

  let nextState: GameState = {
    ...state,
    rngState: randomStep.nextState,
    events: {
      ...state.events,
      currentEventId: null,
    },
  }

  if (rolledSuccess) {
    nextState = applyEffects(
      nextState,
      [
        { type: 'advanceTime', months: rule.durationMonths },
        { type: 'addCultivation', amount: -rule.requiredCultivation },
        {
          type: 'setRealm',
          realm: rule.targetRealm,
          stage: rule.targetStage,
        },
      ],
      { allowSetRealm: true },
    )
  } else {
    nextState = applyEffects(nextState, [
      { type: 'advanceTime', months: rule.durationMonths },
      { type: 'addCultivation', amount: -rule.failureCultivationLoss },
      {
        type: 'addStat',
        stat: 'constitution',
        amount: -rule.failureConstitutionLoss,
      },
    ])
  }

  return {
    state: nextState,
    chance,
    roll: randomStep.value,
    success: rolledSuccess && nextState.status !== 'dead',
  }
}
