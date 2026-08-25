import { describe, expect, it } from 'vitest'
import { exploreRumor } from './rumorExplorationEngine'

function createRumoredState() {
  return {
    worldDay: 10,
    knowledge: {
      locations: {
        blackwind_mountain: 'rumored',
      },
    },
  } as any
}

describe('rumor exploration', () => {
  it('upgrades a rumor into a discovered location after exploration', () => {
    const result = exploreRumor(createRumoredState(), 'blackwind_mountain')

    expect(result.success).toBe(true)
    expect(result.elapsedDays).toBe(3)
    expect(result.logType).toBe('DISCOVER_LOCATION')
    expect(result.state.knowledge.locations.blackwind_mountain).toBe('discovered')
  })

  it('rejects repeated exploration after discovery', () => {
    const state = createRumoredState()
    state.knowledge.locations.blackwind_mountain = 'discovered'

    const result = exploreRumor(state, 'blackwind_mountain')

    expect(result.success).toBe(false)
    expect(result.logType).toBe('FAILED_RUMOR')
    expect(result.elapsedDays).toBe(0)
  })
})
