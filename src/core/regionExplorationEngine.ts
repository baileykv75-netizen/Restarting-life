import { getWorldLocationById } from '../data/worldLocations'
import type { ExplorationDuration, ExplorationStage, RegionRisk } from '../types/exploration'
import type { GameState } from '../types/game'
import type { SublocationRuntime } from '../types/sublocation'
import type { WorldDanger } from '../types/world'
import { applyGameAction } from './gameActionReducer'
import { getLocationKnowledgeStatus } from './locationKnowledgeEngine'
import { discoverEligibleSublocations } from './sublocationEngine'

export const EXPLORATION_DURATIONS: readonly ExplorationDuration[] = [1, 3, 10]

const EXPLORATION_STAGE_LABELS: Record<ExplorationStage, string> = {
  initial: '初步探索',
  familiar: '较为熟悉',
  deep: '深入探索',
  surveyed: '基本探明',
}

const REGION_RISK_LABELS: Record<RegionRisk, string> = {
  low: '较低',
  manageable: '可控',
  high: '较高',
  extreme: '极高',
}

const DANGER_RANK: Record<WorldDanger, number> = {
  safe: 0,
  low: 1,
  moderate: 2,
  high: 3,
  extreme: 4,
}

export interface RegionExplorationResult {
  state: GameState
  applied: boolean
  completed: boolean
  locationId?: string
  days: number
  previousExploredDays: number
  exploredDays: number
  stageBefore: ExplorationStage | null
  stageAfter: ExplorationStage | null
  discoveredSublocations: SublocationRuntime[]
  reason?: string
}

export function getExplorationStage(exploredDays: number): ExplorationStage | null {
  if (exploredDays >= 30) return 'surveyed'
  if (exploredDays >= 15) return 'deep'
  if (exploredDays >= 5) return 'familiar'
  if (exploredDays >= 1) return 'initial'
  return null
}

export function getExplorationStageLabel(stage: ExplorationStage | null): string {
  return stage ? EXPLORATION_STAGE_LABELS[stage] : '尚未系统探索'
}

export function getRegionRiskLabel(risk: RegionRisk): string {
  return REGION_RISK_LABELS[risk]
}

function characterRiskRank(state: GameState): number {
  if (state.cultivation.realm === 'mortal') return 0
  if (state.cultivation.realm === 'qi') {
    if (state.cultivation.stage <= 3) return 1
    if (state.cultivation.stage <= 6) return 2
    return 3
  }
  if (state.cultivation.realm === 'foundation') return 4
  return 5
}

export function getCurrentRegionRisk(state: GameState, danger: WorldDanger): RegionRisk {
  const difference = DANGER_RANK[danger] - characterRiskRank(state)
  if (difference >= 2) return 'extreme'
  if (difference === 1) return 'high'
  if (difference <= -2) return 'low'
  return 'manageable'
}

export function isExplorableFixedRegion(locationId: string): boolean {
  return getWorldLocationById(locationId)?.type === 'wilderness'
}

export function getRegionExploredDays(state: GameState, locationId: string): number {
  return state.exploration?.locations[locationId]?.exploredDays ?? 0
}

function isValidDuration(days: number): days is ExplorationDuration {
  return EXPLORATION_DURATIONS.includes(days as ExplorationDuration)
}

function rejected(state: GameState, days: number, reason: string): RegionExplorationResult {
  const currentId = state.world.currentLocationId ?? undefined
  const previousExploredDays = currentId ? getRegionExploredDays(state, currentId) : 0
  const stage = getExplorationStage(previousExploredDays)
  return {
    state,
    applied: false,
    completed: false,
    locationId: currentId,
    days,
    previousExploredDays,
    exploredDays: previousExploredDays,
    stageBefore: stage,
    stageAfter: stage,
    discoveredSublocations: [],
    reason,
  }
}

export function resolveRegionExploration(state: GameState, days: number): RegionExplorationResult {
  if (state.status !== 'playing') return rejected(state, days, 'GAME_ENDED')
  if (!isValidDuration(days)) return rejected(state, days, 'INVALID_EXPLORATION_DURATION')
  if (state.lifeStage !== 'adult' || state.flags.location_knowledge_initialized !== true) {
    return rejected(state, days, 'EXPLORATION_REQUIRES_LOCATION_KNOWLEDGE')
  }

  const currentId = state.world.currentLocationId
  const current = currentId ? getWorldLocationById(currentId) : undefined
  if (!current) return rejected(state, days, 'INVALID_CURRENT_LOCATION')
  if (getLocationKnowledgeStatus(state, current.id) !== 'discovered') {
    return rejected(state, days, 'CURRENT_LOCATION_NOT_DISCOVERED')
  }
  if (current.type !== 'wilderness') return rejected(state, days, 'LOCATION_NOT_EXPLORABLE')

  const previousExploredDays = getRegionExploredDays(state, current.id)
  const stageBefore = getExplorationStage(previousExploredDays)
  const advanced = applyGameAction(state, { type: 'ADVANCE_TIME', days })
  if (!advanced.applied) return rejected(state, days, advanced.reason ?? 'TIME_ADVANCE_FAILED')

  if (advanced.state.status !== 'playing') {
    return {
      state: advanced.state,
      applied: true,
      completed: false,
      locationId: current.id,
      days,
      previousExploredDays,
      exploredDays: previousExploredDays,
      stageBefore,
      stageAfter: stageBefore,
      discoveredSublocations: [],
    }
  }

  const exploredDays = previousExploredDays + days
  const progressedState: GameState = {
    ...advanced.state,
    exploration: {
      locations: {
        ...(advanced.state.exploration?.locations ?? {}),
        [current.id]: { locationId: current.id, exploredDays },
      },
    },
  }
  const discovery = discoverEligibleSublocations(progressedState, current.id, exploredDays)

  return {
    state: discovery.state,
    applied: true,
    completed: true,
    locationId: current.id,
    days,
    previousExploredDays,
    exploredDays,
    stageBefore,
    stageAfter: getExplorationStage(exploredDays),
    discoveredSublocations: discovery.discovered,
  }
}
