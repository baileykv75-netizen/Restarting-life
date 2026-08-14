import { FORMAL_EVENTS } from '../data/events/formalEvents'
import type { StateChange } from '../types/chronicle'
import type { PlayerAction, SessionCommand } from '../types/command'
import type { StatKey } from '../types/content'
import type { GameSession, OutcomeSnapshot, ResolvedOutcome } from '../types/persistence'
import { performPlayerAction } from './actionEngine'
import { generateBirthState } from './birthEngine'
import { resolveBreakthroughAttempt } from './breakthroughEngine'
import {
  appendChronicleEntry,
  createActionChronicleEntry,
  createEventChronicleEntry,
} from './chronicleEngine'
import { createEventCatalog, getAvailableChoices, resolveEventChoice } from './eventEngine'
import type { CreateGameStateOptions } from './gameState'
import { getGameStateDigest } from './stateDigest'
import { formatDuration } from './timeEngine'

export const FORMAL_EVENT_CATALOG = createEventCatalog(FORMAL_EVENTS)

export interface SessionCommandResult {
  session: GameSession
  applied: boolean
  reason?: string
}

const STAT_LABELS: Record<StatKey, string> = {
  constitution: '根骨',
  comprehension: '悟性',
  spiritSense: '神识',
  mentality: '心性',
  luck: '气运',
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  li_qing: '李青关系',
  master: '师父关系',
  elder: '宗门执事关系',
  chen_yu: '陈羽关系',
}

function spiritSenseRealmBonus(state: GameSession['state']): number {
  const { realm, stage } = state.cultivation
  if (realm === 'mortal') return 0
  if (realm === 'qi') return Math.max(1, Math.min(9, stage))
  if (realm === 'foundation') return stage <= 1 ? 14 : stage === 2 ? 18 : 22
  return 30
}

function effectiveStat(state: GameSession['state'], stat: StatKey): number {
  return stat === 'spiritSense'
    ? state.stats.spiritSense + spiritSenseRealmBonus(state)
    : state.stats[stat]
}

function captureOutcomeSnapshot(state: GameSession['state']): OutcomeSnapshot {
  return {
    worldDay: state.worldDay,
    spiritStones: state.resources.spiritStones,
    cultivation: state.resources.cultivation,
    realm: state.cultivation.realm,
    stage: state.cultivation.stage,
    stats: {
      constitution: effectiveStat(state, 'constitution'),
      comprehension: effectiveStat(state, 'comprehension'),
      spiritSense: effectiveStat(state, 'spiritSense'),
      mentality: effectiveStat(state, 'mentality'),
      luck: effectiveStat(state, 'luck'),
    },
    relationships: { ...state.relationships },
    tags: [...state.tags],
    flags: { ...state.flags },
  }
}

function signed(value: number, suffix = ''): string {
  return `${value > 0 ? '+' : ''}${value}${suffix}`
}

function realmText(realm: GameSession['state']['cultivation']['realm'], stage: number): string {
  if (realm === 'mortal') return '凡人'
  if (realm === 'qi') return `炼气${stage}层`
  if (realm === 'foundation') return `筑基${stage === 1 ? '初期' : stage === 2 ? '中期' : '后期'}`
  return '金丹'
}

function buildChanges(before: OutcomeSnapshot, after: GameSession['state']): StateChange[] {
  const changes: StateChange[] = []
  const elapsedDays = after.worldDay - before.worldDay
  if (elapsedDays > 0) {
    changes.push({ label: '时间', value: `+${formatDuration(elapsedDays)}`, tone: 'neutral' })
  }

  const stones = after.resources.spiritStones - before.spiritStones
  if (stones !== 0) {
    changes.push({ label: '下品灵石', value: signed(stones, '枚'), tone: stones > 0 ? 'positive' : 'negative' })
  }

  const realmChanged = before.realm !== after.cultivation.realm || before.stage !== after.cultivation.stage
  if (realmChanged) {
    changes.push({
      label: '境界',
      value: `${realmText(before.realm, before.stage)} → ${realmText(after.cultivation.realm, after.cultivation.stage)}`,
      tone: 'positive',
    })
  } else {
    const cultivation = after.resources.cultivation - before.cultivation
    if (cultivation !== 0) {
      changes.push({ label: '修为', value: signed(cultivation), tone: cultivation > 0 ? 'positive' : 'negative' })
    }
  }

  for (const stat of Object.keys(STAT_LABELS) as StatKey[]) {
    const delta = effectiveStat(after, stat) - before.stats[stat]
    if (delta !== 0) {
      changes.push({ label: STAT_LABELS[stat], value: signed(delta), tone: delta > 0 ? 'positive' : 'negative' })
    }
  }

  const ids = new Set([...Object.keys(before.relationships), ...Object.keys(after.relationships)])
  for (const id of ids) {
    const delta = (after.relationships[id] ?? 0) - (before.relationships[id] ?? 0)
    if (delta !== 0) {
      changes.push({ label: RELATIONSHIP_LABELS[id] ?? `${id}关系`, value: signed(delta), tone: delta > 0 ? 'positive' : 'negative' })
    }
  }

  return changes
}

function hiddenHistoryChanged(before: OutcomeSnapshot, after: GameSession['state']): boolean {
  if (before.tags.length !== after.tags.length) return true
  const beforeKeys = Object.keys(before.flags)
  const afterKeys = Object.keys(after.flags)
  if (beforeKeys.length !== afterKeys.length) return true
  return afterKeys.some((key) => before.flags[key] !== after.flags[key])
}

function buildOutcome(
  before: OutcomeSnapshot,
  after: GameSession['state'],
  title: string,
  narrative: string,
  consequence?: string,
): ResolvedOutcome {
  return {
    title,
    narrative,
    changes: buildChanges(before, after),
    consequence: consequence ?? (hiddenHistoryChanged(before, after)
      ? '这次选择已经被世界记住，未来或许会再次回应你。'
      : null),
  }
}

function actionTitle(action: PlayerAction): string {
  if (action === 'cultivate') return '一轮修行结束'
  if (action === 'explore') return '这次历练告一段落'
  if (action === 'livelihood') return '这一段营生结束'
  return '突破结果'
}

function actionNarrative(action: PlayerAction): string {
  if (action === 'cultivate') return '岁月在吐纳与周天中流逝，你重新审视这一年真正留下了什么。'
  if (action === 'explore') return '你结束这次远行，把所得与代价一并带回。'
  if (action === 'livelihood') return '忙碌告一段落，报酬、关系与消耗都已落到实处。'
  return '你已经作出了这次突破的选择。'
}

export function createGameSession(options: CreateGameStateOptions): GameSession {
  return {
    state: generateBirthState(options),
    debugLog: [],
    pendingResult: null,
    pendingAction: null,
  }
}

function getEffectTypes(session: GameSession, command: SessionCommand): string[] {
  if (command.type === 'continue') return ['result:continue']
  if (command.type === 'action') return [`action:${command.action}`]

  const currentEventId = session.state.events.currentEventId
  if (!currentEventId) return ['choice:missing-event']
  const event = FORMAL_EVENT_CATALOG.get(currentEventId)
  if (!event) return ['choice:unknown-event']
  if (event.category === 'breakthrough' && command.choiceId === 'attempt') return ['seededBreakthrough']
  const choice = event.choices.find((candidate) => candidate.id === command.choiceId)
  return choice?.effects.map((effect) => effect.type) ?? []
}

export function executeSessionCommand(session: GameSession, command: SessionCommand): SessionCommandResult {
  if (command.type === 'continue') {
    if (!session.pendingResult) return { session, applied: false, reason: 'NO_PENDING_RESULT' }
    return { session: { ...session, pendingResult: null }, applied: true }
  }

  const workingSession: GameSession = session.pendingResult ? { ...session, pendingResult: null } : session
  const before = workingSession.state
  const effectTypes = getEffectTypes(workingSession, command)
  let nextState = before
  let applied = false
  let reason: string | undefined
  let pendingResult: ResolvedOutcome | null = null
  let pendingAction = workingSession.pendingAction ?? null

  if (command.type === 'action') {
    const snapshot = captureOutcomeSnapshot(before)
    const result = performPlayerAction(before, command.action, FORMAL_EVENTS, FORMAL_EVENT_CATALOG)
    nextState = result.state
    applied = result.applied
    reason = result.reason

    if (applied) {
      if (nextState.events.currentEventId !== null) {
        pendingAction = { action: command.action, snapshot }
      } else {
        pendingAction = null
        pendingResult = buildOutcome(snapshot, nextState, actionTitle(command.action), actionNarrative(command.action))
        nextState = appendChronicleEntry(
          nextState,
          createActionChronicleEntry(
            command.action,
            pendingResult,
            snapshot,
            nextState.worldDay,
            nextState.chronicle.length + 1,
          ),
        )
      }
    }
  } else {
    if (before.status !== 'playing') return { session: workingSession, applied: false, reason: 'GAME_ENDED' }
    const eventId = before.events.currentEventId
    if (!eventId) return { session: workingSession, applied: false, reason: 'NO_ACTIVE_EVENT' }
    const event = FORMAL_EVENT_CATALOG.get(eventId)
    if (!event) throw new Error(`Active formal event is missing: ${eventId}`)

    const choice = event.choices.find((candidate) => candidate.id === command.choiceId)
    const choiceAvailable = getAvailableChoices(before, event).some((candidate) => candidate.id === command.choiceId)
    if (!choice || !choiceAvailable) return { session: workingSession, applied: false, reason: 'CHOICE_UNAVAILABLE' }

    const snapshot = pendingAction?.snapshot ?? captureOutcomeSnapshot(before)
    nextState = event.category === 'breakthrough' && command.choiceId === 'attempt'
      ? resolveBreakthroughAttempt(before, FORMAL_EVENT_CATALOG).state
      : resolveEventChoice(before, FORMAL_EVENT_CATALOG, command.choiceId)
    applied = true
    pendingAction = null
    pendingResult = buildOutcome(
      snapshot,
      nextState,
      event.title,
      choice.resultText ?? `你选择了“${choice.text}”。事情有了结果，而代价也已经落在这一世。`,
      choice.consequenceText,
    )
    nextState = appendChronicleEntry(
      nextState,
      createEventChronicleEntry(
        event,
        choice,
        pendingResult,
        snapshot,
        nextState.worldDay,
        nextState.chronicle.length + 1,
      ),
    )
  }

  if (!applied) return { session: workingSession, applied: false, reason }

  const logEntry = {
    seq: workingSession.debugLog.length + 1,
    command,
    worldDayBefore: before.worldDay,
    worldDayAfter: nextState.worldDay,
    eventIdBefore: before.events.currentEventId,
    eventIdAfter: nextState.events.currentEventId,
    rngBefore: before.rngState,
    rngAfter: nextState.rngState,
    effectTypes,
    stateDigestBefore: getGameStateDigest(before),
    stateDigestAfter: getGameStateDigest(nextState),
  }

  return {
    session: {
      state: nextState,
      debugLog: [...workingSession.debugLog, logEntry],
      pendingResult,
      pendingAction,
    },
    applied: true,
  }
}

export function executeSessionAction(session: GameSession, action: PlayerAction): SessionCommandResult {
  return executeSessionCommand(session, { type: 'action', action })
}

export function executeSessionChoice(session: GameSession, choiceId: string): SessionCommandResult {
  return executeSessionCommand(session, { type: 'choice', choiceId })
}
