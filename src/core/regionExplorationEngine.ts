import { getWorldLocationById } from '../data/worldLocations'
import type { CombatOpponentId } from '../types/combat'
import type { ExplorationDuration, ExplorationStage, RegionRisk } from '../types/exploration'
import type { GameState } from '../types/game'
import type { SublocationRuntime } from '../types/sublocation'
import type { WorldDanger } from '../types/world'
import { applyGameAction } from './gameActionReducer'
import { hasActiveInjury } from './injuryEngine'
import { getLocationKnowledgeStatus } from './locationKnowledgeEngine'
import { hasSeriousPoison } from './poisonEngine'
import { getRegionRiskAssessment } from './riskAssessmentEngine'
import { refreshSectAssignmentAfterExploration } from './sectAssignmentEngine'
import { discoverEligibleSublocations } from './sublocationEngine'
import { planWildernessEncounter, startWildernessEncounter } from './wildernessEncounterEngine'

export const EXPLORATION_DURATIONS: readonly ExplorationDuration[] = [1, 3, 10]

const EXPLORATION_STAGE_LABELS: Record<ExplorationStage, string> = {
  initial: '初步探索',
  familiar: '较为熟悉',
  deep: '深入探索',
  surveyed: '基本探明',
}

const REGION_RISK_LABELS: Record<RegionRisk, string> = {
  low: '大致可控',
  manageable: '需要谨慎',
  high: '明显危险',
  extreme: '极可能送命',
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
  encounteredOpponentId?: CombatOpponentId
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

export function getCurrentRegionRisk(state: GameState, danger: WorldDanger): RegionRisk {
  const locationId = state.world.currentLocationId ?? ''
  return getRegionRiskAssessment(state, locationId, danger).risk
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
  if (state.pendingBeastLoot) return rejected(state, days, 'PENDING_BEAST_LOOT_BLOCKS_EXPLORATION')
  if (hasActiveInjury(state, 'severe')) {
    return rejected(state, days, 'SEVERE_INJURY_BLOCKS_EXPLORATION')
  }
  if (hasSeriousPoison(state)) {
    return rejected(state, days, 'SERIOUS_POISON_BLOCKS_EXPLORATION')
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
  const encounterPlan = planWildernessEncounter(state, current.id, previousExploredDays, days)
  const elapsedDays = encounterPlan.encountered ? (encounterPlan.encounterAfterDays ?? days) : days
  const advanced = applyGameAction(state, { type: 'ADVANCE_TIME', days: elapsedDays })
  if (!advanced.applied) return rejected(state, days, advanced.reason ?? 'TIME_ADVANCE_FAILED')

  if (advanced.state.status !== 'playing') {
    return {
      state: advanced.state,
      applied: true,
      completed: false,
      locationId: current.id,
      days: advanced.state.worldDay - state.worldDay,
      previousExploredDays,
      exploredDays: previousExploredDays,
      stageBefore,
      stageAfter: stageBefore,
      discoveredSublocations: [],
    }
  }

  const exploredDays = previousExploredDays + elapsedDays
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
  const encounter = startWildernessEncounter(discovery.state, encounterPlan)
  const assignmentRefreshed = refreshSectAssignmentAfterExploration(encounter.state, current.id, elapsedDays)
  const interrupted = encounter.encountered

  return {
    state: assignmentRefreshed,
    applied: true,
    completed: !interrupted,
    locationId: current.id,
    days: elapsedDays,
    previousExploredDays,
    exploredDays,
    stageBefore,
    stageAfter: getExplorationStage(exploredDays),
    discoveredSublocations: discovery.discovered,
    ...(interrupted && encounter.opponentId ? { encounteredOpponentId: encounter.opponentId } : {}),
  }
}
