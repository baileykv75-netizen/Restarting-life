import { BACKGROUNDS, LEGACY_BIRTH_BACKGROUNDS } from '../data/backgrounds'
import { PHYSIQUES } from '../data/physiques'
import { LEGACY_BIRTH_SPIRIT_ROOTS, SPIRIT_ROOTS } from '../data/spiritRoots'
import { LEGACY_BIRTH_TALENTS, TALENTS } from '../data/talents'
import type { BirthCandidate, PendingBirthSelection } from '../types/birth'
import type { BirthBackgroundDefinition, BirthSpiritRootDefinition, BirthTalentDefinition, StatModifiers } from '../types/content'
import type { GameState } from '../types/game'
import { createInitialGameState, type CreateGameStateOptions } from './gameState'
import { deriveCharacterName } from './nameEngine'
import { randomInt, seedToState, weightedPick } from './rng'
import { DAYS_PER_YEAR } from './timeEngine'

const BASE_STAT_MIN = 4
const BASE_STAT_MAX = 6
const SELECTED_BIRTH_MARKER = '::birth:'
export const PLAYABLE_START_AGE_YEARS = 16
export const PLAYABLE_START_AGE_DAYS = PLAYABLE_START_AGE_YEARS * DAYS_PER_YEAR

function applyStatModifiers(stats: GameState['stats'], modifiers: StatModifiers): GameState['stats'] {
  const nextStats = { ...stats }
  for (const [key, modifier] of Object.entries(modifiers)) {
    const statKey = key as keyof GameState['stats']
    nextStats[statKey] = Math.max(1, nextStats[statKey] + (modifier ?? 0))
  }
  return nextStats
}

function rollBaseStats(rngState: number): { stats: GameState['stats']; nextState: number } {
  let state = rngState
  const constitution = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX); state = constitution.nextState
  const comprehension = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX); state = comprehension.nextState
  const spiritSense = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX); state = spiritSense.nextState
  const mentality = randomInt(state, BASE_STAT_MIN, BASE_STAT_MAX); state = mentality.nextState
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

function adjustedRootWeight(root: BirthSpiritRootDefinition, background: BirthBackgroundDefinition): number {
  if (background.rootBias === 'ordinary') {
    if (root.kind === 'none') return root.weight * 1.35
    if (root.kind === 'variant' || (root.kind === 'elemental' && root.elements.length === 1)) return root.weight * 0.9
    return root.weight
  }
  if (background.rootBias === 'cultivator-contact') {
    if (root.kind === 'none') return root.weight * 0.8
    if (root.kind === 'variant' || (root.kind === 'elemental' && root.elements.length <= 2)) return root.weight * 1.1
    return root.weight
  }
  if (root.kind === 'none') return root.weight * 0.55
  if (root.kind === 'variant' || (root.kind === 'elemental' && root.elements.length <= 2)) return root.weight * 1.25
  return root.weight
}

function pickRoot(state: number, background: BirthBackgroundDefinition): { item: BirthSpiritRootDefinition; nextState: number } {
  const weighted = SPIRIT_ROOTS.map((root) => ({ ...root, weight: adjustedRootWeight(root, background) }))
  return weightedPick(state, weighted)
}

function adjustedTalentWeight(talent: BirthTalentDefinition, background: BirthBackgroundDefinition): number {
  return background.talentAffinities.includes(talent.id) ? talent.weight * 1.35 : talent.weight
}

function pickTalents(state: number, background: BirthBackgroundDefinition): { talents: BirthTalentDefinition[]; nextState: number } {
  const countRoll = randomInt(state, 1, 3)
  let nextState = countRoll.nextState
  let remaining = [...TALENTS]
  const talents: BirthTalentDefinition[] = []
  for (let index = 0; index < countRoll.value; index += 1) {
    const weighted = remaining.map((talent) => ({ ...talent, weight: adjustedTalentWeight(talent, background) }))
    const roll = weightedPick(nextState, weighted)
    nextState = roll.nextState
    const selected = remaining.find((talent) => talent.id === roll.item.id)
    if (!selected) throw new Error(`Birth talent is missing: ${roll.item.id}`)
    talents.push(selected)
    remaining = remaining.filter((talent) => talent.id !== selected.id)
  }
  return { talents, nextState }
}

function generateCandidate(state: number, runSeed: string, runId: string, index: number, remainingBackgrounds: readonly BirthBackgroundDefinition[]): { candidate: BirthCandidate; nextState: number; backgroundId: string } {
  const backgroundRoll = weightedPick(state, remainingBackgrounds)
  const background = backgroundRoll.item
  const rootRoll = pickRoot(backgroundRoll.nextState, background)
  const physiqueRoll = weightedPick(rootRoll.nextState, PHYSIQUES)
  const talentRoll = pickTalents(physiqueRoll.nextState, background)
  const baseStats = rollBaseStats(talentRoll.nextState)
  const stoneRoll = randomInt(baseStats.nextState, background.spiritStoneRange[0], background.spiritStoneRange[1])
  let stats = applyStatModifiers(baseStats.stats, background.statModifiers)
  stats = applyStatModifiers(stats, physiqueRoll.item.statModifiers)
  for (const talent of talentRoll.talents) stats = applyStatModifiers(stats, talent.statModifiers)

  return {
    candidate: {
      id: `${runId}:birth-candidate:${index}`,
      index,
      name: deriveCharacterName(`${runSeed}:candidate:${index}`, background.surname),
      backgroundId: background.id,
      spiritRootId: rootRoll.item.id,
      physiqueId: physiqueRoll.item.id,
      talentIds: talentRoll.talents.map((talent) => talent.id),
      stats,
      spiritStones: stoneRoll.value,
    },
    nextState: stoneRoll.nextState,
    backgroundId: background.id,
  }
}

export function generateBirthCandidates(options: CreateGameStateOptions): PendingBirthSelection {
  const runId = options.runId ?? `run-${options.runSeed}`
  let state = seedToState(`birth-selection:${options.runSeed}`)
  let remainingBackgrounds: BirthBackgroundDefinition[] = [...BACKGROUNDS]
  const candidates: BirthCandidate[] = []

  for (let index = 0; index < 3; index += 1) {
    const generated = generateCandidate(state, options.runSeed, runId, index, remainingBackgrounds)
    candidates.push(generated.candidate)
    state = generated.nextState
    remainingBackgrounds = remainingBackgrounds.filter((background) => background.id !== generated.backgroundId)
  }

  return { runSeed: options.runSeed, runId, candidates, nextRngState: state }
}

export function encodeSelectedBirthRunSeed(baseSeed: string, index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 2) throw new RangeError('Birth candidate index must be 0, 1, or 2')
  return `${baseSeed}${SELECTED_BIRTH_MARKER}${index}`
}

function decodeSelectedBirthRunSeed(runSeed: string): { baseSeed: string; index: number } | null {
  const markerIndex = runSeed.lastIndexOf(SELECTED_BIRTH_MARKER)
  if (markerIndex <= 0) return null
  const baseSeed = runSeed.slice(0, markerIndex)
  const rawIndex = runSeed.slice(markerIndex + SELECTED_BIRTH_MARKER.length)
  if (!/^[0-2]$/.test(rawIndex)) return null
  return { baseSeed, index: Number(rawIndex) }
}

function selectedBirthTags(candidate: BirthCandidate): { tags: string[]; flags: GameState['flags'] } {
  const background = BACKGROUNDS.find((item) => item.id === candidate.backgroundId)
  const root = SPIRIT_ROOTS.find((item) => item.id === candidate.spiritRootId)
  const physique = PHYSIQUES.find((item) => item.id === candidate.physiqueId)
  const talents = candidate.talentIds.map((id) => TALENTS.find((item) => item.id === id))
  if (!background || !root || !physique || talents.some((talent) => talent === undefined)) throw new Error('Birth candidate references missing content')

  const tags = new Set<string>([
    ...background.tags,
    root.id === 'none' ? 'no_spirit_root' : 'has_spirit_root',
    `spirit_root:${root.id}`,
    ...root.ruleTags,
    `birthplace_seed:${background.originId}`,
    `childhood_pool:${background.childhoodPoolId}`,
    ...background.resourceSeedTags.map((tag) => `birth_resource_seed:${tag}`),
    ...background.relationSeeds.map((seed) => `relation_seed:${seed.id}`),
    ...background.knownLocationSeeds.map((seed) => `location_seed:${seed.status}:${seed.id}`),
    ...background.adultEntryTags,
  ])

  if (physique.id !== 'none') {
    tags.add(`physique:${physique.id}`)
    for (const ruleTag of physique.ruleTags) tags.add(`physique_rule:${ruleTag}`)
  }
  for (const talent of talents as BirthTalentDefinition[]) {
    tags.add(`talent:${talent.id}`)
    for (const ruleTag of talent.ruleTags) tags.add(`talent_rule:${ruleTag}`)
  }

  return {
    tags: [...tags],
    flags: {
      birth_candidate_index: candidate.index,
      birth_resource_spirit_stones: candidate.spiritStones,
      birthplace_seed: background.originId,
      childhood_pool_id: background.childhoodPoolId,
    },
  }
}

function materializeSelectedCandidate(pending: PendingBirthSelection, candidate: BirthCandidate): GameState {
  const selectedRunSeed = encodeSelectedBirthRunSeed(pending.runSeed, candidate.index)
  const initial = createInitialGameState({ runSeed: selectedRunSeed, runId: pending.runId })
  const metadata = selectedBirthTags(candidate)
  return {
    ...initial,
    rngState: pending.nextRngState,
    lifeStage: 'childhood',
    worldDay: initial.identity.birthDay,
    identity: {
      ...initial.identity,
      name: candidate.name,
      backgroundId: candidate.backgroundId,
      spiritRootId: candidate.spiritRootId,
      physiqueIds: candidate.physiqueId === 'none' ? [] : [candidate.physiqueId],
      talentIds: [...candidate.talentIds],
    },
    stats: { ...candidate.stats },
    resources: { ...initial.resources, spiritStones: candidate.spiritStones },
    tags: metadata.tags,
    flags: { ...metadata.flags, birth_selection_seed: pending.runSeed },
  }
}

function generateLegacyBirthState(options: CreateGameStateOptions): GameState {
  const initial = createInitialGameState(options)
  const baseStatsRoll = rollBaseStats(initial.rngState)
  const backgroundRoll = weightedPick(baseStatsRoll.nextState, LEGACY_BIRTH_BACKGROUNDS)
  const rootRoll = weightedPick(backgroundRoll.nextState, LEGACY_BIRTH_SPIRIT_ROOTS)
  const firstTalentRoll = weightedPick(rootRoll.nextState, LEGACY_BIRTH_TALENTS)
  const remainingTalents = LEGACY_BIRTH_TALENTS.filter((talent) => talent.id !== firstTalentRoll.item.id)
  const secondTalentRoll = weightedPick(firstTalentRoll.nextState, remainingTalents)
  const selectedTalents = [firstTalentRoll.item, secondTalentRoll.item]

  let stats = applyStatModifiers(baseStatsRoll.stats, backgroundRoll.item.statModifiers)
  let spiritStones = backgroundRoll.item.spiritStones
  for (const talent of selectedTalents) {
    stats = applyStatModifiers(stats, talent.statModifiers)
    spiritStones += talent.spiritStones
  }
  const rootAvailabilityTag = rootRoll.item.id === 'none' ? 'no_spirit_root' : 'has_spirit_root'

  return {
    ...initial,
    worldDay: initial.identity.birthDay + PLAYABLE_START_AGE_DAYS,
    rngState: secondTalentRoll.nextState,
    identity: {
      ...initial.identity,
      name: deriveCharacterName(initial.runSeed),
      backgroundId: backgroundRoll.item.id,
      spiritRootId: rootRoll.item.id,
      talentIds: selectedTalents.map((talent) => talent.id),
    },
    stats,
    resources: { ...initial.resources, spiritStones },
    tags: [...backgroundRoll.item.tags, rootAvailabilityTag, `spirit_root:${rootRoll.item.id}`],
  }
}

export function generateBirthState(options: CreateGameStateOptions): GameState {
  const selected = decodeSelectedBirthRunSeed(options.runSeed)
  if (!selected) return generateLegacyBirthState(options)
  const pending = generateBirthCandidates({ runSeed: selected.baseSeed, runId: options.runId ?? `run-${selected.baseSeed}` })
  const candidate = pending.candidates[selected.index]
  if (!candidate) throw new Error(`Birth candidate ${selected.index} is missing`)
  return materializeSelectedCandidate(pending, candidate)
}
