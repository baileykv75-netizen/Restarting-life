import { describe, expect, it } from 'vitest'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { resolveCultivateDays } from './cultivationEngine'
import { createInitialGameState } from './gameState'
import { verifySessionReplay } from './replayEngine'
import { resolveAcceptSectAssignment, resolveSettleSectAssignment } from './sectAssignmentEngine'
import {
  getQingyunMentorOffers,
  getSectViolationHistory,
  getViolationActionAvailability,
  resolveAcceptQingyunMaster,
  resolveBetrayQingyunSect,
  resolveCommitSectViolation,
  resolveReceiveMasterGuidance,
} from './sectConsequenceEngine'
import { getSectAccess, isActiveQingyunMember, isFormerQingyunMember } from './sectMembershipEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function memberState(seed = 'r26-member', contribution = 30): GameState {
  const base = createInitialGameState({ runSeed: seed, runId: `run-${seed}` })
  return {
    ...base,
    lifeStage: 'adult',
    identity: { ...base.identity, backgroundId: 'baishi_tenant', spiritRootId: 'single_wood', faction: 'qingyun' },
    resources: { spiritStones: 30, cultivation: 120 },
    cultivation: {
      realm: 'qi', stage: 3,
      practiceInitialized: true,
      knownTechniqueIds: ['qingyuan_yinqi'],
      mainTechniqueId: 'qingyuan_yinqi',
      techniqueSystemInitialized: true,
      auxiliaryTechniqueIds: [],
      techniquePractice: { qingyuan_yinqi: { proficiencyPoints: 0 } },
    },
    sectMembership: { sectId: 'qingyun', rank: 'outer', joinedDay: 0, joinPath: 'regular-recruitment', status: 'active', violations: [] },
    sectProgress: { contribution, history: [] },
    world: { currentLocationId: 'qingyun_sect' },
    knowledge: { locations: { qingyun_sect: 'discovered', blackwind_mountain: 'discovered', lingxi_valley: 'discovered', qingxia_market: 'discovered' } },
    flags: { ...base.flags, location_knowledge_initialized: true },
    inventory: { stacks: {}, baseCapacitySlots: 12, storageBagItemId: null },
  }
}

function withSettled(state: GameState, assignmentId: 'qingyun_blackwind_patrol' | 'qingyun_greenback_cull' | 'qingyun_lingxi_herb_collection', contributionDelta: number): GameState {
  return {
    ...state,
    sectProgress: {
      contribution: state.sectProgress?.contribution ?? 0,
      history: [{ assignmentId, outcome: 'settled', resolvedDay: state.worldDay, contributionDelta }],
    },
  }
}

function findReplayRootSeed(): string {
  for (let index = 0; index < 300; index += 1) {
    const seed = `r26-replay-${index}`
    if (createGameSession({ runSeed: seed, runId: `run-${seed}` }).state.identity.spiritRootId !== 'none') return seed
  }
  throw new Error('No replay seed with spirit root found')
}

describe('R26 Qingyun mentorship, discipline and exit consequences', () => {
  it('does not let outsiders or service workers enter formal Qingyun mentorship', () => {
    const outsider = { ...memberState('r26-outsider'), sectMembership: undefined, identity: { ...memberState('r26-outsider').identity, faction: 'loose' as const } }
    expect(getQingyunMentorOffers(outsider).every((offer) => !offer.available)).toBe(true)
    expect(resolveAcceptQingyunMaster(outsider, 'qingyun_lin_zhaochuan').applied).toBe(false)

    const service: GameState = {
      ...memberState('r26-service'),
      sectMembership: { sectId: 'qingyun', rank: 'service', joinedDay: 0, joinPath: 'mortal-service', status: 'active' },
    }
    expect(getQingyunMentorOffers(service).every((offer) => !offer.available)).toBe(true)
  })

  it('makes mentor conditions depend on real settled affairs and contribution', () => {
    const plain = memberState('r26-offers', 30)
    const noWork = getQingyunMentorOffers(plain)
    expect(noWork.find((offer) => offer.definition.id === 'qingyun_lin_zhaochuan')?.available).toBe(false)
    expect(noWork.find((offer) => offer.definition.id === 'qingyun_lu_qingyi')?.available).toBe(false)

    const patrol = withSettled(plain, 'qingyun_blackwind_patrol', 10)
    expect(getQingyunMentorOffers(patrol).find((offer) => offer.definition.id === 'qingyun_lin_zhaochuan')?.available).toBe(true)

    const herb = withSettled(memberState('r26-lu', 8), 'qingyun_lingxi_herb_collection', 8)
    expect(getQingyunMentorOffers(herb).find((offer) => offer.definition.id === 'qingyun_lu_qingyi')?.available).toBe(true)
  })

  it('records exactly one formal master and grants real technique access plus one guidance use', () => {
    const qualified = withSettled(memberState('r26-master', 30), 'qingyun_blackwind_patrol', 10)
    const accepted = resolveAcceptQingyunMaster(qualified, 'qingyun_lin_zhaochuan')
    expect(accepted.applied).toBe(true)
    expect(accepted.state.sectMembership?.mastership).toMatchObject({ masterNpcId: 'qingyun_lin_zhaochuan', status: 'active', guidanceUsesRemaining: 1 })
    expect(accepted.state.cultivation.knownTechniqueIds).toEqual(expect.arrayContaining(['qingfeng_jianjue', 'liuyun_bu']))
    expect(resolveAcceptQingyunMaster(accepted.state, 'qingyun_lu_qingyi').applied).toBe(false)

    const baseline = resolveCultivateDays(accepted.state, 10)
    const guided = resolveReceiveMasterGuidance(accepted.state)
    expect(guided.applied).toBe(true)
    expect(guided.state.worldDay).toBe(accepted.state.worldDay + 10)
    expect(guided.state.resources.cultivation).toBeGreaterThan(baseline.state.resources.cultivation)
    expect(guided.state.sectMembership?.mastership?.guidanceUsesRemaining).toBe(0)
    expect(resolveReceiveMasterGuidance(guided.state).reason).toBe('MASTER_GUIDANCE_ALREADY_USED')
  })

  it('escalates repeated inner-resource trespass from light to medium without inventing a discipline currency', () => {
    const first = resolveCommitSectViolation(memberState('r26-trespass', 30), 'inner_resource_trespass')
    expect(first.applied).toBe(true)
    expect(getSectViolationHistory(first.state)[0]).toMatchObject({ severity: 'light', expelled: false })
    expect(first.state.sectProgress?.contribution).toBe(27)

    const second = resolveCommitSectViolation(first.state, 'inner_resource_trespass')
    expect(second.applied).toBe(true)
    expect(getSectViolationHistory(second.state)[1]).toMatchObject({ severity: 'medium', expelled: false })
    expect(second.state.sectProgress?.contribution).toBe(17)
    expect(second.state.resources.spiritStones).toBe(25)
    expect(isActiveQingyunMember(second.state)).toBe(true)
  })

  it('uses core-inheritance trespass as a real heavy violation that expels the disciple immediately', () => {
    const start = memberState('r26-expel', 30)
    const result = resolveCommitSectViolation(start, 'core_inheritance_trespass')
    expect(result.applied).toBe(true)
    expect(getSectViolationHistory(result.state).at(-1)).toMatchObject({ severity: 'heavy', expelled: true })
    expect(result.state.sectMembership?.status).toBe('ended')
    expect(result.state.sectMembership?.exitReason).toBe('expelled')
    expect(result.state.identity.faction).toBe('loose')
    expect(isFormerQingyunMember(result.state)).toBe(true)
    expect(getSectAccess(result.state).affairsHallEntry).toBe(false)
    expect(getSectAccess(result.state).basicTeaching).toBe(false)
    expect(result.state.cultivation.knownTechniqueIds).toContain('qingyuan_yinqi')
    expect(result.state.chronicle.some((entry) => entry.title === '被逐出青云宗')).toBe(true)
  })

  it('offers the separate restricted-technique violation only when the character really knows an evil technique', () => {
    const normal = memberState('r26-evil-normal')
    expect(getViolationActionAvailability(normal, 'public_evil_practice').available).toBe(false)
    const evil: GameState = { ...normal, cultivation: { ...normal.cultivation, knownTechniqueIds: [...(normal.cultivation.knownTechniqueIds ?? []), 'yinsui_lu_fragment'] } }
    expect(getViolationActionAvailability(evil, 'public_evil_practice')).toMatchObject({ available: true, severity: 'heavy' })
    expect(resolveCommitSectViolation(evil, 'public_evil_practice').state.sectMembership?.exitReason).toBe('expelled')
  })

  it('distinguishes active betrayal from expulsion, ends mentorship, abandons active R25 work and keeps contribution history', () => {
    let state = withSettled(memberState('r26-betray', 30), 'qingyun_blackwind_patrol', 10)
    const master = resolveAcceptQingyunMaster(state, 'qingyun_lin_zhaochuan')
    expect(master.applied).toBe(true)
    state = master.state
    const acceptedAssignment = resolveAcceptSectAssignment(state, 'qingyun_qingxia_escort')
    expect(acceptedAssignment.applied).toBe(true)

    const betrayed = resolveBetrayQingyunSect(acceptedAssignment.state)
    expect(betrayed.applied).toBe(true)
    expect(betrayed.state.sectMembership).toMatchObject({ status: 'ended', exitReason: 'betrayed' })
    expect(betrayed.state.identity.faction).toBe('loose')
    expect(betrayed.state.sectMembership?.mastership).toMatchObject({ status: 'ended', endedReason: 'betrayed' })
    expect(betrayed.state.sectProgress?.activeAssignment).toBeUndefined()
    expect(betrayed.state.sectProgress?.history.some((entry) => entry.assignmentId === 'qingyun_qingxia_escort' && entry.outcome === 'abandoned')).toBe(true)
    expect(betrayed.state.sectProgress?.contribution).toBe(30)
    expect(resolveSettleSectAssignment(betrayed.state).applied).toBe(false)
    expect(getSectAccess(betrayed.state).discipleCultivationArea).toBe(false)
    expect(betrayed.state.cultivation.knownTechniqueIds).toEqual(expect.arrayContaining(['qingfeng_jianjue', 'liuyun_bu']))
  })

  it('persists former membership, mentor ending and violation history through save/reload', () => {
    const expelled = resolveCommitSectViolation(memberState('r26-persist', 30), 'core_inheritance_trespass').state
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state: expelled, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.sectMembership).toEqual(expelled.sectMembership)
    expect(loaded && isFormerQingyunMember(loaded)).toBe(true)
  })

  it('replays a join followed by deliberate heavy violation deterministically', () => {
    const seed = findReplayRootSeed()
    let session = createGameSession({ runSeed: seed, runId: `run-${seed}` })
    const commands = [
      { type: 'game-action', action: { type: 'SET_LIFE_STAGE', stage: 'adult' } },
      { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'qingyun_sect' } },
      { type: 'game-action', action: { type: 'JOIN_QINGYUN_SECT' } },
      { type: 'game-action', action: { type: 'COMMIT_SECT_VIOLATION', violationId: 'core_inheritance_trespass' } },
    ] as const
    for (const command of commands) {
      const step = executeSessionCommand(session, command)
      expect(step.applied).toBe(true)
      session = step.session
    }
    expect(session.state.sectMembership?.exitReason).toBe('expelled')
    expect(session.state.identity.faction).toBe('loose')
    expect(verifySessionReplay(session)).toBe(true)
  })
})
