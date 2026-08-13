import { describe, expect, it } from 'vitest'
import { BREAKTHROUGH_RULES } from '../realms'
import { createEventCatalog } from '../../core/eventEngine'
import { FORMAL_EVENTS } from './formalEvents'

describe('stage-4 formal event integrity', () => {
  it('keeps a deliberately small formal event set', () => {
    const catalog = createEventCatalog(FORMAL_EVENTS)
    expect(FORMAL_EVENTS).toHaveLength(8)
    expect(catalog.size).toBe(8)
    expect(FORMAL_EVENTS.every((event) => !event.id.startsWith('test_'))).toBe(true)
  })

  it('maps every breakthrough rule to a retryable breakthrough event', () => {
    const catalog = createEventCatalog(FORMAL_EVENTS)

    for (const rule of BREAKTHROUGH_RULES) {
      const event = catalog.get(rule.eventId)
      expect(event).toBeDefined()
      expect(event?.category).toBe('breakthrough')
      expect(event?.once).not.toBe(true)
      expect(event?.choices.some((choice) => choice.id === 'attempt')).toBe(true)
    }
  })
})
