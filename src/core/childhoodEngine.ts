import { getChildhoodEventById, getChildhoodEventIdsForBackground } from '../data/childhoodEvents'
import { getSpiritRootById } from '../data/spiritRoots'
import type { ChildhoodChoiceDefinition, ChildhoodEffect, ChildhoodEventDefinition, ChildhoodProgress } from '../types/childhood'
import type { StateChange } from '../types/chronicle'
import type { StatKey } from '../types/content'
import type { GameState } from '../types/game'
import type { ResolvedOutcome } from '../types/persistence'
import { formatDuration, DAYS_PER_YEAR } from './timeEngine'

const STAT_LABELS: Record<StatKey, string> = {
  constitution: '根骨', comprehension: '悟性', spiritSense: '神识', mentality: '心性', luck: '气运',
}

export interface ChildhoodChoiceResult {
  state: GameState
  applied: boolean
  reason?: string
  outcome?: ResolvedOutcome
  effectTypes: string[]
}

function hasAnyTag(state: GameState, tags: readonly string[] | undefined): boolean {
  if (!tags || tags.length === 0) return true
  return tags.some((tag) => state.tags.includes(tag))
}

export function createInitialChildhoodProgress(backgroundId: string): ChildhoodProgress | null {
  const nodeIds = getChildhoodEventIdsForBackground(backgroundId)
  if (!nodeIds) return null
  return { nodeIds: [...nodeIds], currentIndex: 0, currentNodeId: nodeIds[0], completedNodeIds: [] }
}

export function initializeChildhoodState(state: GameState): GameState {
  if (state.lifeStage !== 'childhood') return state
  const childhood = createInitialChildhoodProgress(state.identity.backgroundId)
  if (!childhood) return { ...state, childhood: null }
  const first = getChildhoodEventById(childhood.currentNodeId!)
  if (!first) throw new Error(`Childhood event is missing: ${childhood.currentNodeId}`)
  return {
    ...state,
    worldDay: state.identity.birthDay + first.ageYears * DAYS_PER_YEAR,
    childhood,
  }
}

export function getCurrentChildhoodEvent(state: GameState): ChildhoodEventDefinition | undefined {
  if (state.lifeStage !== 'childhood' || !state.childhood?.currentNodeId) return undefined
  return getChildhoodEventById(state.childhood.currentNodeId)
}

export function getAvailableChildhoodChoices(state: GameState, event: ChildhoodEventDefinition): ChildhoodChoiceDefinition[] {
  return event.choices.filter((choice) => hasAnyTag(state, choice.requiresAnyTags))
}

export function getVisibleChildhoodInsights(state: GameState, event: ChildhoodEventDefinition): string[] {
  return (event.insights ?? []).filter((insight) => hasAnyTag(state, insight.requiresAnyTags)).map((insight) => insight.text)
}

function formatRootResult(state: GameState): string {
  const root = getSpiritRootById(state.identity.spiritRootId)
  if (!root || root.id === 'none') return '测灵石没有显出灵光，登记的人在册子上写下“无灵根”。'
  return `测灵石给出的结果是“${root.name}”。这个结果只是被确认下来，并没有发生变化。`
}

function formatResultText(state: GameState, event: ChildhoodEventDefinition, choice: ChildhoodChoiceDefinition): string {
  const rootText = event.rootConfirmation ? formatRootResult(state) : ''
  return choice.resultText.replace('{root_result}', rootText)
}

function applyEffect(state: GameState, effect: ChildhoodEffect): GameState {
  if (effect.type === 'tag') {
    if (state.tags.includes(effect.tag)) return state
    return { ...state, tags: [...state.tags, effect.tag] }
  }
  if (effect.type === 'flag') return { ...state, flags: { ...state.flags, [effect.key]: effect.value } }
  if (effect.type === 'relationship') {
    return { ...state, relationships: { ...state.relationships, [effect.id]: (state.relationships[effect.id] ?? 0) + effect.delta } }
  }
  if (effect.type === 'stat') {
    return { ...state, stats: { ...state.stats, [effect.stat]: Math.max(1, state.stats[effect.stat] + effect.delta) } }
  }
  return { ...state, resources: { ...state.resources, spiritStones: Math.max(0, state.resources.spiritStones + effect.delta) } }
}

function visibleChanges(choice: ChildhoodChoiceDefinition): StateChange[] {
  const changes: StateChange[] = []
  if (choice.days > 0) changes.push({ label: '耗时', value: formatDuration(choice.days), tone: 'neutral' })
  for (const effect of choice.effects) {
    if (effect.type === 'stat') changes.push({ label: STAT_LABELS[effect.stat], value: `${effect.delta > 0 ? '+' : ''}${effect.delta}`, tone: effect.delta >= 0 ? 'positive' : 'negative' })
    if (effect.type === 'relationship') changes.push({ label: effect.label, value: `${effect.delta > 0 ? '+' : ''}${effect.delta}`, tone: effect.delta >= 0 ? 'positive' : 'negative' })
    if (effect.type === 'spirit-stones') changes.push({ label: '下品灵石', value: `${effect.delta > 0 ? '+' : ''}${effect.delta}枚`, tone: effect.delta >= 0 ? 'positive' : 'negative' })
  }
  return changes
}

export function resolveChildhoodChoice(state: GameState, choiceId: string): ChildhoodChoiceResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED', effectTypes: [] }
  if (state.lifeStage !== 'childhood' || !state.childhood?.currentNodeId) return { state, applied: false, reason: 'NO_CHILDHOOD_NODE', effectTypes: [] }
  const event = getChildhoodEventById(state.childhood.currentNodeId)
  if (!event) throw new Error(`Childhood event is missing: ${state.childhood.currentNodeId}`)
  const choice = getAvailableChildhoodChoices(state, event).find((item) => item.id === choiceId)
  if (!choice) return { state, applied: false, reason: 'CHILDHOOD_CHOICE_UNAVAILABLE', effectTypes: [] }

  const eventStartDay = state.worldDay
  const eventEndDay = eventStartDay + choice.days
  let next: GameState = { ...state, worldDay: eventEndDay }
  for (const effect of choice.effects) next = applyEffect(next, effect)

  const changes = visibleChanges(choice)
  const resultText = formatResultText(state, event, choice)
  const completedNodeIds = [...state.childhood.completedNodeIds, event.id]
  const nextIndex = state.childhood.currentIndex + 1
  const nextNodeId = state.childhood.nodeIds[nextIndex] ?? null

  next = {
    ...next,
    chronicle: [...next.chronicle, {
      id: `${state.runId}:childhood:${event.id}`,
      startDay: eventStartDay,
      endDay: eventEndDay,
      title: event.title,
      sceneText: event.narrative,
      narrative: resultText,
      choiceText: choice.label,
      changes,
      importance: 'notable',
      sourceType: 'lifeStage',
      sourceId: event.id,
    }],
    childhood: {
      ...state.childhood,
      currentIndex: nextIndex,
      currentNodeId: nextNodeId,
      completedNodeIds,
    },
  }

  if (nextNodeId) {
    const nextEvent = getChildhoodEventById(nextNodeId)
    if (!nextEvent) throw new Error(`Childhood event is missing: ${nextNodeId}`)
    next = { ...next, worldDay: Math.max(next.worldDay, state.identity.birthDay + nextEvent.ageYears * DAYS_PER_YEAR) }
  } else {
    next = {
      ...next,
      worldDay: state.identity.birthDay + 16 * DAYS_PER_YEAR,
      lifeStage: 'adult',
      childhood: { ...next.childhood!, currentNodeId: null },
    }
  }

  return {
    state: next,
    applied: true,
    outcome: { title: event.title, narrative: resultText, changes, consequence: null },
    effectTypes: ['childhood:choice', ...choice.effects.map((effect) => `childhood:${effect.type}`)],
  }
}
