import { describe, expect, it } from 'vitest'
import { BREAKTHROUGH_RULES } from '../realms'
import { createEventCatalog } from '../../core/eventEngine'
import { BREAKTHROUGH_EVENTS } from './breakthroughEvents'
import { CHAIN_EVENTS } from './chainEvents'
import { LONG_TERM_CHAINS } from './contentManifest'
import { ENCOUNTER_EVENTS } from './encounterEvents'
import { FORMAL_EVENTS, ORDINARY_EVENTS } from './formalEvents'

describe('stage-5 formal event integrity', () => {
  it('locks the planned V1 content counts', () => {
    const catalog = createEventCatalog(FORMAL_EVENTS)

    expect(ORDINARY_EVENTS).toHaveLength(30)
    expect(ENCOUNTER_EVENTS).toHaveLength(10)
    expect(CHAIN_EVENTS).toHaveLength(10)
    expect(BREAKTHROUGH_EVENTS).toHaveLength(3)
    expect(LONG_TERM_CHAINS).toHaveLength(5)
    expect(FORMAL_EVENTS).toHaveLength(53)
    expect(catalog.size).toBe(53)
    expect(FORMAL_EVENTS.every((event) => !event.id.startsWith('test_'))).toBe(true)
  })

  it('keeps every long-term chain at three existing nodes', () => {
    const catalog = createEventCatalog(FORMAL_EVENTS)
    const encounterIds = new Set(ENCOUNTER_EVENTS.map((event) => event.id))
    const chainIds = new Set(CHAIN_EVENTS.map((event) => event.id))

    for (const chain of LONG_TERM_CHAINS) {
      expect(chain.eventIds).toHaveLength(3)
      expect(encounterIds.has(chain.eventIds[0])).toBe(true)
      expect(chainIds.has(chain.eventIds[1])).toBe(true)
      expect(chainIds.has(chain.eventIds[2])).toBe(true)

      for (const eventId of chain.eventIds) {
        expect(catalog.has(eventId)).toBe(true)
      }
    }
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

  it('keeps all event and choice weights/data structurally valid through catalog creation', () => {
    expect(() => createEventCatalog(FORMAL_EVENTS)).not.toThrow()

    for (const event of FORMAL_EVENTS) {
      expect(event.weight).toBeGreaterThan(0)
      expect(event.choices.length).toBeGreaterThan(0)
    }
  })
})
