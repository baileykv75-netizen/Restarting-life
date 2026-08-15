import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import type { SunkenVeinChamberRuntime } from '../types/secretRealm'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { encodeSelectedBirthRunSeed, generateBirthCandidates } from './birthEngine'
import { getAdultEntryView } from './adultEntryEngine'
import { getAvailableChildhoodChoices, getCurrentChildhoodEvent } from './childhoodEngine'
import { applyGameAction } from './gameActionReducer'
import { createInitialGameState } from './gameState'
import { nextRandom } from './rng'
import { verifySessionReplay } from './replayEngine'
import {
  generateSunkenVeinRewards,
  refreshSunkenVeinDiscovery,
  resolveSecretRealmAction,
  resolveSecretRealmInitialization,
  selectSunkenVeinAnchor,
} from './secretRealmEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { generateSublocationState } from './sublocationEngine'
import { DAYS_PER_YEAR } from './timeEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function preparedState(
  seed = 'r13-test',
  exploredDays = 30,
  options: { anchorDiscovered?: boolean; talentIds?: string[]; physiqueIds?: string[] } = {},
): GameState {
  const base = createInitialGameState({ runSeed: seed })
  const sublocations = generateSublocationState(seed)
  const provisional: GameState = {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: 'blackwind_mountain' },
    knowledge: { locations: { blackwind_mountain: 'discovered' } },
    flags: { location_knowledge_initialized: true, adult_entry_resolved: true },
    identity: {
      ...base.identity,
      talentIds: options.talentIds ?? [],
      physiqueIds: options.physiqueIds ?? [],
    },
    exploration: {
      locations: {
        blackwind_mountain: { locationId: 'blackwind_mountain', exploredDays },
      },
    },
    sublocations,
  }
  const anchor = selectSunkenVeinAnchor(provisional)
  if (!anchor) throw new Error('test state must have a Blackwind anchor')
  return {
    ...provisional,
    sublocations: {
      generated: {
        ...sublocations.generated,
        [anchor]: {
          ...sublocations.generated[anchor],
          discovered: options.anchorDiscovered ?? true,
        },
      },
    },
  }
}

function initializedState(seed = 'r13-initialized', exploredDays = 30): GameState {
  const result = resolveSecretRealmInitialization(preparedState(seed, exploredDays))
  if (!result.applied) throw new Error(result.reason)
  return result.state
}

function enter(state: GameState): GameState {
  const result = resolveSecretRealmAction(state, 'enter')
  if (!result.applied) throw new Error(result.reason)
  return result.state
}

function move(state: GameState, action: Parameters<typeof resolveSecretRealmAction>[1]): GameState {
  const result = resolveSecretRealmAction(state, action)
  if (!result.applied) throw new Error(result.reason)
  return result.state
}

function coreReadyState(seed = 'r13-core', realm: GameState['cultivation']['realm'] = 'foundation', stage = 1, safe = true): GameState {
  let state = initializedState(seed)
  state = { ...state, cultivation: { realm, stage } }
  state = enter(state)
  state = move(state, 'visit-side-room')
  state = move(state, 'inspect-side-room')
  state = move(state, 'return-corridor')
  state = move(state, 'visit-gate')
  state = move(state, safe ? 'open-gate-safe' : 'open-gate-force')
  state = move(state, 'confirm-core-entry')
  return state
}

function findRngStateForValue(min: number, max: number): number {
  for (let candidate = 1; candidate < 100_000; candidate += 1) {
    const value = nextRandom(candidate).value
    if (value >= min && value < max) return candidate
  }
  throw new Error(`could not find rng value in ${min}-${max}`)
}

describe('R13 Sunken Vein Chamber', () => {
  it('keeps the runtime optional for pre-R13 states', () => {
    expect(createInitialGameState({ runSeed: 'pre-r13' }).secretRealm).toBeUndefined()
  })

  it('bootstraps once without changing worldDay or the main RNG and anchors only to a Blackwind cave/ruin', () => {
    const state = preparedState('r13-bootstrap')
    const beforeDay = state.worldDay
    const beforeRng = state.rngState
    const result = resolveSecretRealmInitialization(state)
    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(beforeDay)
    expect(result.state.rngState).toBe(beforeRng)
    const runtime = result.state.secretRealm!.sunkenVeinChamber
    const anchor = result.state.sublocations!.generated[runtime.anchorSublocationId]
    expect(anchor.parentLocationId).toBe('blackwind_mountain')
    expect(['cave', 'ruin']).toContain(anchor.archetype)
    const again = resolveSecretRealmInitialization(result.state)
    expect(again.applied).toBe(false)
    expect(again.reason).toBe('SECRET_REALM_ALREADY_INITIALIZED')
  })

  it('selects one deterministic anchor per seed and varies across a sample of lives', () => {
    const same = preparedState('r13-anchor-same')
    expect(selectSunkenVeinAnchor(same)).toBe(selectSunkenVeinAnchor(same))
    const anchors = new Set(Array.from({ length: 24 }, (_, index) => {
      const state = preparedState(`r13-anchor-${index}`)
      return selectSunkenVeinAnchor(state)
    }))
    expect(anchors.size).toBeGreaterThan(1)
  })

  it('requires a discovered anchor and uses only real early-recognition traits at 15-29 days', () => {
    const ordinary = resolveSecretRealmInitialization(preparedState('r13-early-ordinary', 18))
    expect(ordinary.state.secretRealm!.sunkenVeinChamber.discovered).toBe(false)

    const observant = resolveSecretRealmInitialization(preparedState('r13-early-observant', 18, { talentIds: ['observant'] }))
    expect(observant.state.secretRealm!.sunkenVeinChamber.discovered).toBe(true)

    const emptyMind = resolveSecretRealmInitialization(preparedState('r13-early-empty', 18, { physiqueIds: ['empty_mind_platform'] }))
    expect(emptyMind.state.secretRealm!.sunkenVeinChamber.discovered).toBe(true)

    const hiddenAnchor = resolveSecretRealmInitialization(preparedState('r13-hidden-anchor', 30, { anchorDiscovered: false }))
    expect(hiddenAnchor.state.secretRealm!.sunkenVeinChamber.discovered).toBe(false)
  })

  it('discovers at 30+ days without a special trait and never pollutes fixed-world knowledge', () => {
    const state = preparedState('r13-thirty', 30)
    const beforeKnowledge = state.knowledge
    const result = resolveSecretRealmInitialization(state)
    expect(result.state.secretRealm!.sunkenVeinChamber.discovered).toBe(true)
    expect(result.state.knowledge).toEqual(beforeKnowledge)
    expect(result.state.chronicle.filter((entry) => entry.sourceId.includes('sunken-vein-chamber:discovery'))).toHaveLength(1)
  })

  it('can reveal an already-bootstrapped hidden chamber when later exploration facts become sufficient', () => {
    const bootstrapped = resolveSecretRealmInitialization(preparedState('r13-refresh', 18)).state
    expect(bootstrapped.secretRealm!.sunkenVeinChamber.discovered).toBe(false)
    const progressed: GameState = {
      ...bootstrapped,
      exploration: { locations: { blackwind_mountain: { locationId: 'blackwind_mountain', exploredDays: 30 } } },
    }
    const refreshed = refreshSunkenVeinDiscovery(progressed)
    expect(refreshed.secretRealm!.sunkenVeinChamber.discovered).toBe(true)
  })

  it('keeps fixed-world position in Blackwind while entering and navigating the five-node realm', () => {
    let state = enter(initializedState('r13-position'))
    expect(state.world.currentLocationId).toBe('blackwind_mountain')
    expect(state.secretRealm!.sunkenVeinChamber.currentNodeId).toBe('fissure-corridor')
    state = move(state, 'visit-herb-bed')
    expect(state.secretRealm!.sunkenVeinChamber.currentNodeId).toBe('seepage-herb-bed')
    state = move(state, 'return-corridor')
    state = move(state, 'visit-side-room')
    expect(state.secretRealm!.sunkenVeinChamber.currentNodeId).toBe('vein-guide-side-room')
    state = move(state, 'return-corridor')
    state = move(state, 'visit-gate')
    expect(state.secretRealm!.sunkenVeinChamber.currentNodeId).toBe('vein-lock-gate')
  })

  it('spends one day per outer inspection, claims each resource once, and side room grants the vent sequence', () => {
    let state = enter(initializedState('r13-outer'))
    const startDay = state.worldDay
    state = move(state, 'visit-herb-bed')
    state = move(state, 'inspect-herb-bed')
    expect(state.worldDay).toBe(startDay + 1)
    expect(state.secretRealm!.sunkenVeinChamber.nodeClaims.herbBed).toBe(true)
    expect(state.secretRealm!.sunkenVeinChamber.pendingMaterials.green_dew_grass).toBeGreaterThanOrEqual(2)
    const duplicate = resolveSecretRealmAction(state, 'inspect-herb-bed')
    expect(duplicate.applied).toBe(false)
    expect(duplicate.reason).toBe('SECRET_REALM_NODE_ALREADY_CLAIMED')

    state = move(state, 'return-corridor')
    state = move(state, 'visit-side-room')
    state = move(state, 'inspect-side-room')
    expect(state.worldDay).toBe(startDay + 2)
    expect(state.secretRealm!.sunkenVeinChamber.knowledge.ventSequence).toBe(true)
    expect(state.secretRealm!.sunkenVeinChamber.nodeClaims.sideRoom).toBe(true)
  })

  it('does not grant a node claim or knowledge if lifespan ends during its one-day inspection', () => {
    let state = enter(initializedState('r13-lifespan'))
    state = move(state, 'visit-side-room')
    state = {
      ...state,
      worldDay: state.identity.birthDay + 80 * DAYS_PER_YEAR - 1,
    }
    const result = resolveSecretRealmAction(state, 'inspect-side-room')
    expect(result.applied).toBe(true)
    expect(result.state.status).toBe('dead')
    expect(result.state.secretRealm!.sunkenVeinChamber.nodeClaims.sideRoom).toBe(false)
    expect(result.state.secretRealm!.sunkenVeinChamber.knowledge.ventSequence).toBe(false)
  })

  it('generates deterministic rewards within frozen bounds without touching the main RNG', () => {
    expect(generateSunkenVeinRewards('reward-same')).toEqual(generateSunkenVeinRewards('reward-same'))
    const rewards = generateSunkenVeinRewards('reward-bounds')
    expect(rewards.herbBed.green_dew_grass).toBeGreaterThanOrEqual(2)
    expect(rewards.herbBed.green_dew_grass).toBeLessThanOrEqual(4)
    expect(rewards.herbBed.water_spirit_moss).toBeGreaterThanOrEqual(1)
    expect(rewards.herbBed.water_spirit_moss).toBeLessThanOrEqual(3)
    expect(rewards.sideRoom.black_iron).toBeGreaterThanOrEqual(1)
    expect(rewards.sideRoom.black_iron).toBeLessThanOrEqual(3)
    expect(rewards.core.shattered_spirit_crystal).toBeGreaterThanOrEqual(2)
    expect(rewards.core.shattered_spirit_crystal).toBeLessThanOrEqual(4)
    expect(rewards.coreSpiritStones).toBeGreaterThanOrEqual(8)
    expect(rewards.coreSpiritStones).toBeLessThanOrEqual(15)
  })

  it('requires the side-room knowledge for safe opening, spends one day opening either way, and requires explicit core confirmation', () => {
    let force = enter(initializedState('r13-force'))
    force = move(force, 'visit-gate')
    const safeRejected = resolveSecretRealmAction(force, 'open-gate-safe')
    expect(safeRejected.applied).toBe(false)
    expect(safeRejected.reason).toBe('SECRET_REALM_VENT_SEQUENCE_UNKNOWN')
    const forceStart = force.worldDay
    force = move(force, 'open-gate-force')
    expect(force.worldDay).toBe(forceStart + 1)
    expect(force.secretRealm!.sunkenVeinChamber.currentNodeId).toBe('vein-lock-gate')
    expect(force.secretRealm!.sunkenVeinChamber.coreLockedBehindPlayer).toBe(false)
    force = move(force, 'confirm-core-entry')
    expect(force.secretRealm!.sunkenVeinChamber.currentNodeId).toBe('vein-heart-chamber')
    expect(force.secretRealm!.sunkenVeinChamber.coreLockedBehindPlayer).toBe(true)
    const returnAttempt = resolveSecretRealmAction(force, 'return-corridor')
    expect(returnAttempt.applied).toBe(false)
    expect(returnAttempt.reason).toBe('SECRET_REALM_CORE_LOCKED')
  })

  it('makes mortals die and Foundation cultivators win the dedicated seeded core encounter', () => {
    const mortal = coreReadyState('r13-mortal-death', 'mortal', 0, false)
    const mortalResult = resolveSecretRealmAction(mortal, 'resolve-core-encounter')
    expect(mortalResult.state.status).toBe('dead')
    expect(mortalResult.state.secretRealm!.sunkenVeinChamber.cleared).toBe(false)
    expect(mortalResult.state.secretRealm!.sunkenVeinChamber.nodeClaims.core).toBe(false)

    const foundation = coreReadyState('r13-foundation-win', 'foundation', 1, false)
    const foundationResult = resolveSecretRealmAction(foundation, 'resolve-core-encounter')
    expect(foundationResult.state.status).toBe('playing')
    expect(foundationResult.state.secretRealm!.sunkenVeinChamber.encounter).toBe('victory')
  })

  it('applies the frozen +10 percentage-point safe-gate modifier only to the temporary Qi encounter', () => {
    const rngState = findRngStateForValue(0.6, 0.7)
    const force = { ...coreReadyState('r13-qi-force', 'qi', 4, false), rngState }
    const safe = { ...coreReadyState('r13-qi-safe', 'qi', 4, true), rngState }
    expect(resolveSecretRealmAction(force, 'resolve-core-encounter').state.status).toBe('dead')
    const safeResult = resolveSecretRealmAction(safe, 'resolve-core-encounter')
    expect(safeResult.state.status).toBe('playing')
    expect(safeResult.state.secretRealm!.sunkenVeinChamber.encounter).toBe('victory')
  })

  it('clears the core once, pays spirit stones once, stores materials as pending claims, and permanently confirms the anchor', () => {
    let state = coreReadyState('r13-clear', 'foundation', 1, true)
    state = move(state, 'resolve-core-encounter')
    const beforeStones = state.resources.spiritStones
    const rewardStones = state.secretRealm!.sunkenVeinChamber.rewards.coreSpiritStones
    const cleared = resolveSecretRealmAction(state, 'vent-and-exit')
    expect(cleared.applied).toBe(true)
    state = cleared.state
    const runtime = state.secretRealm!.sunkenVeinChamber
    expect(runtime.cleared).toBe(true)
    expect(runtime.active).toBe(false)
    expect(runtime.coreLockedBehindPlayer).toBe(false)
    expect(runtime.nodeClaims.core).toBe(true)
    expect(runtime.knowledge.mineIncidentEvidence).toBe(true)
    expect(state.flags.sunken_vein_mine_incident_evidence).toBe(true)
    expect(state.resources.spiritStones).toBe(beforeStones + rewardStones)
    expect(runtime.pendingMaterials.rock_lizard_carapace).toBe(1)
    expect(runtime.pendingMaterials.shattered_spirit_crystal).toBeGreaterThanOrEqual(2)
    expect(state.sublocations!.generated[runtime.anchorSublocationId].deepConfirmed).toBe(true)
    expect(state.world.currentLocationId).toBe('blackwind_mountain')
    expect('inventory' in state).toBe(false)

    const reenter = resolveSecretRealmAction(state, 'enter')
    expect(reenter.applied).toBe(true)
    const noFarm = resolveSecretRealmAction(reenter.state, 'visit-herb-bed')
    expect(noFarm.applied).toBe(false)
    expect(noFarm.reason).toBe('SECRET_REALM_ALREADY_CLEARED')
    expect(reenter.state.resources.spiritStones).toBe(state.resources.spiritStones)
  })

  it('persists and deep-clones active realm node, claims, knowledge, lock, rewards, and pending materials', () => {
    let state = coreReadyState('r13-save', 'foundation', 1, true)
    state = { ...state, secretRealm: { sunkenVeinChamber: { ...state.secretRealm!.sunkenVeinChamber, pendingMaterials: { black_iron: 2 } } } }
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.secretRealm).toEqual(state.secretRealm)
    expect(loaded?.secretRealm).not.toBe(state.secretRealm)
    expect(loaded?.secretRealm?.sunkenVeinChamber.pendingMaterials).not.toBe(state.secretRealm!.sunkenVeinChamber.pendingMaterials)
    expect(loaded?.secretRealm?.sunkenVeinChamber.rewards).not.toBe(state.secretRealm!.sunkenVeinChamber.rewards)
  })

  it('replays bootstrap, discovery, entry and outer branch commands from a real selected birth', () => {
    const pending = generateBirthCandidates({ runSeed: 'r13-replay', runId: 'run-r13-replay' })
    const encoded = encodeSelectedBirthRunSeed(pending.runSeed, pending.candidates[0].index)
    let session = createGameSession({ runSeed: encoded, runId: pending.runId })
    for (let step = 0; step < 2; step += 1) {
      const event = getCurrentChildhoodEvent(session.state)!
      const choice = getAvailableChildhoodChoices(session.state, event)[0]
      session = executeSessionCommand(session, { type: 'childhood-choice', choiceId: choice.id }).session
    }
    const adultOption = getAdultEntryView(session.state)!.options[0]
    session = executeSessionCommand(session, { type: 'adult-entry-choice', optionId: adultOption.id }).session
    session = executeSessionCommand(session, { type: 'initialize-world' }).session
    session = executeSessionCommand(session, { type: 'initialize-location-knowledge' }).session
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'blackwind_mountain', status: 'discovered' } }).session
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'blackwind_mountain' } }).session
    session = executeSessionCommand(session, { type: 'game-action', action: { type: 'INITIALIZE_SUBLOCATIONS' } }).session
    session = executeSessionCommand(session, { type: 'initialize-secret-realm' }).session
    session = executeSessionCommand(session, { type: 'explore-region', days: 10 }).session
    session = executeSessionCommand(session, { type: 'explore-region', days: 10 }).session
    session = executeSessionCommand(session, { type: 'explore-region', days: 10 }).session
    expect(session.state.secretRealm!.sunkenVeinChamber.discovered).toBe(true)
    session = executeSessionCommand(session, { type: 'secret-realm', action: 'enter' }).session
    session = executeSessionCommand(session, { type: 'secret-realm', action: 'visit-side-room' }).session
    session = executeSessionCommand(session, { type: 'secret-realm', action: 'inspect-side-room' }).session
    expect(session.state.secretRealm!.sunkenVeinChamber.knowledge.ventSequence).toBe(true)
    expect(verifySessionReplay(session)).toBe(true)
  })
})
