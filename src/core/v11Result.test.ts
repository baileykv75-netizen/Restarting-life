import { describe, expect, it } from 'vitest'
import { getAvailableChoices } from './eventEngine'
import {
  createGameSession,
  executeSessionAction,
  executeSessionChoice,
  FORMAL_EVENT_CATALOG,
} from './sessionEngine'

describe('V1.1 result settlement', () => {
  it('shows the real action and choice result before play continues', () => {
    let session = createGameSession({ runSeed: 'v11-result-check' })
    const action = executeSessionAction(session, 'explore')
    expect(action.applied).toBe(true)
    session = action.session

    const eventId = session.state.events.currentEventId
    expect(eventId).not.toBeNull()
    const event = FORMAL_EVENT_CATALOG.get(eventId!)
    expect(event).toBeDefined()
    const choice = getAvailableChoices(session.state, event!)[0]
    expect(choice).toBeDefined()

    const resolved = executeSessionChoice(session, choice.id)
    expect(resolved.applied).toBe(true)
    expect(resolved.session.pendingResult).not.toBeNull()
    expect(resolved.session.pendingResult?.narrative.length).toBeGreaterThan(0)
    expect(resolved.session.pendingResult?.changes.some((change) => change.label === '时间')).toBe(true)
  })
})
