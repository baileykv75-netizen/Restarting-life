import { BREAKTHROUGH_EVENTS } from './breakthroughEvents'
import { CHAIN_EVENTS } from './chainEvents'
import { CULTIVATION_EVENTS } from './cultivationEvents'
import { ENCOUNTER_EVENTS } from './encounterEvents'
import { EXPLORATION_EVENTS } from './explorationEvents'
import { MORTAL_EVENTS } from './mortalEvents'
import { SECT_EVENTS } from './sectEvents'

export const ORDINARY_EVENTS = [
  ...MORTAL_EVENTS,
  ...CULTIVATION_EVENTS,
  ...SECT_EVENTS,
  ...EXPLORATION_EVENTS,
] as const

export const FORMAL_EVENTS = [
  ...ENCOUNTER_EVENTS,
  ...ORDINARY_EVENTS,
  ...CHAIN_EVENTS,
  ...BREAKTHROUGH_EVENTS,
] as const
