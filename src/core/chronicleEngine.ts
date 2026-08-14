import type { ChronicleEntry, ChronicleImportance } from '../types/chronicle'
import type { PlayerAction } from '../types/command'
import type { EventChoice, GameEvent } from '../types/event'
import type { OutcomeSnapshot, ResolvedOutcome } from '../types/persistence'

export function getEventChronicleImportance(event: GameEvent): ChronicleImportance {
  if (event.importance === 'major') return 'major'
  if (event.importance === 'notable') return 'notable'
  if (event.category === 'breakthrough' || event.category === 'chain') return 'major'
  if (event.once) return 'notable'
  return 'routine'
}

function makeId(sourceType: ChronicleEntry['sourceType'], sourceId: string, sequence: number): string {
  return `chronicle:${sourceType}:${sourceId}:${sequence}`
}

export function createEventChronicleEntry(
  event: GameEvent,
  choice: EventChoice,
  outcome: ResolvedOutcome,
  snapshot: OutcomeSnapshot,
  endDay: number,
  sequence: number,
): ChronicleEntry {
  return {
    id: makeId('event', event.id, sequence),
    startDay: snapshot.worldDay,
    endDay,
    title: event.chronicleText ?? event.title,
    sceneText: event.text,
    narrative: choice.chronicleText ?? outcome.narrative,
    choiceText: event.choices.length > 1 ? choice.text : undefined,
    consequence: outcome.consequence,
    changes: outcome.changes.map((change) => ({ ...change })),
    importance: getEventChronicleImportance(event),
    sourceType: 'event',
    sourceId: event.id,
  }
}

function actionTitle(action: PlayerAction): string {
  if (action === 'cultivate') return '一段闭关'
  if (action === 'explore') return '一次外出'
  if (action === 'livelihood') return '一段营生'
  return '一次突破'
}

function actionScene(action: PlayerAction): string {
  if (action === 'cultivate') return '你把这一段时间用在吐纳与周天上。'
  if (action === 'explore') return '你离开熟悉之地，在外走了一程。'
  if (action === 'livelihood') return '你用这一段时间换取眼前所需。'
  return '你走到了境界关口前。'
}

export function createActionChronicleEntry(
  action: PlayerAction,
  outcome: ResolvedOutcome,
  snapshot: OutcomeSnapshot,
  endDay: number,
  sequence: number,
): ChronicleEntry {
  return {
    id: makeId('activity', action, sequence),
    startDay: snapshot.worldDay,
    endDay,
    title: actionTitle(action),
    sceneText: actionScene(action),
    narrative: outcome.narrative,
    consequence: outcome.consequence,
    changes: outcome.changes.map((change) => ({ ...change })),
    importance: action === 'breakthrough' ? 'major' : 'routine',
    sourceType: 'activity',
    sourceId: action,
  }
}

export function appendChronicleEntry<T extends { chronicle: ChronicleEntry[] }>(
  state: T,
  entry: ChronicleEntry,
): T {
  return {
    ...state,
    chronicle: [...state.chronicle, entry],
  }
}
