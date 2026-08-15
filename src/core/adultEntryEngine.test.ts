import { describe, expect, it } from 'vitest'
import { BACKGROUNDS } from '../data/backgrounds'
import type { BirthBackgroundDefinition } from '../types/content'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { encodeSelectedBirthRunSeed, generateBirthCandidates } from './birthEngine'
import { getAvailableChildhoodChoices, getCurrentChildhoodEvent } from './childhoodEngine'
import { createInitialGameState } from './gameState'
import { getAdultEntryView, initializeAdultEntryState, resolveAdultEntryChoice } from './adultEntryEngine'
import { verifySessionReplay } from './replayEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { DAYS_PER_YEAR } from './timeEngine'

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

function adultState(backgroundId: string, withRoot: boolean): GameState {
  const background = BACKGROUNDS.find((entry) => entry.id === backgroundId)
  if (!background) throw new Error(`Missing background ${backgroundId}`)
  const base = createInitialGameState({ runSeed: `adult-${backgroundId}-${withRoot}` })
  return initializeAdultEntryState({
    ...base,
    lifeStage: 'adult',
    worldDay: 16 * DAYS_PER_YEAR,
    identity: { ...base.identity, backgroundId, spiritRootId: withRoot ? 'single_wood' : 'none' },
    tags: birthTags(background, withRoot),
  })
}

describe('R07 adult entry engine', () => {
  it('creates a deterministic 2-3 option adult entry for all eight backgrounds', () => {
    expect(BACKGROUNDS).toHaveLength(8)
    for (const background of BACKGROUNDS) {
      for (const withRoot of [true, false]) {
        const first = getAdultEntryView(adultState(background.id, withRoot))
        const second = getAdultEntryView(adultState(background.id, withRoot))
        expect(first).not.toBeNull()
        expect(first?.progress).toEqual(second?.progress)
        expect(first?.options.length).toBeGreaterThanOrEqual(2)
        expect(first?.options.length).toBeLessThanOrEqual(3)
      }
    }
  })

  it('never exposes an ordinary cultivation-method entry to a no-root character', () => {
    for (const background of BACKGROUNDS) {
      const view = getAdultEntryView(adultState(background.id, false))!
      expect(view.options.some((option) => Boolean(option.cultivationMethodSeed))).toBe(false)
    }
  })

  it('keeps real rooted channels distinct for loose, Xie, Lu, and Qingyun families', () => {
    const expected: Record<string, string> = {
      qingxia_loose_cultivator: 'xiaozhoutian_tuna',
      xie_branch: 'xie_basic_qi_method',
      lu_main_line: 'lu_basic_qi_method',
      qingyun_steward_family: 'qingyuan_yinqi',
    }
    for (const [backgroundId, methodSeed] of Object.entries(expected)) {
      const view = getAdultEntryView(adultState(backgroundId, true))!
      expect(view.options.some((option) => option.cultivationMethodSeed === methodSeed)).toBe(true)
    }
  })

  it('lets R06 childhood evidence change the adult information shown', () => {
    const base = adultState('baishi_tenant', true)
    const withoutEvidence = getAdultEntryView(base)!
    const withEvidence = getAdultEntryView({ ...base, flags: { ...base.flags, childhood_saw_cultivator_signs: true } })!
    expect(withEvidence.contextNotes.length).toBeGreaterThan(withoutEvidence.contextNotes.length)
    expect(withEvidence.contextNotes.some((text) => text.includes('亲眼见过'))).toBe(true)
  })

  it('settles the adult direction once and records route/access/location in the same GameState', () => {
    const state = adultState('qingxia_loose_cultivator', true)
    const view = getAdultEntryView(state)!
    const methodOption = view.options.find((option) => option.cultivationMethodSeed === 'xiaozhoutian_tuna')!
    const result = resolveAdultEntryChoice(state, methodOption.id)
    expect(result.applied).toBe(true)
    expect(result.state.adultEntry?.resolved).toBe(true)
    expect(result.state.adultEntry?.startingLocationSeed).toBe('qingxia_market')
    expect(result.state.flags.cultivation_method_access_seed).toBe('xiaozhoutian_tuna')
    expect(result.state.world.currentLocationId).toBeNull()
    expect(result.state.knowledge.locations).toEqual({})
    expect(result.state.chronicle.at(-1)?.sourceType).toBe('lifeStage')
    expect(resolveAdultEntryChoice(result.state, methodOption.id).applied).toBe(false)
  })

  it('survives save/load without rerolling the selected adult entry', () => {
    const state = adultState('xie_branch', true)
    const option = getAdultEntryView(state)!.options[0]
    const resolved = resolveAdultEntryChoice(state, option.id).state
    const persistent: PersistentGame = { schemaVersion: 3, phase: 'life', currentSession: { state: resolved, debugLog: [], pendingResult: null, pendingAction: null }, pendingBirthSelection: null, archives: [], meta: { totalRuns: 1 } }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)
    expect(loaded?.currentSession?.state.adultEntry).toEqual(resolved.adultEntry)
    expect(loaded?.currentSession?.state.flags.adult_starting_location_seed).toBe(resolved.flags.adult_starting_location_seed)
  })

  it('replays childhood plus adult entry through the existing session command log', () => {
    const pending = generateBirthCandidates({ runSeed: 'adult-entry-replay', runId: 'run-adult-entry-replay' })
    const encoded = encodeSelectedBirthRunSeed(pending.runSeed, pending.candidates[0].index)
    let session = createGameSession({ runSeed: encoded, runId: pending.runId })
    for (let step = 0; step < 2; step += 1) {
      const event = getCurrentChildhoodEvent(session.state)!
      const choice = getAvailableChildhoodChoices(session.state, event)[0]
      const result = executeSessionCommand(session, { type: 'childhood-choice', choiceId: choice.id })
      expect(result.applied).toBe(true)
      session = result.session
    }
    expect(session.state.lifeStage).toBe('adult')
    const adultOption = getAdultEntryView(session.state)!.options[0]
    const adultResult = executeSessionCommand(session, { type: 'adult-entry-choice', optionId: adultOption.id })
    expect(adultResult.applied).toBe(true)
    session = adultResult.session
    expect(session.state.adultEntry?.resolved).toBe(true)
    expect(verifySessionReplay(session)).toBe(true)
  })
})
