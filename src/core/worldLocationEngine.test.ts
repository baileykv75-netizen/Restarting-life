import { describe, expect, it } from 'vitest'
import { getAdultEntryView, initializeAdultEntryState, resolveAdultEntryChoice } from './adultEntryEngine'
import { BACKGROUNDS } from '../data/backgrounds'
import { WORLD_LOCATIONS, getWorldLocationById } from '../data/worldLocations'
import type { BirthBackgroundDefinition } from '../types/content'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { encodeSelectedBirthRunSeed, generateBirthCandidates } from './birthEngine'
import { getAvailableChildhoodChoices, getCurrentChildhoodEvent } from './childhoodEngine'
import { createInitialGameState } from './gameState'
import { verifySessionReplay } from './replayEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { DAYS_PER_YEAR } from './timeEngine'
import { resolveWorldInitialization } from './worldLocationEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function birthTags(background: BirthBackgroundDefinition, hasRoot: boolean): string[] {
  return [
    ...background.tags,
    hasRoot ? 'has_spirit_root' : 'no_spirit_root',
    ...background.resourceSeedTags.map((tag) => `birth_resource_seed:${tag}`),
    ...background.relationSeeds.map((seed) => `relation_seed:${seed.id}`),
    ...background.knownLocationSeeds.map((seed) => `location_seed:${seed.status}:${seed.id}`),
    ...background.adultEntryTags,
  ]
}

function resolvedAdultState(backgroundId: string, withRoot = true): GameState {
  const background = BACKGROUNDS.find((entry) => entry.id === backgroundId)
  if (!background) throw new Error(`Missing background ${backgroundId}`)
  const base = createInitialGameState({ runSeed: `world-${backgroundId}-${withRoot}` })
  const adult = initializeAdultEntryState({
    ...base,
    lifeStage: 'adult',
    worldDay: 16 * DAYS_PER_YEAR,
    identity: { ...base.identity, backgroundId, spiritRootId: withRoot ? 'single_wood' : 'none' },
    tags: birthTags(background, withRoot),
  })
  const option = getAdultEntryView(adult)!.options[0]
  return resolveAdultEntryChoice(adult, option.id).state
}

describe('R08 fixed world skeleton', () => {
  it('defines exactly eleven unique fixed locations with valid symmetric adjacency', () => {
    expect(WORLD_LOCATIONS).toHaveLength(11)
    expect(new Set(WORLD_LOCATIONS.map((location) => location.id)).size).toBe(11)
    for (const location of WORLD_LOCATIONS) {
      expect(location.adjacentLocationIds.length).toBeGreaterThan(0)
      for (const adjacentId of location.adjacentLocationIds) {
        const adjacent = getWorldLocationById(adjacentId)
        expect(adjacent, `${location.id} -> ${adjacentId}`).toBeDefined()
        expect(adjacent?.adjacentLocationIds).toContain(location.id)
      }
      if (location.parentLocationId) expect(getWorldLocationById(location.parentLocationId)).toBeDefined()
    }
  })

  it('contains all canonical R08 location ids and valid parents for fixed subnodes', () => {
    const expected = ['baishi_village', 'qingstone_town', 'linhe_county', 'qingxia_market', 'qingyun_sect', 'blackwind_mountain', 'blackwind_foothill', 'lingxi_valley', 'lu_estate', 'beast_ridge', 'qingyun_family_quarters']
    for (const id of expected) expect(getWorldLocationById(id)).toBeDefined()
    expect(getWorldLocationById('blackwind_foothill')?.parentLocationId).toBe('blackwind_mountain')
    expect(getWorldLocationById('lu_estate')?.parentLocationId).toBe('lingxi_valley')
    expect(getWorldLocationById('qingyun_family_quarters')?.parentLocationId).toBe('qingyun_sect')
  })

  it('maps every background adult start to a legal fixed location without touching knowledge', () => {
    expect(BACKGROUNDS).toHaveLength(8)
    for (const background of BACKGROUNDS) {
      for (const withRoot of [true, false]) {
        const before = resolvedAdultState(background.id, withRoot)
        expect(before.world.currentLocationId).toBeNull()
        const knowledgeBefore = { ...before.knowledge.locations }
        const result = resolveWorldInitialization(before)
        expect(result.applied).toBe(true)
        expect(getWorldLocationById(result.state.world.currentLocationId ?? '')).toBeDefined()
        expect(result.state.knowledge.locations).toEqual(knowledgeBefore)
      }
    }
  })

  it('initializes current location only once and rejects legacy adult states', () => {
    const before = resolvedAdultState('lu_main_line', true)
    const first = resolveWorldInitialization(before)
    expect(first.applied).toBe(true)
    expect(first.state.world.currentLocationId).toBe('lu_estate')
    const second = resolveWorldInitialization(first.state)
    expect(second.applied).toBe(false)
    expect(second.reason).toBe('WORLD_ALREADY_INITIALIZED')
    expect(second.state).toEqual(first.state)

    const legacy = createInitialGameState({ runSeed: 'legacy-world-init' })
    expect(resolveWorldInitialization(legacy).applied).toBe(false)
  })

  it('persists the initialized current location across save/load', () => {
    const initialized = resolveWorldInitialization(resolvedAdultState('qingxia_loose_cultivator', true)).state
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state: initialized, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    expect(loadPersistentGame(storage)?.currentSession?.state.world.currentLocationId).toBe('qingxia_market')
  })

  it('replays world initialization through the existing session command log', () => {
    const pending = generateBirthCandidates({ runSeed: 'world-init-replay', runId: 'run-world-init-replay' })
    const encoded = encodeSelectedBirthRunSeed(pending.runSeed, pending.candidates[0].index)
    let session = createGameSession({ runSeed: encoded, runId: pending.runId })
    for (let step = 0; step < 2; step += 1) {
      const event = getCurrentChildhoodEvent(session.state)!
      const choice = getAvailableChildhoodChoices(session.state, event)[0]
      session = executeSessionCommand(session, { type: 'childhood-choice', choiceId: choice.id }).session
    }
    const adultOption = getAdultEntryView(session.state)!.options[0]
    session = executeSessionCommand(session, { type: 'adult-entry-choice', optionId: adultOption.id }).session
    const initialized = executeSessionCommand(session, { type: 'initialize-world' })
    expect(initialized.applied).toBe(true)
    session = initialized.session
    expect(getWorldLocationById(session.state.world.currentLocationId ?? '')).toBeDefined()
    expect(session.state.knowledge.locations).toEqual({})
    expect(verifySessionReplay(session)).toBe(true)
  })
})
