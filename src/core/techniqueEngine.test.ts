import { describe, expect, it } from 'vitest'
import { R16_TECHNIQUES, TECHNIQUES, getTechniqueById } from '../data/techniques'
import type { GameState } from '../types/game'
import type { GameSession, PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { calculateCultivationPreview, resolveCultivateDays, resolveCultivationInitialization, resolveMainTechniqueSelection } from './cultivationEngine'
import { createInitialGameState } from './gameState'
import { executeSessionCommand } from './sessionEngine'
import { getGameStateDigest } from './stateDigest'
import {
  PROFICIENCY_THRESHOLDS,
  getMainTechniqueChangePreview,
  getProficiencyStage,
  getTechniqueProficiencyPoints,
  getTechniqueProficiencyStage,
  isTechniqueMoveUnlocked,
  resolveChangeMainTechnique,
  resolveSetAuxiliaryTechnique,
  resolveTechniquePracticeDays,
  resolveTechniqueSystemInitialization,
} from './techniqueEngine'
import { DAYS_PER_YEAR } from './timeEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function adultState(seed = 'r17-base'): GameState {
  const base = createInitialGameState({ runSeed: seed })
  return {
    ...base,
    lifeStage: 'adult',
    worldDay: 16 * DAYS_PER_YEAR,
    adultEntry: {
      optionIds: ['a', 'b'],
      selectedOptionId: 'a',
      resolved: true,
      originLocationSeed: 'qingxia_market',
      startingLocationSeed: 'qingxia_market',
    },
    identity: { ...base.identity, spiritRootId: 'single_fire' },
    flags: {
      cultivation_method_access_seed: 'xiaozhoutian_tuna',
      adult_entry_resolved: true,
      location_knowledge_initialized: true,
    },
    world: { currentLocationId: 'qingxia_market' },
  }
}

function techniqueState(
  seed = 'r17-state',
  known: string[] = ['xiaozhoutian_tuna'],
  mainTechniqueId: string | null = 'xiaozhoutian_tuna',
  talentIds: string[] = [],
): GameState {
  const initialized = resolveCultivationInitialization(adultState(seed))
  if (!initialized.applied) throw new Error(initialized.reason)
  let state: GameState = {
    ...initialized.state,
    identity: { ...initialized.state.identity, talentIds },
    cultivation: { ...initialized.state.cultivation, knownTechniqueIds: [...known] },
  }
  if (mainTechniqueId) {
    const selected = resolveMainTechniqueSelection(state, mainTechniqueId)
    if (!selected.applied) throw new Error(selected.reason)
    state = selected.state
  }
  const r17 = resolveTechniqueSystemInitialization(state)
  if (!r17.applied) throw new Error(r17.reason)
  return r17.state
}

function withActiveSecretRealm(state: GameState): GameState {
  return {
    ...state,
    secretRealm: {
      sunkenVeinChamber: {
        anchorSublocationId: 'test-anchor',
        discovered: true,
        active: true,
        currentNodeId: 'fissure-corridor',
        gateOpened: false,
        gateMethod: null,
        coreLockedBehindPlayer: false,
        cleared: false,
        nodeClaims: { herbBed: false, sideRoom: false, core: false },
        knowledge: { ventSequence: false, mineIncidentEvidence: false },
        pendingMaterials: {},
        rewards: { herbBed: {}, sideRoom: {}, core: {}, coreSpiritStones: 0 },
        encounter: 'unresolved',
      },
    },
  }
}

describe('R17 technique registry and practice state', () => {
  it('keeps the six R16 cultivation definitions and only data-registers existing additional techniques', () => {
    expect(R16_TECHNIQUES).toHaveLength(6)
    expect(R16_TECHNIQUES.every((entry) => entry.category === 'main' && typeof entry.baseEfficiency === 'number')).toBe(true)
    expect(getTechniqueById('gengjin_ruili')?.baseEfficiency).toBeUndefined()
    expect(getTechniqueById('qingfeng_jianjue')?.category).toBe('combat')
    expect(getTechniqueById('ranxue_jue')?.category).toBe('secret')
    expect(TECHNIQUES.some((entry) => entry.name === '《雷引诀》')).toBe(true)
  })

  it('initializes R17 explicitly without changing time/RNG and never adds unknown techniques', () => {
    const r16 = resolveCultivationInitialization(adultState('r17-init')).state
    const before = { ...r16, cultivation: { ...r16.cultivation, knownTechniqueIds: ['xiaozhoutian_tuna'] } }
    expect(before.cultivation.techniqueSystemInitialized).toBeUndefined()
    const result = resolveTechniqueSystemInitialization(before)
    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(before.worldDay)
    expect(result.state.rngState).toBe(before.rngState)
    expect(result.state.cultivation.knownTechniqueIds).toEqual(['xiaozhoutian_tuna'])
    expect(result.state.cultivation.techniquePractice).toEqual({ xiaozhoutian_tuna: { proficiencyPoints: 0 } })
    expect(resolveTechniqueSystemInitialization(result.state).reason).toBe('TECHNIQUE_SYSTEM_ALREADY_INITIALIZED')
  })

  it('derives the four proficiency stages only from points', () => {
    expect(getProficiencyStage(0)).toBe('entry')
    expect(getProficiencyStage(999)).toBe('entry')
    expect(getProficiencyStage(1000)).toBe('skilled')
    expect(getProficiencyStage(2999)).toBe('skilled')
    expect(getProficiencyStage(3000)).toBe('minor')
    expect(getProficiencyStage(5999)).toBe('minor')
    expect(getProficiencyStage(6000)).toBe('major')
    const state = techniqueState('r17-derived-stage')
    expect(state.cultivation.techniquePractice?.xiaozhoutian_tuna).toEqual({ proficiencyPoints: 0 })
    expect('stage' in (state.cultivation.techniquePractice?.xiaozhoutian_tuna ?? {})).toBe(false)
  })

  it('rejects unknown techniques, non-main main selection, and main techniques as auxiliaries', () => {
    let state = techniqueState('r17-validation', ['xiaozhoutian_tuna', 'qingfeng_jianjue'])
    expect(resolveSetAuxiliaryTechnique(state, 'missing-technique', true).reason).toBe('TECHNIQUE_NOT_KNOWN')
    expect(resolveSetAuxiliaryTechnique(state, 'xiaozhoutian_tuna', true).reason).toBe('MAIN_TECHNIQUE_CANNOT_BE_AUXILIARY')
    expect(resolveTechniquePracticeDays(state, 'missing-technique', 3).reason).toBe('TECHNIQUE_NOT_KNOWN')

    state = { ...state, cultivation: { ...state.cultivation, mainTechniqueId: null } }
    expect(resolveMainTechniqueSelection(state, 'qingfeng_jianjue').reason).toBe('TECHNIQUE_NOT_MAIN')
  })

  it('configures multiple known non-main techniques without copying or changing the known list', () => {
    const state = techniqueState('r17-aux', ['xiaozhoutian_tuna', 'qingfeng_jianjue', 'qingshen_shu'])
    const knownBefore = [...(state.cultivation.knownTechniqueIds ?? [])]
    const first = resolveSetAuxiliaryTechnique(state, 'qingfeng_jianjue', true)
    const second = resolveSetAuxiliaryTechnique(first.state, 'qingshen_shu', true)
    expect(second.state.cultivation.auxiliaryTechniqueIds).toEqual(['qingfeng_jianjue', 'qingshen_shu'])
    expect(second.state.cultivation.knownTechniqueIds).toEqual(knownBefore)
    const removed = resolveSetAuxiliaryTechnique(second.state, 'qingfeng_jianjue', false)
    expect(removed.state.cultivation.auxiliaryTechniqueIds).toEqual(['qingshen_shu'])
    expect(removed.state.cultivation.knownTechniqueIds).toEqual(knownBefore)
  })

  it('adds main proficiency during real cultivation without letting quick_study increase cultivation gain', () => {
    const normal = techniqueState('r17-main-practice')
    const quick = techniqueState('r17-main-practice-quick', ['xiaozhoutian_tuna'], 'xiaozhoutian_tuna', ['quick_study'])
    expect(calculateCultivationPreview(normal, 'xiaozhoutian_tuna', 10)?.gain).toBe(calculateCultivationPreview(quick, 'xiaozhoutian_tuna', 10)?.gain)

    const normalResult = resolveCultivateDays(normal, 10)
    const quickResult = resolveCultivateDays(quick, 10)
    expect(normalResult.state.resources.cultivation).toBe(quickResult.state.resources.cultivation)
    expect(getTechniqueProficiencyPoints(normalResult.state, 'xiaozhoutian_tuna')).toBe(200)
    expect(getTechniqueProficiencyPoints(quickResult.state, 'xiaozhoutian_tuna')).toBe(230)
  })

  it('preserves old R16 replay semantics until the explicit R17 initializer appears', () => {
    const initialized = resolveCultivationInitialization(adultState('r17-old-r16')).state
    const selected = resolveMainTechniqueSelection(initialized, 'xiaozhoutian_tuna').state
    const result = resolveCultivateDays(selected, 10)
    expect(result.applied).toBe(true)
    expect(result.state.cultivation.techniqueSystemInitialized).toBeUndefined()
    expect(result.state.cultivation.techniquePractice).toBeUndefined()
  })

  it('dedicated practice advances only time and proficiency, with natural death taking priority', () => {
    let state = techniqueState('r17-special-practice', ['xiaozhoutian_tuna', 'qingfeng_jianjue'])
    state = { ...state, resources: { ...state.resources, cultivation: 432 } }
    const result = resolveTechniquePracticeDays(state, 'qingfeng_jianjue', 10)
    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(state.worldDay + 10)
    expect(result.state.resources.cultivation).toBe(432)
    expect(getTechniqueProficiencyPoints(result.state, 'qingfeng_jianjue')).toBe(200)

    const dying = { ...state, worldDay: state.identity.birthDay + 80 * DAYS_PER_YEAR - 1 }
    const dead = resolveTechniquePracticeDays(dying, 'qingfeng_jianjue', 3)
    expect(dead.applied).toBe(true)
    expect(dead.completed).toBe(false)
    expect(dead.state.status).toBe('dead')
    expect(getTechniqueProficiencyPoints(dead.state, 'qingfeng_jianjue')).toBe(0)
  })

  it('uses the frozen Qingfeng sword move gate and invents no extra move thresholds', () => {
    const sword = getTechniqueById('qingfeng_jianjue')!
    const chase = sword.moves!.find((move) => move.id === 'sword_chase')!
    const thrust = sword.moves!.find((move) => move.id === 'thrust')!
    let state = techniqueState('r17-moves', ['xiaozhoutian_tuna', 'qingfeng_jianjue'])
    state = {
      ...state,
      cultivation: {
        ...state.cultivation,
        techniquePractice: { ...state.cultivation.techniquePractice, qingfeng_jianjue: { proficiencyPoints: PROFICIENCY_THRESHOLDS.minor - 1 } },
      },
    }
    expect(isTechniqueMoveUnlocked(state, 'qingfeng_jianjue', thrust)).toBe(true)
    expect(isTechniqueMoveUnlocked(state, 'qingfeng_jianjue', chase)).toBe(false)
    state = {
      ...state,
      cultivation: {
        ...state.cultivation,
        techniquePractice: { ...state.cultivation.techniquePractice, qingfeng_jianjue: { proficiencyPoints: PROFICIENCY_THRESHOLDS.minor } },
      },
    }
    expect(isTechniqueMoveUnlocked(state, 'qingfeng_jianjue', chase)).toBe(true)
    expect(thrust.requiredProficiency).toBeUndefined()
  })
})

describe('R17 main-technique adaptation', () => {
  it('keeps first selection free but requires adaptation once R17 is initialized', () => {
    const r16 = resolveCultivationInitialization(adultState('r17-first-main')).state
    const withTwo = { ...r16, cultivation: { ...r16.cultivation, knownTechniqueIds: ['xiaozhoutian_tuna', 'qingyuan_yinqi'] } }
    expect(resolveMainTechniqueSelection(withTwo, 'xiaozhoutian_tuna').applied).toBe(true)

    const initialized = resolveTechniqueSystemInitialization(resolveMainTechniqueSelection(withTwo, 'xiaozhoutian_tuna').state).state
    expect(resolveMainTechniqueSelection(initialized, 'qingyuan_yinqi').reason).toBe('MAIN_TECHNIQUE_CHANGE_REQUIRES_ADAPTATION')
  })

  it('calculates the three adaptation tiers and quick_study time reduction', () => {
    const similar = techniqueState('r17-similar', ['xiaozhoutian_tuna', 'qingyuan_yinqi'])
    expect(getMainTechniqueChangePreview(similar, 'qingyuan_yinqi')).toMatchObject({ adaptationDays: 3, cultivationLossRatio: 0.05 })

    const moderate = techniqueState('r17-moderate', ['xiaozhoutian_tuna', 'chiyang_jue'])
    expect(getMainTechniqueChangePreview(moderate, 'chiyang_jue')).toMatchObject({ adaptationDays: 7, cultivationLossRatio: 0.1 })

    const major = techniqueState('r17-major', ['chiyang_jue', 'hanshui_jing'], 'chiyang_jue')
    expect(getMainTechniqueChangePreview(major, 'hanshui_jing')).toMatchObject({ adaptationDays: 14, cultivationLossRatio: 0.2 })

    const quick = techniqueState('r17-major-quick', ['chiyang_jue', 'hanshui_jing'], 'chiyang_jue', ['quick_study'])
    expect(getMainTechniqueChangePreview(quick, 'hanshui_jing')?.adaptationDays).toBe(12)
  })

  it('loses only current-stage cultivation, never the realm/layer, and advances time', () => {
    let state = techniqueState('r17-change', ['xiaozhoutian_tuna', 'qingyuan_yinqi'])
    state = {
      ...state,
      cultivation: { ...state.cultivation, realm: 'qi', stage: 4 },
      resources: { ...state.resources, cultivation: 800 },
    }
    const result = resolveChangeMainTechnique(state, 'qingyuan_yinqi')
    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(state.worldDay + 3)
    expect(result.state.cultivation.realm).toBe('qi')
    expect(result.state.cultivation.stage).toBe(4)
    expect(result.state.resources.cultivation).toBe(760)
    expect(result.state.cultivation.mainTechniqueId).toBe('qingyuan_yinqi')
  })

  it('blocks dedicated practice inside an active secret realm', () => {
    const state = withActiveSecretRealm(techniqueState('r17-secret-realm', ['xiaozhoutian_tuna', 'qingfeng_jianjue']))
    expect(resolveTechniquePracticeDays(state, 'qingfeng_jianjue', 3).reason).toBe('SECRET_REALM_ACTIVE')
    expect(resolveChangeMainTechnique({ ...state, cultivation: { ...state.cultivation, knownTechniqueIds: ['xiaozhoutian_tuna', 'qingyuan_yinqi'] } }, 'qingyuan_yinqi').reason).toBe('SECRET_REALM_ACTIVE')
  })
})

describe('R17 save and session replay', () => {
  it('deep-clones auxiliary ids and technique practice on save/reload', () => {
    let state = techniqueState('r17-save', ['xiaozhoutian_tuna', 'qingfeng_jianjue'])
    state = resolveSetAuxiliaryTechnique(state, 'qingfeng_jianjue', true).state
    state = resolveTechniquePracticeDays(state, 'qingfeng_jianjue', 3).state
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
    expect(loaded?.cultivation).toEqual(state.cultivation)
    expect(loaded?.cultivation.knownTechniqueIds).not.toBe(state.cultivation.knownTechniqueIds)
    expect(loaded?.cultivation.auxiliaryTechniqueIds).not.toBe(state.cultivation.auxiliaryTechniqueIds)
    expect(loaded?.cultivation.techniquePractice).not.toBe(state.cultivation.techniquePractice)
    expect(loaded?.cultivation.techniquePractice?.qingfeng_jianjue).not.toBe(state.cultivation.techniquePractice?.qingfeng_jianjue)
  })

  it('replays explicit R17 initialization, auxiliary configuration and practice deterministically', () => {
    const r16 = resolveCultivationInitialization(adultState('r17-replay')).state
    let state: GameState = { ...r16, cultivation: { ...r16.cultivation, knownTechniqueIds: ['xiaozhoutian_tuna', 'qingfeng_jianjue'] } }
    state = resolveMainTechniqueSelection(state, 'xiaozhoutian_tuna').state
    const initial: GameSession = { state, debugLog: [], pendingResult: null, pendingAction: null }

    const run = () => {
      const initialized = executeSessionCommand(initial, { type: 'initialize-technique-system' })
      expect(initialized.applied).toBe(true)
      const auxiliary = executeSessionCommand(initialized.session, { type: 'set-auxiliary-technique', techniqueId: 'qingfeng_jianjue', enabled: true })
      expect(auxiliary.applied).toBe(true)
      const practiced = executeSessionCommand(auxiliary.session, { type: 'practice-technique-days', techniqueId: 'qingfeng_jianjue', days: 3 })
      expect(practiced.applied).toBe(true)
      expect(practiced.session.pendingResult).not.toBeNull()
      expect(executeSessionCommand(practiced.session, { type: 'set-auxiliary-technique', techniqueId: 'qingfeng_jianjue', enabled: false }).reason).toBe('RESULT_PENDING')
      return practiced.session
    }

    const first = run()
    const second = run()
    expect(first.debugLog.map((entry) => entry.command)).toEqual(second.debugLog.map((entry) => entry.command))
    expect(getGameStateDigest(first.state)).toBe(getGameStateDigest(second.state))
  })
})
