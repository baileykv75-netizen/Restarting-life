import { getAdultEntryDefinitionByBackground, getAdultEntryOptionById } from '../data/adultEntries'
import type { AdultEntryContextRule, AdultEntryEffect, AdultEntryOptionDefinition, AdultEntryProgress } from '../types/adultEntry'
import type { StateChange } from '../types/chronicle'
import type { GameState } from '../types/game'
import type { ResolvedOutcome } from '../types/persistence'

export interface AdultEntryChoiceResult {
  state: GameState
  applied: boolean
  reason?: string
  outcome?: ResolvedOutcome
  effectTypes: string[]
}

export interface AdultEntryView {
  title: string
  originLocationLabel: string
  situationText: string
  contextNotes: string[]
  hasRoot: boolean
  progress: AdultEntryProgress
  options: AdultEntryOptionDefinition[]
  selectedOption?: AdultEntryOptionDefinition
}

function hasRoot(state: GameState): boolean {
  return state.identity.spiritRootId !== 'none'
}

function matchesRoot(state: GameState, option: AdultEntryOptionDefinition): boolean {
  return option.rootRequirement === 'any' || (option.rootRequirement === 'has-root' ? hasRoot(state) : !hasRoot(state))
}

function hasRequiredTags(state: GameState, required: readonly string[] | undefined): boolean {
  return !required || required.every((tag) => state.tags.includes(tag))
}

function optionAvailable(state: GameState, option: AdultEntryOptionDefinition): boolean {
  return matchesRoot(state, option) && hasRequiredTags(state, option.requiresAllTags)
}

function ruleVisible(state: GameState, rule: AdultEntryContextRule): boolean {
  const tagCondition = !rule.requiresAnyTags || rule.requiresAnyTags.some((tag) => state.tags.includes(tag))
  const flagCondition = !rule.requiresAnyFlags || rule.requiresAnyFlags.some((flag) => Boolean(state.flags[flag]))
  const relationshipCondition = !rule.relationshipAtLeast || (state.relationships[rule.relationshipAtLeast.id] ?? 0) >= rule.relationshipAtLeast.value
  const hasTagOrFlagCondition = Boolean(rule.requiresAnyTags || rule.requiresAnyFlags)
  const tagOrFlagVisible = hasTagOrFlagCondition
    ? Boolean((rule.requiresAnyTags && rule.requiresAnyTags.some((tag) => state.tags.includes(tag))) || (rule.requiresAnyFlags && rule.requiresAnyFlags.some((flag) => Boolean(state.flags[flag]))))
    : true
  return tagOrFlagVisible && relationshipCondition && (tagCondition || flagCondition)
}

export function createInitialAdultEntryProgress(state: GameState): AdultEntryProgress | null {
  if (state.lifeStage !== 'adult') return null
  const definition = getAdultEntryDefinitionByBackground(state.identity.backgroundId)
  if (!definition) return null
  const optionIds = definition.options.filter((option) => optionAvailable(state, option)).map((option) => option.id)
  if (optionIds.length < 2 || optionIds.length > 3) throw new Error(`Adult entry must expose 2-3 options for ${definition.backgroundId}, received ${optionIds.length}`)
  return {
    optionIds,
    selectedOptionId: null,
    resolved: false,
    originLocationSeed: definition.originLocationSeed,
    startingLocationSeed: null,
  }
}

export function initializeAdultEntryState(state: GameState): GameState {
  if (state.lifeStage !== 'adult' || state.adultEntry) return state
  const adultEntry = createInitialAdultEntryProgress(state)
  return adultEntry ? { ...state, adultEntry } : state
}

function progressForView(state: GameState): AdultEntryProgress | null {
  return state.adultEntry ?? createInitialAdultEntryProgress(state)
}

export function getAdultEntryView(state: GameState): AdultEntryView | null {
  if (state.lifeStage !== 'adult') return null
  const definition = getAdultEntryDefinitionByBackground(state.identity.backgroundId)
  const progress = progressForView(state)
  if (!definition || !progress) return null
  const options = progress.optionIds
    .map((id) => getAdultEntryOptionById(state.identity.backgroundId, id))
    .filter((entry): entry is AdultEntryOptionDefinition => Boolean(entry))
  const selectedOption = progress.selectedOptionId
    ? getAdultEntryOptionById(state.identity.backgroundId, progress.selectedOptionId)
    : undefined
  return {
    title: definition.title,
    originLocationLabel: definition.originLocationLabel,
    situationText: hasRoot(state) ? definition.hasRootText : definition.noRootText,
    contextNotes: (definition.contextRules ?? []).filter((rule) => ruleVisible(state, rule)).map((rule) => rule.text),
    hasRoot: hasRoot(state),
    progress,
    options,
    selectedOption,
  }
}

function applyEffect(state: GameState, effect: AdultEntryEffect): GameState {
  if (effect.type === 'tag') {
    if (state.tags.includes(effect.tag)) return state
    return { ...state, tags: [...state.tags, effect.tag] }
  }
  if (effect.type === 'flag') return { ...state, flags: { ...state.flags, [effect.key]: effect.value } }
  if (effect.type === 'relationship') {
    return { ...state, relationships: { ...state.relationships, [effect.id]: (state.relationships[effect.id] ?? 0) + effect.delta } }
  }
  return { ...state, resources: { ...state.resources, spiritStones: Math.max(0, state.resources.spiritStones + effect.delta) } }
}

function addTag(state: GameState, tag: string): GameState {
  return state.tags.includes(tag) ? state : { ...state, tags: [...state.tags, tag] }
}

function visibleChanges(option: AdultEntryOptionDefinition): StateChange[] {
  const changes: StateChange[] = [
    { label: '成年方向', value: option.label, tone: 'neutral' },
    { label: '起点', value: option.startingLocationLabel, tone: 'neutral' },
  ]
  if (option.cultivationMethodSeed) changes.push({ label: '功法渠道', value: '已取得基础传授入口', tone: 'positive' })
  for (const effect of option.effects ?? []) {
    if (effect.type === 'relationship') changes.push({ label: effect.label, value: `${effect.delta > 0 ? '+' : ''}${effect.delta}`, tone: effect.delta >= 0 ? 'positive' : 'negative' })
    if (effect.type === 'spirit-stones') changes.push({ label: '下品灵石', value: `${effect.delta > 0 ? '+' : ''}${effect.delta}枚`, tone: effect.delta >= 0 ? 'positive' : 'negative' })
  }
  return changes
}

export function resolveAdultEntryChoice(state: GameState, optionId: string): AdultEntryChoiceResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED', effectTypes: [] }
  if (state.lifeStage !== 'adult') return { state, applied: false, reason: 'NOT_ADULT', effectTypes: [] }
  const prepared = initializeAdultEntryState(state)
  const progress = prepared.adultEntry
  if (!progress) return { state, applied: false, reason: 'NO_ADULT_ENTRY', effectTypes: [] }
  if (progress.resolved || progress.selectedOptionId) return { state: prepared, applied: false, reason: 'ADULT_ENTRY_ALREADY_RESOLVED', effectTypes: [] }
  if (!progress.optionIds.includes(optionId)) return { state: prepared, applied: false, reason: 'ADULT_ENTRY_OPTION_UNAVAILABLE', effectTypes: [] }
  const option = getAdultEntryOptionById(prepared.identity.backgroundId, optionId)
  if (!option || !optionAvailable(prepared, option)) return { state: prepared, applied: false, reason: 'ADULT_ENTRY_OPTION_UNAVAILABLE', effectTypes: [] }

  let next = prepared
  for (const effect of option.effects ?? []) next = applyEffect(next, effect)
  next = addTag(next, `adult_path:${option.id}`)
  next = addTag(next, `starting_location_seed:${option.startingLocationSeed}`)
  if (option.accessSeed) next = addTag(next, `adult_access:${option.accessSeed}`)
  if (option.cultivationMethodSeed) next = addTag(next, `cultivation_method_access:${option.cultivationMethodSeed}`)

  next = {
    ...next,
    adultEntry: {
      ...progress,
      selectedOptionId: option.id,
      resolved: true,
      startingLocationSeed: option.startingLocationSeed,
    },
    flags: {
      ...next.flags,
      adult_entry_resolved: true,
      adult_starting_location_seed: option.startingLocationSeed,
      ...(option.accessSeed ? { adult_access_seed: option.accessSeed } : {}),
      ...(option.cultivationMethodSeed ? { cultivation_method_access_seed: option.cultivationMethodSeed } : {}),
    },
  }

  const changes = visibleChanges(option)
  next = {
    ...next,
    chronicle: [...next.chronicle, {
      id: `${next.runId}:adult-entry:${option.id}`,
      startDay: next.worldDay,
      endDay: next.worldDay,
      title: '成年去向',
      sceneText: `十六岁时，你需要决定成年后的第一处落脚点与生活方向。`,
      narrative: option.resultText,
      choiceText: option.label,
      changes,
      importance: 'notable',
      sourceType: 'lifeStage',
      sourceId: option.id,
    }],
  }

  return {
    state: next,
    applied: true,
    outcome: { title: '成年去向', narrative: option.resultText, changes, consequence: '地点与行动系统将在下一阶段从这个起点继续。' },
    effectTypes: ['adult-entry:choice', ...(option.effects ?? []).map((effect) => `adult-entry:${effect.type}`), ...(option.accessSeed ? ['adult-entry:access'] : []), ...(option.cultivationMethodSeed ? ['adult-entry:method-access'] : [])],
  }
}
