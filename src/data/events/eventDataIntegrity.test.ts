import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../../types/event'
import { createEventCatalog } from '../../core/eventEngine'
import { TEST_EVENTS } from './testEvents'

describe('stage-3 event data integrity', () => {
  it('keeps all stage-3 content explicitly marked as test data', () => {
    expect(TEST_EVENTS).toHaveLength(8)
    expect(TEST_EVENTS.every((event) => event.id.startsWith('test_'))).toBe(true)
  })

  it('rejects duplicate event ids', () => {
    const duplicate: GameEvent[] = [
      {
        id: 'duplicate',
        category: 'mortal',
        title: 'A',
        text: 'A',
        weight: 1,
        choices: [{ id: 'a', text: 'A', effects: [] }],
      },
      {
        id: 'duplicate',
        category: 'mortal',
        title: 'B',
        text: 'B',
        weight: 1,
        choices: [{ id: 'b', text: 'B', effects: [] }],
      },
    ]

    expect(() => createEventCatalog(duplicate)).toThrow('Duplicate event id: duplicate')
  })

  it('rejects broken next-event and queued-event references', () => {
    const brokenNext: GameEvent[] = [
      {
        id: 'source',
        category: 'chain',
        title: 'Source',
        text: 'Source',
        weight: 1,
        choices: [
          { id: 'go', text: 'Go', effects: [], nextEventId: 'missing' },
        ],
      },
    ]

    expect(() => createEventCatalog(brokenNext)).toThrow('Unknown nextEventId')

    const brokenQueue: GameEvent[] = [
      {
        id: 'source',
        category: 'chain',
        title: 'Source',
        text: 'Source',
        weight: 1,
        choices: [
          {
            id: 'go',
            text: 'Go',
            effects: [{ type: 'queueEvent', eventId: 'missing' }],
          },
        ],
      },
    ]

    expect(() => createEventCatalog(brokenQueue)).toThrow('Unknown queueEvent target')
  })
})
