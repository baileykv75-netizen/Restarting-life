import { describe, expect, it } from 'vitest'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import type { SectRank } from '../types/sect'
import { calculateCultivationPreview } from './cultivationEngine'
import { createInitialGameState } from './gameState'
import { verifySessionReplay } from './replayEngine'
import {
  getQingyunJoinOffer,
  getSectAccess,
  resolveJoinQingyunSect,
  resolveReceiveQingyunBasicTeaching,
} from './sectMembershipEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function adultState(
  seed = 'r24-member',
  locationId = 'qingyun_sect',
  rootId = 'single_wood',
  backgroundId = 'baishi_tenant',
  tags: string[] = [],
): GameState {
  const base = createInitialGameState({ runSeed: seed, runId: `run-${seed}` })
  return {
    ...base,
    lifeStage: 'adult',
    identity: { ...base.identity, backgroundId, spiritRootId: rootId },
    world: { currentLocationId: locationId },
    knowledge: { locations: { [locationId]: 'discovered' } },
    tags,
    flags: { ...base.flags, location_knowledge_initialized: true },
  }
}

function withRank(state: GameState, rank: SectRank): GameState {
  return {
    ...state,
    sectMembership: { sectId: 'qingyun', rank, joinedDay: state.worldDay, joinPath: 'regular-recruitment' },
    identity: { ...state.identity, faction: 'qingyun' },
  }
}

function findReplayRootSeed(): string {
  for (let index = 0; index < 200; index += 1) {
    const seed = `r24-replay-${index}`
    if (createGameSession({ runSeed: seed, runId: `run-${seed}` }).state.identity.spiritRootId !== 'none') return seed
  }
  throw new Error('No replay seed with spirit root found')
}

describe('R24 Qingyun sect membership', () => {
  it('does not auto-enroll a non-member and explains the normal route', () => {
    const state = adultState('r24-no-auto', 'qingstone_town')
    expect(state.sectMembership).toBeUndefined()
    expect(state.identity.faction).toBe('mortal')

    const offer = getQingyunJoinOffer(state)
    expect(offer.available).toBe(false)
    expect(offer.targetRank).toBeUndefined()
    expect(offer.missing).toContain('需前往青云宗')
    expect(state.sectMembership).toBeUndefined()
  })

  it('joins through public recruitment as one authoritative outer-disciple membership', () => {
    const state = adultState('r24-public')
    const offer = getQingyunJoinOffer(state)
    expect(offer.available).toBe(true)
    expect(offer.targetRank).toBe('outer')
    expect(offer.joinPath).toBe('regular-recruitment')

    const joined = resolveJoinQingyunSect(state)
    expect(joined.applied).toBe(true)
    expect(joined.state.sectMembership).toEqual({
      sectId: 'qingyun', rank: 'outer', joinedDay: state.worldDay, joinPath: 'regular-recruitment',
    })
    expect(joined.state.identity.faction).toBe('qingyun')
    expect(joined.state.chronicle.at(-1)?.title).toBe('拜入青云宗')
    expect(joined.state.chronicle.at(-1)?.importance).toBe('major')
    expect(resolveJoinQingyunSect(joined.state).reason).toBe('SECT_MEMBERSHIP_ALREADY_EXISTS')
  })

  it('keeps clan and steward routes special only in access path, never in rank', () => {
    const xie = adultState(
      'r24-xie', 'qingyun_sect', 'single_wood', 'xie_branch', ['adult_access:qingyun_family_recommendation'],
    )
    const lu = adultState(
      'r24-lu', 'qingyun_sect', 'single_water', 'lu_main_line', ['adult_access:qingyun_clan_recruitment'],
    )
    const steward = adultState(
      'r24-steward', 'qingyun_family_quarters', 'single_fire', 'qingyun_steward_family', ['adult_access:qingyun_regular_recruitment'],
    )

    for (const state of [xie, lu]) {
      const offer = getQingyunJoinOffer(state)
      expect(offer.available).toBe(true)
      expect(offer.joinPath).toBe('clan-recommendation')
      expect(offer.targetRank).toBe('outer')
      const joined = resolveJoinQingyunSect(state)
      expect(joined.state.sectMembership?.rank).toBe('outer')
      expect(joined.state.sectMembership?.joinPath).toBe('clan-recommendation')
    }

    const stewardOffer = getQingyunJoinOffer(steward)
    expect(stewardOffer.available).toBe(true)
    expect(stewardOffer.joinPath).toBe('steward-family')
    expect(stewardOffer.targetRank).toBe('outer')
    expect(resolveJoinQingyunSect(steward).state.sectMembership?.rank).toBe('outer')
  })

  it('allows only the frozen no-root steward service route to become Qingyun service staff', () => {
    const outsider = adultState('r24-no-root-outsider', 'qingyun_sect', 'none', 'baishi_tenant')
    expect(getQingyunJoinOffer(outsider).available).toBe(false)
    expect(resolveJoinQingyunSect(outsider).applied).toBe(false)

    const service = adultState(
      'r24-service', 'qingyun_family_quarters', 'none', 'qingyun_steward_family', ['adult_path:qingyun_mortal_service'],
    )
    const offer = getQingyunJoinOffer(service)
    expect(offer.available).toBe(true)
    expect(offer.targetRank).toBe('service')
    expect(offer.joinPath).toBe('mortal-service')

    const joined = resolveJoinQingyunSect(service)
    expect(joined.state.sectMembership?.rank).toBe('service')
    expect(joined.state.identity.faction).toBe('qingyun')
    expect(getSectAccess(joined.state).basicTeaching).toBe(false)
  })

  it('represents all four ranks with real permission differences', () => {
    const base = adultState('r24-access')
    const none = getSectAccess(base)
    const service = getSectAccess(withRank(base, 'service'))
    const outer = getSectAccess(withRank(base, 'outer'))
    const inner = getSectAccess(withRank(base, 'inner'))
    const trueDisciple = getSectAccess(withRank(base, 'true'))

    expect(none.publicArea).toBe(true)
    expect(none.outerRegistry).toBe(false)
    expect(service.outerRegistry).toBe(true)
    expect(service.basicTeaching).toBe(false)
    expect(outer.basicTeaching).toBe(true)
    expect(outer.discipleCultivationArea).toBe(true)
    expect(outer.affairsHallEntry).toBe(true)
    expect(outer.innerResources).toBe(false)
    expect(inner.innerResources).toBe(true)
    expect(inner.trueInheritance).toBe(false)
    expect(trueDisciple.trueInheritance).toBe(true)
  })

  it('never grants inner or true rank from any R24 admission offer', () => {
    const candidates = [
      adultState('r24-rank-public'),
      adultState('r24-rank-xie', 'qingyun_sect', 'single_metal', 'xie_branch', ['adult_access:qingyun_family_recommendation']),
      adultState('r24-rank-steward', 'qingyun_family_quarters', 'single_fire', 'qingyun_steward_family', ['adult_access:qingyun_regular_recruitment']),
      adultState('r24-rank-service', 'qingyun_family_quarters', 'none', 'qingyun_steward_family', ['adult_path:qingyun_mortal_service']),
    ]
    for (const state of candidates) {
      const offer = getQingyunJoinOffer(state)
      expect(['service', 'outer']).toContain(offer.targetRank)
      expect(offer.targetRank).not.toBe('inner')
      expect(offer.targetRank).not.toBe('true')
    }
  })

  it('turns outer-disciple access into real Qingyun teaching and sect cultivation access', () => {
    const outsider: GameState = {
      ...adultState('r24-real-access'),
      cultivation: {
        realm: 'mortal', stage: 0, practiceInitialized: true, knownTechniqueIds: [], mainTechniqueId: null,
        techniqueSystemInitialized: true, auxiliaryTechniqueIds: [], techniquePractice: {},
      },
    }
    const outsiderPreview = calculateCultivationPreview(outsider, 'qingyuan_yinqi', 10)
    expect(outsiderPreview?.environmentLabel).toBe('宗门外围 · 灵气普通')
    expect(resolveReceiveQingyunBasicTeaching(outsider).reason).toBe('QINGYUN_BASIC_TEACHING_NOT_ALLOWED')

    const joined = resolveJoinQingyunSect(outsider)
    expect(joined.applied).toBe(true)
    const memberPreview = calculateCultivationPreview(joined.state, 'qingyuan_yinqi', 10)
    expect(memberPreview?.environmentLabel).toBe('灵气充沛')
    expect((memberPreview?.gain ?? 0)).toBeGreaterThan(outsiderPreview?.gain ?? 0)

    const taught = resolveReceiveQingyunBasicTeaching(joined.state)
    expect(taught.applied).toBe(true)
    expect(taught.state.cultivation.knownTechniqueIds).toContain('qingyuan_yinqi')
    expect(taught.state.cultivation.techniquePractice?.qingyuan_yinqi?.proficiencyPoints).toBe(0)
    expect(resolveReceiveQingyunBasicTeaching(taught.state).reason).toBe('QINGYUN_BASIC_TEACHING_ALREADY_KNOWN')
  })

  it('persists the sole membership truth across save and reload', () => {
    const joined = resolveJoinQingyunSect(adultState('r24-persist'))
    expect(joined.applied).toBe(true)
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state: joined.state, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.sectMembership).toEqual(joined.state.sectMembership)
    expect(loaded?.identity.faction).toBe('qingyun')
    expect(loaded && getSectAccess(loaded).basicTeaching).toBe(true)
  })

  it('replays the explicit Qingyun join deterministically through the existing session log', () => {
    const seed = findReplayRootSeed()
    let session = createGameSession({ runSeed: seed, runId: `run-${seed}` })
    const setup = [
      { type: 'game-action', action: { type: 'SET_LIFE_STAGE', stage: 'adult' } },
      { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'qingyun_sect' } },
      { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'qingyun_sect', status: 'discovered' } },
    ] as const
    for (const command of setup) {
      const step = executeSessionCommand(session, command)
      expect(step.applied).toBe(true)
      session = step.session
    }

    const joined = executeSessionCommand(session, { type: 'game-action', action: { type: 'JOIN_QINGYUN_SECT' } })
    expect(joined.applied).toBe(true)
    expect(joined.session.state.sectMembership?.sectId).toBe('qingyun')
    expect(joined.session.state.sectMembership?.rank).toBe('outer')
    expect(verifySessionReplay(joined.session)).toBe(true)
  })
})
