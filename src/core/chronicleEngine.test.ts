import { describe, expect, it } from 'vitest'
import { FORMAL_EVENTS } from '../data/events/formalEvents'
import { getAvailableChoices, startEventById } from './eventEngine'
import {
  createGameSession,
  executeSessionAction,
  executeSessionChoice,
  FORMAL_EVENT_CATALOG,
} from './sessionEngine'

describe('Chronicle V2', () => {
  it('records a real multi-option decision and its exact consequence', () => {
    let session = createGameSession({ runSeed: 'chronicle-choice' })
    session = {
      ...session,
      state: startEventById(session.state, FORMAL_EVENT_CATALOG, 'exploration_beast_tracks'),
    }

    const result = executeSessionChoice(session, 'follow')
    expect(result.applied).toBe(true)

    const entry = result.session.state.chronicle.at(-1)
    expect(entry).toBeDefined()
    expect(entry?.title).toBe('妖兽足迹')
    expect(entry?.choiceText).toBe('循迹寻找战利品')
    expect(entry?.changes).toContainEqual({
      label: '下品灵石',
      value: '+3枚',
      tone: 'positive',
    })
  })

  it('does not pretend a single authored continuation was a meaningful player choice', () => {
    let session = createGameSession({ runSeed: 'chronicle-single-choice' })
    session = {
      ...session,
      state: startEventById(session.state, FORMAL_EVENT_CATALOG, 'exploration_mountain_stream'),
    }

    const result = executeSessionChoice(session, 'collect')
    const entry = result.session.state.chronicle.at(-1)

    expect(entry?.choiceText).toBeUndefined()
    expect(result.session.pendingResult?.narrative).toBe('')
    expect(result.session.pendingResult?.consequence).toBeNull()
  })

  it('carries the action duration into the same biography entry as the resulting event', () => {
    let session = createGameSession({ runSeed: 'chronicle-action-duration' })
    const action = executeSessionAction(session, 'explore')
    expect(action.applied).toBe(true)
    session = action.session

    const eventId = session.state.events.currentEventId
    expect(eventId).not.toBeNull()
    const event = FORMAL_EVENT_CATALOG.get(eventId!)
    expect(event).toBeDefined()
    const choice = getAvailableChoices(session.state, event!)[0]
    expect(choice).toBeDefined()

    const choiceResult = executeSessionChoice(session, choice.id)
    const entry = choiceResult.session.state.chronicle.at(-1)

    expect(entry).toBeDefined()
    expect(entry?.startDay).toBeLessThan(entry?.endDay ?? 0)
    expect(entry?.changes.some((change) => change.label === '时间')).toBe(true)
    expect(entry?.sourceType).toBe('event')
  })

  it('keeps all formal event definitions valid after chronicle cleanup', () => {
    expect(FORMAL_EVENTS.length).toBeGreaterThan(0)
    expect(FORMAL_EVENT_CATALOG.size).toBe(FORMAL_EVENTS.length)
  })
})
