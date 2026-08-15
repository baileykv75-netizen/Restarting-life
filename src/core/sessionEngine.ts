import { FORMAL_EVENTS } from '../data/events/formalEvents'
import { getWorldLocationById } from '../data/worldLocations'
import type { StateChange } from '../types/chronicle'
import type { PlayerAction, SessionCommand } from '../types/command'
import type { StatKey } from '../types/content'
import type { GameAction } from '../types/gameAction'
import type { GameSession, OutcomeSnapshot, ResolvedOutcome } from '../types/persistence'
import { performPlayerAction } from './actionEngine'
import { resolveAdultEntryChoice } from './adultEntryEngine'
import { generateBirthState } from './birthEngine'
import { resolveBreakthroughAttempt } from './breakthroughEngine'
import { resolveChildhoodChoice } from './childhoodEngine'
import { appendChronicleEntry, createActionChronicleEntry, createEventChronicleEntry } from './chronicleEngine'
import { resolveEquipItem, resolveEquipmentInitialization, resolveUnequipSlot } from './equipmentEngine'
import { createEventCatalog, getAvailableChoices, resolveEventChoice } from './eventEngine'
import { applyGameAction } from './gameActionReducer'
import type { CreateGameStateOptions } from './gameState'
import { resolveInventoryDrop, resolveInventoryInitialization, resolvePendingMaterialsTransfer } from './inventoryEngine'
import { resolveLocationKnowledgeInitialization } from './locationKnowledgeEngine'
import { getExplorationStageLabel, resolveRegionExploration, type RegionExplorationResult } from './regionExplorationEngine'
import { refreshSunkenVeinDiscovery, resolveSecretRealmAction, resolveSecretRealmInitialization } from './secretRealmEngine'
import { getGameStateDigest } from './stateDigest'
import { formatDuration } from './timeEngine'
import { resolveFastTravel, resolveTravel, type TravelResult } from './travelEngine'
import { resolveWorldInitialization } from './worldLocationEngine'

export const FORMAL_EVENT_CATALOG = createEventCatalog(FORMAL_EVENTS)
export interface SessionCommandResult { session: GameSession; applied: boolean; reason?: string }
const STAT_LABELS: Record<StatKey, string> = { constitution: '根骨', comprehension: '悟性', spiritSense: '神识', mentality: '心性', luck: '气运' }
const RELATIONSHIP_LABELS: Record<string, string> = { li_qing: '李青关系', master: '师父关系', elder: '宗门执事关系', chen_yu: '陈羽关系' }
function spiritSenseRealmBonus(state: GameSession['state']): number { const { realm, stage } = state.cultivation; if (realm === 'mortal') return 0; if (realm === 'qi') return Math.max(1, Math.min(9, stage)); if (realm === 'foundation') return stage <= 1 ? 14 : stage === 2 ? 18 : 22; return 30 }
function effectiveStat(state: GameSession['state'], stat: StatKey): number { return stat === 'spiritSense' ? state.stats.spiritSense + spiritSenseRealmBonus(state) : state.stats[stat] }
function captureOutcomeSnapshot(state: GameSession['state']): OutcomeSnapshot { return { worldDay: state.worldDay, spiritStones: state.resources.spiritStones, cultivation: state.resources.cultivation, realm: state.cultivation.realm, stage: state.cultivation.stage, stats: { constitution: effectiveStat(state, 'constitution'), comprehension: effectiveStat(state, 'comprehension'), spiritSense: effectiveStat(state, 'spiritSense'), mentality: effectiveStat(state, 'mentality'), luck: effectiveStat(state, 'luck') }, relationships: { ...state.relationships }, tags: [...state.tags], flags: { ...state.flags } } }
function signed(value: number, suffix = ''): string { return `${value > 0 ? '+' : ''}${value}${suffix}` }
function realmText(realm: GameSession['state']['cultivation']['realm'], stage: number): string { if (realm === 'mortal') return '凡人'; if (realm === 'qi') return `炼气${stage}层`; if (realm === 'foundation') return `筑基${stage === 1 ? '初期' : stage === 2 ? '中期' : '后期'}`; return '金丹' }
function buildChanges(before: OutcomeSnapshot, after: GameSession['state']): StateChange[] { const changes: StateChange[] = []; const elapsedDays = after.worldDay - before.worldDay; if (elapsedDays > 0) changes.push({ label: '时间', value: `+${formatDuration(elapsedDays)}`, tone: 'neutral' }); const stones = after.resources.spiritStones - before.spiritStones; if (stones !== 0) changes.push({ label: '下品灵石', value: signed(stones, '枚'), tone: stones > 0 ? 'positive' : 'negative' }); const realmChanged = before.realm !== after.cultivation.realm || before.stage !== after.cultivation.stage; if (realmChanged) changes.push({ label: '境界', value: `${realmText(before.realm, before.stage)} → ${realmText(after.cultivation.realm, after.cultivation.stage)}`, tone: 'positive' }); else { const cultivation = after.resources.cultivation - before.cultivation; if (cultivation !== 0) changes.push({ label: '修为', value: signed(cultivation), tone: cultivation > 0 ? 'positive' : 'negative' }) } for (const stat of Object.keys(STAT_LABELS) as StatKey[]) { const delta = effectiveStat(after, stat) - before.stats[stat]; if (delta !== 0) changes.push({ label: STAT_LABELS[stat], value: signed(delta), tone: delta > 0 ? 'positive' : 'negative' }) } const ids = new Set([...Object.keys(before.relationships), ...Object.keys(after.relationships)]); for (const id of ids) { const delta = (after.relationships[id] ?? 0) - (before.relationships[id] ?? 0); if (delta !== 0) changes.push({ label: RELATIONSHIP_LABELS[id] ?? `${id}关系`, value: signed(delta), tone: delta > 0 ? 'positive' : 'negative' }) } return changes }
function buildOutcome(before: OutcomeSnapshot, after: GameSession['state'], title: string, narrative: string, consequence?: string): ResolvedOutcome { return { title, narrative, changes: buildChanges(before, after), consequence: consequence ?? null } }
function actionTitle(action: PlayerAction): string { if (action === 'cultivate') return '闭关结束'; if (action === 'explore') return '外出归来'; if (action === 'livelihood') return '差事做完了'; return '突破结果' }
function actionNarrative(action: PlayerAction): string { if (action === 'cultivate') return '这一段修炼告一段落。'; if (action === 'explore') return '你结束这次外出，回到了熟悉的地方。'; if (action === 'livelihood') return '这段日子忙完，报酬也已经结清。'; return '' }
function travelOutcome(before: GameSession['state'], result: TravelResult, fast: boolean): ResolvedOutcome {
  const destination = result.destinationId ? getWorldLocationById(result.destinationId) : undefined
  const origin = before.world.currentLocationId ? getWorldLocationById(before.world.currentLocationId) : undefined
  const changes: StateChange[] = [{ label: '时间', value: `+${formatDuration(result.travelDays)}`, tone: 'neutral' }]
  if (result.arrived && destination) changes.push({ label: '地点', value: `${origin?.name ?? '出发地'} → ${destination.name}`, tone: 'neutral' })
  if (!result.arrived && result.state.status !== 'playing') changes.push({ label: '状态', value: result.state.endReason ?? '旅途中死亡', tone: 'negative' })
  return {
    title: result.arrived ? (fast ? '赶路结束' : `抵达${destination?.name ?? '目的地'}`) : '旅途中止',
    narrative: result.arrived
      ? fast
        ? `你沿已经走熟的路线前往${destination?.name ?? '目的地'}，共用了${formatDuration(result.travelDays)}。`
        : `你从${origin?.name ?? '出发地'}前往${destination?.name ?? '目的地'}，用了${formatDuration(result.travelDays)}，已经抵达。`
      : `这段路原本预计前往${destination?.name ?? '目的地'}，但你没能走到终点。`,
    changes,
    consequence: null,
  }
}
function explorationOutcome(result: RegionExplorationResult): ResolvedOutcome {
  const location = result.locationId ? getWorldLocationById(result.locationId) : undefined
  const beforeStage = getExplorationStageLabel(result.stageBefore)
  const afterStage = getExplorationStageLabel(result.stageAfter)
  return {
    title: `${location?.name ?? '区域'}探索结束`,
    narrative: `你在${location?.name ?? '当前区域'}进行了${formatDuration(result.days)}的系统探索。当前累计探索${result.exploredDays}天。`,
    changes: [
      { label: '时间', value: `+${formatDuration(result.days)}`, tone: 'neutral' },
      { label: '累计探索', value: `${result.previousExploredDays}天 → ${result.exploredDays}天`, tone: 'neutral' },
      { label: '探索阶段', value: beforeStage === afterStage ? afterStage : `${beforeStage} → ${afterStage}`, tone: 'neutral' },
    ],
    consequence: null,
  }
}
export function createGameSession(options: CreateGameStateOptions): GameSession { return { state: generateBirthState(options), debugLog: [], pendingResult: null, pendingAction: null } }
function getEffectTypes(session: GameSession, command: SessionCommand): string[] { if (command.type === 'continue') return ['result:continue']; if (command.type === 'game-action') return [`game-action:${command.action.type}`]; if (command.type === 'action') return [`action:${command.action}`]; if (command.type === 'childhood-choice') return ['childhood:choice']; if (command.type === 'adult-entry-choice') return ['adult-entry:choice']; if (command.type === 'initialize-world') return ['world:initialize-location']; if (command.type === 'initialize-location-knowledge') return ['world:initialize-location-knowledge']; if (command.type === 'initialize-secret-realm') return ['world:initialize-secret-realm']; if (command.type === 'secret-realm') return [`world:secret-realm:${command.action}`]; if (command.type === 'initialize-inventory') return ['inventory:initialize']; if (command.type === 'inventory-drop') return ['inventory:drop']; if (command.type === 'initialize-equipment') return ['equipment:initialize']; if (command.type === 'equip-item') return ['equipment:equip']; if (command.type === 'unequip-slot') return ['equipment:unequip']; if (command.type === 'travel') return ['world:travel']; if (command.type === 'fast-travel') return ['world:fast-travel']; if (command.type === 'explore-region') return ['world:explore-region']; const currentEventId = session.state.events.currentEventId; if (!currentEventId) return ['choice:missing-event']; const event = FORMAL_EVENT_CATALOG.get(currentEventId); if (!event) return ['choice:unknown-event']; if (event.category === 'breakthrough' && command.choiceId === 'attempt') return ['seededBreakthrough']; const choice = event.choices.find((candidate) => candidate.id === command.choiceId); return choice?.effects.map((effect) => effect.type) ?? [] }

export function executeSessionCommand(session: GameSession, command: SessionCommand): SessionCommandResult {
  if (command.type === 'continue') { if (!session.pendingResult) return { session, applied: false, reason: 'NO_PENDING_RESULT' }; return { session: { ...session, pendingResult: null }, applied: true } }
  const workingSession: GameSession = session.pendingResult ? { ...session, pendingResult: null } : session
  const before = workingSession.state
  let effectTypes = getEffectTypes(workingSession, command)
  let nextState = before
  let applied = false
  let reason: string | undefined
  let pendingResult: ResolvedOutcome | null = null
  let pendingAction = workingSession.pendingAction ?? null

  if (command.type === 'childhood-choice') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveChildhoodChoice(before, command.choiceId)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingResult = result.outcome ?? null; pendingAction = null; effectTypes = result.effectTypes
  } else if (command.type === 'adult-entry-choice') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveAdultEntryChoice(before, command.optionId)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingResult = result.outcome ?? null; pendingAction = null; effectTypes = result.effectTypes
  } else if (command.type === 'initialize-world') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveWorldInitialization(before)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null; effectTypes = ['world:initialize-location']
  } else if (command.type === 'initialize-location-knowledge') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveLocationKnowledgeInitialization(before)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null; effectTypes = ['world:initialize-location-knowledge']
  } else if (command.type === 'initialize-secret-realm') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveSecretRealmInitialization(before)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null; effectTypes = ['world:initialize-secret-realm']
  } else if (command.type === 'secret-realm') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveSecretRealmAction(before, command.action)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null
    if (applied && nextState.inventory) {
      const transfer = resolvePendingMaterialsTransfer(nextState)
      if (!transfer.applied) return { session: workingSession, applied: false, reason: transfer.reason }
      nextState = transfer.state
    }
    if (nextState.status === 'playing') pendingResult = result.outcome ?? null
    effectTypes = [`world:secret-realm:${command.action}`]
  } else if (command.type === 'initialize-inventory') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveInventoryInitialization(before)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null; effectTypes = ['inventory:initialize']
  } else if (command.type === 'inventory-drop') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveInventoryDrop(before, command.itemId, command.quantity)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null; effectTypes = ['inventory:drop']
  } else if (command.type === 'initialize-equipment') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveEquipmentInitialization(before)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null; effectTypes = ['equipment:initialize']
  } else if (command.type === 'equip-item') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveEquipItem(before, command.itemId)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null; effectTypes = ['equipment:equip']
  } else if (command.type === 'unequip-slot') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveUnequipSlot(before, command.slot)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null; effectTypes = ['equipment:unequip']
  } else if (command.type === 'travel' || command.type === 'fast-travel') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = command.type === 'travel' ? resolveTravel(before, command.destinationId) : resolveFastTravel(before, command.destinationId)
    nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null
    if (applied) pendingResult = travelOutcome(before, result, command.type === 'fast-travel')
    effectTypes = command.type === 'travel' ? ['world:travel'] : ['world:fast-travel']
  } else if (command.type === 'explore-region') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = resolveRegionExploration(before, command.days)
    nextState = result.state.secretRealm ? refreshSunkenVeinDiscovery(result.state) : result.state
    applied = result.applied; reason = result.reason; pendingAction = null
    if (applied && result.completed) pendingResult = explorationOutcome(result)
    effectTypes = ['world:explore-region']
  } else if (command.type === 'action') {
    const snapshot = captureOutcomeSnapshot(before); const result = performPlayerAction(before, command.action, FORMAL_EVENTS, FORMAL_EVENT_CATALOG); nextState = result.state; applied = result.applied; reason = result.reason
    if (applied) { if (nextState.events.currentEventId !== null) pendingAction = { action: command.action, snapshot }; else { pendingAction = null; pendingResult = buildOutcome(snapshot, nextState, actionTitle(command.action), actionNarrative(command.action)); nextState = appendChronicleEntry(nextState, createActionChronicleEntry(command.action, pendingResult, snapshot, nextState.worldDay, nextState.chronicle.length + 1)) } }
  } else if (command.type === 'game-action') {
    if (before.events.currentEventId !== null || pendingAction !== null) return { session: workingSession, applied: false, reason: 'EVENT_PENDING' }
    const result = applyGameAction(before, command.action); nextState = result.state; applied = result.applied; reason = result.reason; pendingAction = null
  } else {
    if (before.status !== 'playing') return { session: workingSession, applied: false, reason: 'GAME_ENDED' }
    const eventId = before.events.currentEventId; if (!eventId) return { session: workingSession, applied: false, reason: 'NO_ACTIVE_EVENT' }
    const event = FORMAL_EVENT_CATALOG.get(eventId); if (!event) throw new Error(`Active formal event is missing: ${eventId}`)
    const choice = event.choices.find((candidate) => candidate.id === command.choiceId); const choiceAvailable = getAvailableChoices(before, event).some((candidate) => candidate.id === command.choiceId); if (!choice || !choiceAvailable) return { session: workingSession, applied: false, reason: 'CHOICE_UNAVAILABLE' }
    const snapshot = pendingAction?.snapshot ?? captureOutcomeSnapshot(before); nextState = event.category === 'breakthrough' && command.choiceId === 'attempt' ? resolveBreakthroughAttempt(before, FORMAL_EVENT_CATALOG).state : resolveEventChoice(before, FORMAL_EVENT_CATALOG, command.choiceId); applied = true; pendingAction = null; pendingResult = buildOutcome(snapshot, nextState, event.title, choice.resultText ?? '', choice.consequenceText); nextState = appendChronicleEntry(nextState, createEventChronicleEntry(event, choice, pendingResult, snapshot, nextState.worldDay, nextState.chronicle.length + 1))
  }
  if (!applied) return { session: workingSession, applied: false, reason }
  const logEntry = { seq: workingSession.debugLog.length + 1, command, worldDayBefore: before.worldDay, worldDayAfter: nextState.worldDay, eventIdBefore: before.events.currentEventId, eventIdAfter: nextState.events.currentEventId, rngBefore: before.rngState, rngAfter: nextState.rngState, effectTypes, stateDigestBefore: getGameStateDigest(before), stateDigestAfter: getGameStateDigest(nextState) }
  return { session: { state: nextState, debugLog: [...workingSession.debugLog, logEntry], pendingResult, pendingAction }, applied: true }
}
export function executeSessionAction(session: GameSession, action: PlayerAction): SessionCommandResult { return executeSessionCommand(session, { type: 'action', action }) }
export function executeSessionChoice(session: GameSession, choiceId: string): SessionCommandResult { return executeSessionCommand(session, { type: 'choice', choiceId }) }
export function executeSessionGameAction(session: GameSession, action: GameAction): SessionCommandResult { return executeSessionCommand(session, { type: 'game-action', action }) }
