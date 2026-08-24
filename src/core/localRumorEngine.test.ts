import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import { createInitialGameState } from './gameState'
import { getLocationKnowledgeStatus } from './locationKnowledgeEngine'
import { getLocalRumorCandidates, resolveGatherLocalRumor } from './localRumorEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'

function adultState(currentLocationId = 'qingstone_town'): GameState {
  const base = createInitialGameState({ runSeed: `local-rumor-${currentLocationId}` })
  return {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId },
    knowledge: { locations: { [currentLocationId]: 'discovered' } },
    adultEntry: {
      optionIds: ['test-entry'],
      selectedOptionId: 'test-entry',
      resolved: true,
      originLocationSeed: currentLocationId,
      startingLocationSeed: currentLocationId,
    },
    flags: {
      ...base.flags,
      adult_entry_resolved: true,
      location_knowledge_initialized: true,
    },
  }
}

describe('UX-02C local rumor activity', () => {
  it('spends one day and turns one unknown adjacent location into a rumor', () => {
    const before = adultState('qingstone_town')
    expect(getLocalRumorCandidates(before).map((location) => location.id)).toEqual([
      'baishi_village',
      'qingxia_market',
      'linhe_county',
    ])

    const result = resolveGatherLocalRumor(before)
    expect(result.applied).toBe(true)
    expect(result.elapsedDays).toBe(1)
    expect(result.state.worldDay).toBe(before.worldDay + 1)
    expect(result.rumorLocationId).toBe('baishi_village')
    expect(getLocationKnowledgeStatus(result.state, 'baishi_village')).toBe('rumored')
    expect(getLocationKnowledgeStatus(result.state, 'qingxia_market')).toBe('unknown')
  })

  it('moves to the next unknown adjacent rumor instead of repeating known information', () => {
    const before = {
      ...adultState('qingstone_town'),
      knowledge: {
        locations: {
          qingstone_town: 'discovered' as const,
          baishi_village: 'rumored' as const,
        },
      },
    }
    const result = resolveGatherLocalRumor(before)
    expect(result.applied).toBe(true)
    expect(result.rumorLocationId).toBe('qingxia_market')
    expect(getLocationKnowledgeStatus(result.state, 'qingxia_market')).toBe('rumored')
  })

  it('does not expose this social activity in wilderness or when there is no new adjacent rumor', () => {
    const wilderness = adultState('blackwind_mountain')
    expect(getLocalRumorCandidates(wilderness)).toEqual([])
    expect(resolveGatherLocalRumor(wilderness)).toMatchObject({ applied: false, reason: 'LOCAL_RUMOR_REQUIRES_SETTLEMENT' })

    const exhausted = {
      ...adultState('qingstone_town'),
      knowledge: {
        locations: {
          qingstone_town: 'discovered' as const,
          baishi_village: 'rumored' as const,
          qingxia_market: 'discovered' as const,
          linhe_county: 'rumored' as const,
        },
      },
    }
    expect(getLocalRumorCandidates(exhausted)).toEqual([])
    expect(resolveGatherLocalRumor(exhausted)).toMatchObject({ applied: false, reason: 'NO_NEW_LOCAL_RUMORS' })
  })

  it('dispatches through the authoritative game-action session log', () => {
    const initial = adultState('qingstone_town')
    const session = { ...createGameSession({ runSeed: 'local-rumor-session' }), state: initial }
    const result = executeSessionCommand(session, { type: 'game-action', action: { type: 'GATHER_LOCAL_RUMOR' } })
    expect(result.applied).toBe(true)
    expect(result.session.debugLog.at(-1)?.effectTypes).toEqual(['game-action:GATHER_LOCAL_RUMOR'])
    expect(getLocationKnowledgeStatus(result.session.state, 'baishi_village')).toBe('rumored')
  })
})
