import type { GameState } from '../types/game'
import { seedToState } from './rng'

export interface CreateGameStateOptions {
  runSeed: string
  runId?: string
}

export function createInitialGameState({
  runSeed,
  runId = `run-${runSeed}`,
}: CreateGameStateOptions): GameState {
  if (runSeed.trim().length === 0) {
    throw new Error('runSeed must not be empty')
  }

  return {
    schemaVersion: 2,
    runId,
    runSeed,
    rngState: seedToState(runSeed),
    status: 'playing',
    worldDay: 0,
    identity: {
      name: '未命名',
      birthDay: 0,
      backgroundId: '',
      spiritRootId: '',
      talentIds: [],
      faction: 'mortal',
    },
    stats: {
      constitution: 5,
      comprehension: 5,
      spiritSense: 5,
      mentality: 5,
      luck: 5,
    },
    resources: {
      spiritStones: 0,
      cultivation: 0,
    },
    cultivation: {
      realm: 'mortal',
      stage: 0,
    },
    tags: [],
    flags: {},
    relationships: {},
    events: {
      currentEventId: null,
      queue: [],
      history: [],
    },
    endReason: null,
  }
}
