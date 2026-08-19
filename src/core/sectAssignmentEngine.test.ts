import { describe, expect, it } from 'vitest'
import { QINGYUN_SECT_ASSIGNMENTS } from '../data/sectAssignments'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { resolveRegionExploration } from './regionExplorationEngine'
import { createInitialGameState } from './gameState'
import { getInventoryQuantity } from './inventoryEngine'
import { verifySessionReplay } from './replayEngine'
import {
  getSectAssignmentAvailability,
  getSectContribution,
  refreshSectAssignmentAfterCombat,
  resolveAbandonSectAssignment,
  resolveAcceptSectAssignment,
  resolvePerformSectAssignment,
  resolveSettleSectAssignment,
} from './sectAssignmentEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { resolveTravel } from './travelEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function outerState(seed = 'r25-outer', locationId = 'qingyun_sect'): GameState {
  const base = createInitialGameState({ runSeed: seed, runId: `run-${seed}` })
  return {
    ...base,
    lifeStage: 'adult',
    identity: { ...base.identity, backgroundId: 'baishi_tenant', spiritRootId: 'single_wood', faction: 'qingyun' },
    cultivation: { realm: 'qi', stage: 3 },
    sectMembership: { sectId: 'qingyun', rank: 'outer', joinedDay: 0, joinPath: 'regular-recruitment' },
    world: { currentLocationId: locationId },
    knowledge: {
      locations: {
        qingyun_sect: 'discovered',
        lingxi_valley: 'discovered',
        blackwind_mountain: 'discovered',
        qingxia_market: 'discovered',
      },
    },
    flags: { ...base.flags, location_knowledge_initialized: true },
    inventory: { stacks: {}, baseCapacitySlots: 12, storageBagItemId: null },
  }
}

function atLocation(state: GameState, locationId: string): GameState {
  return { ...state, world: { currentLocationId: locationId } }
}

function withoutCombat(state: GameState): GameState {
  const next = { ...state }
  delete next.combat
  return next
}

function findReplayRootSeed(): string {
  for (let index = 0; index < 300; index += 1) {
    const seed = `r25-replay-${index}`
    if (createGameSession({ runSeed: seed, runId: `run-${seed}` }).state.identity.spiritRootId !== 'none') return seed
  }
  throw new Error('No replay seed with a spirit root found')
}

describe('R25 Qingyun sect assignments', () => {
  it('keeps four one-life assignment definitions in one data layer', () => {
    expect(QINGYUN_SECT_ASSIGNMENTS.map((entry) => entry.kind)).toEqual(['herb', 'patrol', 'escort', 'cull'])
    expect(new Set(QINGYUN_SECT_ASSIGNMENTS.map((entry) => entry.id)).size).toBe(4)
    expect(QINGYUN_SECT_ASSIGNMENTS.every((entry) => entry.contributionReward > 0 && entry.spiritStoneReward > 0)).toBe(true)
  })

  it('requires real affairs-hall access and allows only one active assignment', () => {
    const outsider = { ...outerState('r25-outsider'), sectMembership: undefined, identity: { ...outerState('r25-outsider').identity, faction: 'loose' as const } }
    expect(getSectAssignmentAvailability(outsider, 'qingyun_lingxi_herb_collection')?.available).toBe(false)
    expect(resolveAcceptSectAssignment(outsider, 'qingyun_lingxi_herb_collection').applied).toBe(false)

    const service: GameState = {
      ...outerState('r25-service'),
      sectMembership: { sectId: 'qingyun', rank: 'service', joinedDay: 0, joinPath: 'mortal-service' },
    }
    expect(getSectAssignmentAvailability(service, 'qingyun_lingxi_herb_collection')?.available).toBe(false)

    const accepted = resolveAcceptSectAssignment(outerState('r25-one-active'), 'qingyun_lingxi_herb_collection')
    expect(accepted.applied).toBe(true)
    expect(resolveAcceptSectAssignment(accepted.state, 'qingyun_blackwind_patrol').reason).toBe('SECT_ASSIGNMENT_ALREADY_ACTIVE')
  })

  it('uses real world time and inventory for herb collection, then settles exactly once', () => {
    const start = outerState('r25-herb')
    const accepted = resolveAcceptSectAssignment(start, 'qingyun_lingxi_herb_collection')
    const arrived = atLocation(accepted.state, 'lingxi_valley')
    const performed = resolvePerformSectAssignment(arrived)
    expect(performed.applied).toBe(true)
    expect(performed.state.worldDay).toBe(start.worldDay + 3)
    expect(getInventoryQuantity(performed.state, 'green_dew_grass')).toBe(3)
    expect(performed.state.sectProgress?.activeAssignment?.status).toBe('ready-to-settle')

    const returned = atLocation(performed.state, 'qingyun_sect')
    const settled = resolveSettleSectAssignment(returned)
    expect(settled.applied).toBe(true)
    expect(getInventoryQuantity(settled.state, 'green_dew_grass')).toBe(0)
    expect(getSectContribution(settled.state)).toBe(8)
    expect(settled.state.resources.spiritStones).toBe(start.resources.spiritStones + 4)
    expect(settled.state.sectProgress?.activeAssignment).toBeUndefined()
    expect(settled.state.sectProgress?.history).toEqual([{
      assignmentId: 'qingyun_lingxi_herb_collection', outcome: 'settled', resolvedDay: settled.state.worldDay, contributionDelta: 8,
    }])
    expect(resolveSettleSectAssignment(settled.state).applied).toBe(false)
    expect(getSectAssignmentAvailability(settled.state, 'qingyun_lingxi_herb_collection')?.reason).toBe('SECT_ASSIGNMENT_ALREADY_RESOLVED')
  })

  it('advances patrol progress only through real wilderness exploration time', () => {
    const accepted = resolveAcceptSectAssignment(outerState('r25-patrol'), 'qingyun_blackwind_patrol')
    let state = atLocation(accepted.state, 'blackwind_mountain')
    const first = resolveRegionExploration(state, 1)
    expect(first.applied).toBe(true)
    expect(first.state.sectProgress?.activeAssignment?.progressDays).toBe(1)
    expect(first.state.sectProgress?.activeAssignment?.status).toBe('accepted')
    state = first.state
    const second = resolveRegionExploration(state, 1)
    expect(second.applied).toBe(true)
    expect(second.state.sectProgress?.activeAssignment?.progressDays).toBe(2)
    expect(second.state.sectProgress?.activeAssignment?.status).toBe('ready-to-settle')
    expect(second.state.worldDay).toBe(2)
  })

  it('marks escort complete only after existing travel actually arrives at Qingxia market', () => {
    const accepted = resolveAcceptSectAssignment(outerState('r25-escort'), 'qingyun_qingxia_escort')
    expect(accepted.state.sectProgress?.activeAssignment?.status).toBe('accepted')
    const traveled = resolveTravel(accepted.state, 'qingxia_market')
    expect(traveled.applied).toBe(true)
    expect(traveled.arrived).toBe(true)
    expect(traveled.travelDays).toBe(1)
    expect(traveled.state.world.currentLocationId).toBe('qingxia_market')
    expect(traveled.state.sectProgress?.activeAssignment?.status).toBe('ready-to-settle')
  })

  it('starts the existing CombatEngine for culling and does not treat escape as a kill', () => {
    const accepted = resolveAcceptSectAssignment(outerState('r25-cull'), 'qingyun_greenback_cull')
    const arrived = atLocation(accepted.state, 'blackwind_mountain')
    const started = resolvePerformSectAssignment(arrived)
    expect(started.applied).toBe(true)
    expect(started.state.combat?.opponentId).toBe('greenback-wolf')
    expect(started.state.combat?.source).toBe('field')
    expect(started.state.combat?.encounterVariant).toBe('ordinary')

    const escaped = refreshSectAssignmentAfterCombat(started.state, withoutCombat(started.state))
    expect(escaped.sectProgress?.activeAssignment?.status).toBe('accepted')

    const battleId = started.state.combat!.battleId
    const victoryEvidence: GameState = {
      ...withoutCombat(started.state),
      pendingBeastLoot: {
        lootId: `${battleId}:loot`, sourceBattleId: battleId, beastId: 'greenback_wolf', beastName: '青背狼', remaining: {},
      },
    }
    const victorious = refreshSectAssignmentAfterCombat(started.state, victoryEvidence)
    expect(victorious.sectProgress?.activeAssignment?.status).toBe('ready-to-settle')
  })

  it('records abandonment with no reward and never reopens the same one-life affair', () => {
    const start = outerState('r25-abandon')
    const accepted = resolveAcceptSectAssignment(start, 'qingyun_blackwind_patrol')
    const abandoned = resolveAbandonSectAssignment(accepted.state)
    expect(abandoned.applied).toBe(true)
    expect(getSectContribution(abandoned.state)).toBe(0)
    expect(abandoned.state.resources.spiritStones).toBe(start.resources.spiritStones)
    expect(abandoned.state.sectProgress?.activeAssignment).toBeUndefined()
    expect(abandoned.state.sectProgress?.history[0]?.outcome).toBe('abandoned')
    expect(getSectAssignmentAvailability(abandoned.state, 'qingyun_blackwind_patrol')?.reason).toBe('SECT_ASSIGNMENT_ALREADY_RESOLVED')
  })

  it('persists contribution and the sole active assignment across save and reload', () => {
    const accepted = resolveAcceptSectAssignment(outerState('r25-persist'), 'qingyun_blackwind_patrol')
    const persistent: PersistentGame = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: { state: accepted.state, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null,
      archives: [],
      meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.sectProgress).toEqual(accepted.state.sectProgress)
    expect(loaded && getSectContribution(loaded)).toBe(0)
  })

  it('replays a full herb assignment through contribution settlement deterministically', () => {
    const seed = findReplayRootSeed()
    let session = createGameSession({ runSeed: seed, runId: `run-${seed}` })
    const setup = [
      { type: 'game-action', action: { type: 'SET_LIFE_STAGE', stage: 'adult' } },
      { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'qingyun_sect' } },
      { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'qingyun_sect', status: 'discovered' } },
      { type: 'game-action', action: { type: 'JOIN_QINGYUN_SECT' } },
      { type: 'initialize-inventory' },
      { type: 'game-action', action: { type: 'ACCEPT_SECT_ASSIGNMENT', assignmentId: 'qingyun_lingxi_herb_collection' } },
      { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'lingxi_valley' } },
      { type: 'game-action', action: { type: 'PERFORM_SECT_ASSIGNMENT' } },
      { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'qingyun_sect' } },
      { type: 'game-action', action: { type: 'SETTLE_SECT_ASSIGNMENT' } },
    ] as const
    for (const command of setup) {
      const step = executeSessionCommand(session, command)
      expect(step.applied).toBe(true)
      session = step.session
    }
    expect(session.state.sectProgress?.contribution).toBe(8)
    expect(session.state.sectProgress?.activeAssignment).toBeUndefined()
    expect(verifySessionReplay(session)).toBe(true)
  })
})
