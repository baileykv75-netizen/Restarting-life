import { describe, expect, it } from 'vitest'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { calculateCultivationPreview, resolveCultivateDays } from './cultivationEngine'
import { createInitialGameState } from './gameState'
import { verifySessionReplay } from './replayEngine'
import { getQingyunJoinOffer, getSectAccess, resolveJoinQingyunSect, resolveReceiveQingyunBasicTeaching } from './sectMembershipEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function adultState(
  seed = 'r24-test',
  locationId = 'qingyun_sect',
  spiritRootId = 'single_wood',
  backgroundId = 'baishi_tenant',
  tags: string[] = [],
): GameState {
  const base = createInitialGameState({ runSeed: seed, runId: `run-${seed}` })
  return {
    ...base,
    lifeStage: 'adult',
    identity: { ...base.identity, backgroundId, spiritRootId, faction: 'loose' },
    world: { currentLocationId: locationId },
    knowledge: { locations: { qingyun_sect: 'discovered', qingyun_family_quarters: 'discovered' } },
    flags: { ...base.flags, location_knowledge_initialized: true },
    tags: [...base.tags, ...tags],
    cultivation: {
      realm: 'qi', stage: 1,
      practiceInitialized: true,
      knownTechniqueIds: ['xiaozhoutian_tuna'],
      mainTechniqueId: 'xiaozhoutian_tuna',
      techniqueSystemInitialized: true,
      auxiliaryTechniqueIds: [],
      techniquePractice: { xiaozhoutian_tuna: { proficiencyPoints: 0 } },
    },
  }
}

function findReplayRootSeed(): string {
  for (let index = 0; index < 300; index += 1) {
    const seed = `r24-replay-${index}`
    if (createGameSession({ runSeed: seed, runId: `run-${seed}` }).state.identity.spiritRootId !== 'none') return seed
  }
  throw new Error('No replay seed with a spirit root found')
}

describe('R24 Qingyun sect membership', () => {
  it('does not auto-enroll a non-member and explains the normal route', () => {
    const state = adultState('r24-no-auto', 'qingxia_market')
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
      status: 'active', violations: [],
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
    const joinedXie = resolveJoinQingyunSect(xie)
    const joinedLu = resolveJoinQingyunSect(lu)
    const joinedSteward = resolveJoinQingyunSect(steward)
    expect(joinedXie.state.sectMembership).toMatchObject({ rank: 'outer', joinPath: 'clan-recommendation' })
    expect(joinedLu.state.sectMembership).toMatchObject({ rank: 'outer', joinPath: 'clan-recommendation' })
    expect(joinedSteward.state.sectMembership).toMatchObject({ rank: 'outer', joinPath: 'steward-family' })
  })

  it('allows only the frozen no-root steward service route to become Qingyun service staff', () => {
    const valid = adultState(
      'r24-service-valid', 'qingyun_family_quarters', 'none', 'qingyun_steward_family', ['adult_path:qingyun_mortal_service'],
    )
    const invalid = adultState('r24-service-invalid', 'qingyun_family_quarters', 'none', 'baishi_tenant')
    const validOffer = getQingyunJoinOffer(valid)
    expect(validOffer.available).toBe(true)
    expect(validOffer.targetRank).toBe('service')
    expect(resolveJoinQingyunSect(valid).state.sectMembership).toMatchObject({ rank: 'service', joinPath: 'mortal-service' })
    expect(getQingyunJoinOffer(invalid).available).toBe(false)
    expect(resolveJoinQingyunSect(invalid).applied).toBe(false)
  })

  it('represents all four ranks with real permission differences', () => {
    const base = adultState('r24-ranks')
    const accessFor = (rank: 'service' | 'outer' | 'inner' | 'true') => getSectAccess({
      ...base,
      identity: { ...base.identity, faction: 'qingyun' },
      sectMembership: { sectId: 'qingyun', rank, joinedDay: 0, joinPath: 'regular-recruitment' },
    })
    expect(accessFor('service')).toMatchObject({ basicInternalResources: true, basicTeaching: false, affairsHallEntry: false, innerResources: false, trueInheritance: false })
    expect(accessFor('outer')).toMatchObject({ basicTeaching: true, discipleCultivationArea: true, affairsHallEntry: true, innerResources: false, trueInheritance: false })
    expect(accessFor('inner')).toMatchObject({ affairsHallEntry: true, innerResources: true, trueInheritance: false })
    expect(accessFor('true')).toMatchObject({ innerResources: true, trueInheritance: true })
  })

  it('never grants inner or true rank from any R24 admission offer', () => {
    const candidates = [
      adultState('r24-normal'),
      adultState('r24-clan', 'qingyun_sect', 'single_water', 'lu_main_line', ['adult_access:qingyun_clan_recruitment']),
      adultState('r24-family', 'qingyun_family_quarters', 'single_fire', 'qingyun_steward_family', ['adult_access:qingyun_regular_recruitment']),
      adultState('r24-service', 'qingyun_family_quarters', 'none', 'qingyun_steward_family', ['adult_path:qingyun_mortal_service']),
    ]
    for (const candidate of candidates) {
      const offer = getQingyunJoinOffer(candidate)
      expect(['service', 'outer']).toContain(offer.targetRank)
      expect(offer.targetRank).not.toBe('inner')
      expect(offer.targetRank).not.toBe('true')
    }
  })

  it('turns outer-disciple access into real Qingyun teaching and sect cultivation access', () => {
    const state = adultState('r24-access')
    const before = calculateCultivationPreview(state, 'xiaozhoutian_tuna', 10)
    expect(before?.environmentLabel).toBe('宗门外围 · 灵气普通')

    const joined = resolveJoinQingyunSect(state)
    expect(joined.applied).toBe(true)
    const taught = resolveReceiveQingyunBasicTeaching(joined.state)
    expect(taught.applied).toBe(true)
    expect(taught.state.cultivation.knownTechniqueIds).toContain('qingyuan_yinqi')
    expect(taught.state.cultivation.techniquePractice?.qingyuan_yinqi?.proficiencyPoints).toBe(0)
    expect(resolveReceiveQingyunBasicTeaching(taught.state).reason).toBe('QINGYUN_BASIC_TEACHING_ALREADY_KNOWN')

    const after = calculateCultivationPreview(taught.state, 'xiaozhoutian_tuna', 10)
    expect(after?.environmentLabel).toBe('灵气充沛')
    expect((after?.gain ?? 0)).toBeGreaterThan(before?.gain ?? 0)

    const cultivation = resolveCultivateDays(taught.state, 10)
    expect(cultivation.applied).toBe(true)
    expect(cultivation.gainApplied).toBe(after?.gain)

    const service = adultState('r24-service-teaching', 'qingyun_family_quarters', 'none', 'qingyun_steward_family', ['adult_path:qingyun_mortal_service'])
    const serviceJoined = resolveJoinQingyunSect(service)
    expect(getSectAccess(serviceJoined.state).basicTeaching).toBe(false)
    expect(resolveReceiveQingyunBasicTeaching({ ...serviceJoined.state, world: { currentLocationId: 'qingyun_sect' } }).applied).toBe(false)
  })

  it('persists the sole membership truth across save and reload', () => {
    const joined = resolveJoinQingyunSect(adultState('r24-persist'))
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
    const loaded = loadPersistentGame(storage)
    expect(loaded?.currentSession?.state.sectMembership).toEqual(joined.state.sectMembership)
    expect(loaded?.currentSession?.state.identity.faction).toBe('qingyun')
  })

  it('replays the explicit Qingyun join deterministically through the existing session log', () => {
    const seed = findReplayRootSeed()
    let session = createGameSession({ runSeed: seed, runId: `run-${seed}` })
    for (const command of [
      { type: 'game-action', action: { type: 'SET_LIFE_STAGE', stage: 'adult' } },
      { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'qingyun_sect' } },
      { type: 'game-action', action: { type: 'JOIN_QINGYUN_SECT' } },
    ] as const) {
      const result = executeSessionCommand(session, command)
      expect(result.applied).toBe(true)
      session = result.session
    }
    expect(session.state.sectMembership).toMatchObject({ sectId: 'qingyun', rank: 'outer' })
    expect(verifySessionReplay(session)).toBe(true)
  })
})
