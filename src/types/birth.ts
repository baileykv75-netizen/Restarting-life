import type { GameState } from './game'

export interface BirthCandidate {
  id: string
  index: number
  name: string
  backgroundId: string
  spiritRootId: string
  physiqueId: string
  talentIds: string[]
  stats: GameState['stats']
  spiritStones: number
}

export interface PendingBirthSelection {
  runSeed: string
  runId: string
  candidates: BirthCandidate[]
  nextRngState: number
}
