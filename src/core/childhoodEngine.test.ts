import { describe, expect, it } from 'vitest'
import { BACKGROUNDS } from '../data/backgrounds'
import { getChildhoodEventIdsForBackground } from '../data/childhoodEvents'
import { encodeSelectedBirthRunSeed, generateBirthCandidates, generateBirthState } from './birthEngine'
import { getAvailableChildhoodChoices, getCurrentChildhoodEvent, resolveChildhoodChoice } from './childhoodEngine'
import { verifySessionReplay } from './replayEngine'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { DAYS_PER_YEAR } from './timeEngine'

function selectedState(seed = 'childhood-test') {
  const pending = generateBirthCandidates({ runSeed: seed, runId: `run-${seed}` })
  const candidate = pending.candidates[0]
  return generateBirthState({ runSeed: encodeSelectedBirthRunSeed(seed, candidate.index), runId: pending.runId })
}

describe('R06 childhood engine', () => {
  it('locks exactly the two approved nodes for every background', () => {
    for (const background of BACKGROUNDS) {
      const ids = getChildhoodEventIdsForBackground(background.id)
      expect(ids).toBeDefined()
      expect(ids).toHaveLength(2)
    }
  })

  it('creates the same childhood nodes and first age from the same selected birth', () => {
    const first = selectedState('same-childhood')
    const second = selectedState('same-childhood')
    expect(first.childhood).toEqual(second.childhood)
    expect(first.worldDay).toBe(second.worldDay)
    expect(first.worldDay).toBe(first.identity.birthDay + 8 * DAYS_PER_YEAR)
  })

  it('never rerolls spirit root when resolving a root-confirmation node', () => {
    for (let index = 0; index < 200; index += 1) {
      const state = selectedState(`root-confirm-${index}`)
      const firstEvent = getCurrentChildhoodEvent(state)
      if (!firstEvent?.rootConfirmation) continue
      const rootBefore = state.identity.spiritRootId
      const choice = getAvailableChildhoodChoices(state, firstEvent)[0]
      const result = resolveChildhoodChoice(state, choice.id)
      expect(result.applied).toBe(true)
      expect(result.state.identity.spiritRootId).toBe(rootBefore)
      return
    }
    throw new Error('Could not sample a root-confirmation background')
  })

  it('settles each choice once and ends childhood at exactly sixteen with only two chronicle entries', () => {
    let state = selectedState('two-nodes')
    const firstEvent = getCurrentChildhoodEvent(state)!
    const firstChoice = getAvailableChildhoodChoices(state, firstEvent)[0]
    const first = resolveChildhoodChoice(state, firstChoice.id)
    expect(first.applied).toBe(true)
    state = first.state
    expect(state.chronicle).toHaveLength(1)

    const duplicate = resolveChildhoodChoice(state, firstChoice.id)
    expect(duplicate.applied).toBe(false)

    const secondEvent = getCurrentChildhoodEvent(state)!
    const secondChoice = getAvailableChildhoodChoices(state, secondEvent)[0]
    const second = resolveChildhoodChoice(state, secondChoice.id)
    expect(second.applied).toBe(true)
    state = second.state

    expect(state.chronicle).toHaveLength(2)
    expect(state.childhood?.completedNodeIds).toHaveLength(2)
    expect(state.childhood?.currentNodeId).toBeNull()
    expect(state.lifeStage).toBe('adult')
    expect(state.worldDay).toBe(state.identity.birthDay + 16 * DAYS_PER_YEAR)
  })

  it('keeps childhood commands replayable through the existing session log', () => {
    const pending = generateBirthCandidates({ runSeed: 'childhood-replay', runId: 'run-childhood-replay' })
    const encoded = encodeSelectedBirthRunSeed(pending.runSeed, pending.candidates[0].index)
    let session = createGameSession({ runSeed: encoded, runId: pending.runId })
    for (let step = 0; step < 2; step += 1) {
      const event = getCurrentChildhoodEvent(session.state)!
      const choice = getAvailableChildhoodChoices(session.state, event)[0]
      const result = executeSessionCommand(session, { type: 'childhood-choice', choiceId: choice.id })
      expect(result.applied).toBe(true)
      session = result.session
    }
    expect(session.state.lifeStage).toBe('adult')
    expect(verifySessionReplay(session)).toBe(true)
  })
})
