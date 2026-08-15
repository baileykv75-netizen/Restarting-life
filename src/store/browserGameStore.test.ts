import { describe, expect, it } from 'vitest'
import { DAYS_PER_YEAR } from '../core/timeEngine'
import { LEGACY_SAVE_KEY, SAVE_KEY, V2_SAVE_KEY, type StorageLike } from './saveRepository'
import { chooseBirthAndSave, clearGame, commandAndSave, loadGame, startAndSaveRun } from './browserGameStore'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

function beginAndChoose(storage: MemoryStorage, now: number) {
  const pending = startAndSaveRun(storage, loadGame(storage), now)
  const candidate = pending.pendingBirthSelection!.candidates[0]
  return { candidate, selected: chooseBirthAndSave(storage, pending, candidate.id) }
}

describe('browser game store', () => {
  it('loads an empty V3 game at birth-selection with no generated candidates yet', () => {
    const empty = loadGame(new MemoryStorage())
    expect(empty.schemaVersion).toBe(3)
    expect(empty.phase).toBe('birth-selection')
    expect(empty.currentSession).toBeNull()
    expect(empty.pendingBirthSelection ?? null).toBeNull()
  })

  it('starts one pending life, saves the same trio, and cannot reroll by starting again', () => {
    const storage = new MemoryStorage()
    const first = startAndSaveRun(storage, loadGame(storage), 123456)
    expect(first.meta.totalRuns).toBe(1)
    expect(first.phase).toBe('birth-selection')
    expect(first.currentSession).toBeNull()
    expect(first.pendingBirthSelection?.candidates).toHaveLength(3)
    expect(storage.getItem(SAVE_KEY)).not.toBeNull()
    expect(loadGame(storage)).toEqual(first)
    const secondStart = startAndSaveRun(storage, first, 999999)
    expect(secondStart).toEqual(first)
    expect(secondStart.meta.totalRuns).toBe(1)
  })

  it('chooses exactly one candidate and enters life + childhood with its real state', () => {
    const storage = new MemoryStorage()
    const pending = startAndSaveRun(storage, loadGame(storage), 222222)
    const candidate = pending.pendingBirthSelection!.candidates[1]
    const selected = chooseBirthAndSave(storage, pending, candidate.id)
    expect(selected.phase).toBe('life')
    expect(selected.pendingBirthSelection).toBeNull()
    expect(selected.currentSession?.state.lifeStage).toBe('childhood')
    expect(selected.currentSession?.state.identity.backgroundId).toBe(candidate.backgroundId)
    expect(selected.currentSession?.state.identity.spiritRootId).toBe(candidate.spiritRootId)
    expect(selected.currentSession?.state.identity.talentIds).toEqual(candidate.talentIds)
    expect(selected.currentSession?.state.resources.spiritStones).toBe(candidate.spiritStones)
    expect(loadGame(storage)).toEqual(selected)
    expect(() => chooseBirthAndSave(storage, selected, candidate.id)).toThrow()
  })

  it('auto-saves accepted GameActions and restores all current V3 state fields', () => {
    const storage = new MemoryStorage()
    const { selected } = beginAndChoose(storage, 444444)
    const stageResult = commandAndSave(storage, selected, { type: 'game-action', action: { type: 'SET_LIFE_STAGE', stage: 'adult' } })
    expect(stageResult.applied).toBe(true)
    const locationResult = commandAndSave(storage, stageResult.persistent, { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: 'test_location' } })
    const knowledgeResult = commandAndSave(storage, locationResult.persistent, { type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'qingxia_market', status: 'discovered' } })
    const loaded = loadGame(storage)
    expect(loaded).toEqual(knowledgeResult.persistent)
    expect(loaded.currentSession?.state.lifeStage).toBe('adult')
    expect(loaded.currentSession?.state.world.currentLocationId).toBe('test_location')
    expect(loaded.currentSession?.state.knowledge.locations.qingxia_market).toBe('discovered')
  })

  it('does not overwrite the valid save when a reducer command is rejected', () => {
    const storage = new MemoryStorage()
    const { selected } = beginAndChoose(storage, 555555)
    const accepted = commandAndSave(storage, selected, { type: 'game-action', action: { type: 'SET_FLAG', key: 'accepted_flag', value: true } })
    const validRaw = storage.getItem(SAVE_KEY)
    const rejected = commandAndSave(storage, accepted.persistent, { type: 'game-action', action: { type: 'SET_CURRENT_LOCATION', locationId: '   ' } })
    expect(rejected.applied).toBe(false)
    expect(storage.getItem(SAVE_KEY)).toBe(validRaw)
    expect(loadGame(storage)).toEqual(accepted.persistent)
  })

  it('persists ended phase and archive when time causes natural death', () => {
    const storage = new MemoryStorage()
    const { selected } = beginAndChoose(storage, 333333)
    const session = selected.currentSession!
    const nearNaturalDeath = { ...selected, currentSession: { ...session, state: { ...session.state, worldDay: session.state.identity.birthDay + 80 * DAYS_PER_YEAR - 1, cultivation: { realm: 'mortal' as const, stage: 0 } } } }
    const result = commandAndSave(storage, nearNaturalDeath, { type: 'game-action', action: { type: 'ADVANCE_TIME', days: 1 } })
    expect(result.applied).toBe(true)
    expect(result.persistent.phase).toBe('ended')
    expect(result.persistent.currentSession?.state.status).toBe('dead')
    expect(result.persistent.archives).toHaveLength(1)
    expect(result.persistent.archives[0].runId).toBe(session.state.runId)
    expect(loadGame(storage)).toEqual(result.persistent)
  })

  it('clearGame deletes V3/V2/V1 slots and returns a fresh birth-selection state', () => {
    const storage = new MemoryStorage()
    startAndSaveRun(storage, loadGame(storage), 666666)
    storage.setItem(V2_SAVE_KEY, 'old-v2-slot'); storage.setItem(LEGACY_SAVE_KEY, 'old-v1-slot')
    const cleared = clearGame(storage)
    expect(cleared.phase).toBe('birth-selection')
    expect(cleared.currentSession).toBeNull()
    expect(cleared.pendingBirthSelection).toBeNull()
    expect(cleared.meta.totalRuns).toBe(0)
    expect(storage.getItem(SAVE_KEY)).toBeNull(); expect(storage.getItem(V2_SAVE_KEY)).toBeNull(); expect(storage.getItem(LEGACY_SAVE_KEY)).toBeNull()
  })
})
