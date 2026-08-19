import { getSectAssignmentById, QINGYUN_SECT_ASSIGNMENTS, type SectAssignmentDefinition } from '../data/sectAssignments'
import type { GameState } from '../types/game'
import type { SectAssignmentId, SectProgressState } from '../types/sect'
import { getOrdinaryBeastEncounterWeightMultiplier } from './beastEcologySelectors'
import { resolveCombatStart } from './combatEngine'
import { addItem, canAddItem, getInventoryQuantity, removeItem } from './inventoryEngine'
import { hasActiveInjury } from './injuryEngine'
import { hasSeriousPoison } from './poisonEngine'
import { getSectAccess } from './sectMembershipEngine'
import { advanceWorldTime } from './worldEngine'

export interface SectAssignmentMutationResult {
  state: GameState
  applied: boolean
  reason?: string
}

export interface SectAssignmentAvailability {
  definition: SectAssignmentDefinition
  available: boolean
  reason?: string
}

function emptyProgress(): SectProgressState {
  return { contribution: 0, history: [] }
}

function getProgress(state: GameState): SectProgressState {
  return state.sectProgress ?? emptyProgress()
}

function hasResolvedAssignment(state: GameState, assignmentId: SectAssignmentId): boolean {
  return getProgress(state).history.some((entry) => entry.assignmentId === assignmentId)
}

function revealAssignmentDestination(state: GameState, definition: SectAssignmentDefinition): GameState {
  if (state.knowledge.locations[definition.targetLocationId] === 'discovered') return state
  return {
    ...state,
    knowledge: {
      locations: {
        ...state.knowledge.locations,
        [definition.targetLocationId]: 'discovered',
      },
    },
  }
}

function appendAcceptanceChronicle(state: GameState, definition: SectAssignmentDefinition): GameState {
  return {
    ...state,
    chronicle: [...state.chronicle, {
      id: `${state.runId}:sect-assignment:${definition.id}:accepted:${state.worldDay}`,
      startDay: state.worldDay,
      endDay: state.worldDay,
      title: `领下事务 · ${definition.name}`,
      sceneText: '事务堂把差事内容、地点和交结方式写进了你的任务牌。',
      narrative: definition.description,
      choiceText: `接下${definition.name}`,
      changes: [
        { label: '目的地', value: definition.targetLocationLabel, tone: 'neutral' },
        { label: '完成目标', value: definition.objectiveText, tone: 'neutral' },
      ],
      importance: 'routine',
      sourceType: 'activity',
      sourceId: `sect-assignment:${definition.id}:accepted`,
      locationId: state.world.currentLocationId ?? undefined,
    }],
  }
}

function appendSettlementChronicle(
  state: GameState,
  definition: SectAssignmentDefinition,
  contributionBefore: number,
): GameState {
  return {
    ...state,
    chronicle: [...state.chronicle, {
      id: `${state.runId}:sect-assignment:${definition.id}:settled:${state.worldDay}`,
      startDay: state.worldDay,
      endDay: state.worldDay,
      title: `交结事务 · ${definition.name}`,
      sceneText: '你回到事务堂交回任务牌，执事核过结果后把这桩差事记入名册。',
      narrative: `这桩${definition.name}已经正式交结。`,
      changes: [
        { label: '宗门贡献', value: `${contributionBefore} → ${contributionBefore + definition.contributionReward}`, tone: 'positive' },
        { label: '下品灵石', value: `+${definition.spiritStoneReward}枚`, tone: 'positive' },
      ],
      importance: definition.kind === 'cull' ? 'notable' : 'routine',
      sourceType: 'activity',
      sourceId: `sect-assignment:${definition.id}:settled`,
      locationId: state.world.currentLocationId ?? undefined,
    }],
  }
}

function markReady(state: GameState): GameState {
  const progress = state.sectProgress
  const active = progress?.activeAssignment
  if (!progress || !active || active.status === 'ready-to-settle') return state
  return {
    ...state,
    sectProgress: {
      ...progress,
      activeAssignment: {
        ...active,
        status: 'ready-to-settle',
        objectiveCompletedDay: state.worldDay,
      },
    },
  }
}

export function getSectContribution(state: GameState): number {
  return getProgress(state).contribution
}

export function getActiveSectAssignmentDefinition(state: GameState): SectAssignmentDefinition | undefined {
  const id = state.sectProgress?.activeAssignment?.assignmentId
  return id ? getSectAssignmentById(id) : undefined
}

export function getSectAssignmentAvailability(state: GameState, assignmentId: SectAssignmentId): SectAssignmentAvailability | null {
  const definition = getSectAssignmentById(assignmentId)
  if (!definition) return null
  if (state.status !== 'playing') return { definition, available: false, reason: 'GAME_ENDED' }
  if (!getSectAccess(state).affairsHallEntry) return { definition, available: false, reason: 'SECT_AFFAIRS_ACCESS_REQUIRED' }
  if (state.world.currentLocationId !== 'qingyun_sect') return { definition, available: false, reason: 'SECT_AFFAIRS_HALL_REQUIRES_QINGYUN' }
  if (state.sectProgress?.activeAssignment) return { definition, available: false, reason: 'SECT_ASSIGNMENT_ALREADY_ACTIVE' }
  if (hasResolvedAssignment(state, assignmentId)) return { definition, available: false, reason: 'SECT_ASSIGNMENT_ALREADY_RESOLVED' }
  if (definition.kind === 'cull' && getOrdinaryBeastEncounterWeightMultiplier(state, definition.targetLocationId, 'greenback_wolf') <= 0) {
    return { definition, available: false, reason: 'SECT_CULL_TARGET_CURRENTLY_DEPLETED' }
  }
  return { definition, available: true }
}

export function getVisibleSectAssignmentOffers(state: GameState): SectAssignmentAvailability[] {
  return QINGYUN_SECT_ASSIGNMENTS.map((definition) => getSectAssignmentAvailability(state, definition.id))
    .filter((entry): entry is SectAssignmentAvailability => entry !== null)
}

export function resolveAcceptSectAssignment(state: GameState, assignmentId: SectAssignmentId): SectAssignmentMutationResult {
  const availability = getSectAssignmentAvailability(state, assignmentId)
  if (!availability?.available) return { state, applied: false, reason: availability?.reason ?? 'UNKNOWN_SECT_ASSIGNMENT' }
  const definition = availability.definition
  const progress = getProgress(state)
  let next: GameState = {
    ...state,
    sectProgress: {
      ...progress,
      activeAssignment: {
        assignmentId,
        acceptedDay: state.worldDay,
        status: 'accepted',
        progressDays: 0,
      },
    },
  }
  next = revealAssignmentDestination(next, definition)
  next = appendAcceptanceChronicle(next, definition)
  return { state: next, applied: true }
}

export function resolvePerformSectAssignment(state: GameState): SectAssignmentMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  const active = state.sectProgress?.activeAssignment
  const definition = getActiveSectAssignmentDefinition(state)
  if (!active || !definition) return { state, applied: false, reason: 'NO_ACTIVE_SECT_ASSIGNMENT' }
  if (active.status !== 'accepted') return { state, applied: false, reason: 'SECT_ASSIGNMENT_OBJECTIVE_ALREADY_COMPLETE' }
  if (state.world.currentLocationId !== definition.targetLocationId) return { state, applied: false, reason: 'SECT_ASSIGNMENT_WRONG_LOCATION' }

  if (definition.kind === 'herb') {
    if (!definition.workDays || !definition.gatherItem) return { state, applied: false, reason: 'SECT_ASSIGNMENT_DEFINITION_INVALID' }
    if (!state.inventory) return { state, applied: false, reason: 'INVENTORY_NOT_INITIALIZED' }
    if (hasActiveInjury(state, 'severe')) return { state, applied: false, reason: 'SEVERE_INJURY_BLOCKS_SECT_WORK' }
    if (hasSeriousPoison(state)) return { state, applied: false, reason: 'SERIOUS_POISON_BLOCKS_SECT_WORK' }
    if (!canAddItem(state, definition.gatherItem.itemId, definition.gatherItem.quantity)) {
      return { state, applied: false, reason: 'SECT_ASSIGNMENT_INVENTORY_FULL' }
    }
    const advanced = advanceWorldTime(state, definition.workDays).state
    if (advanced.status !== 'playing') return { state: advanced, applied: true }
    const gathered = addItem(advanced, definition.gatherItem.itemId, definition.gatherItem.quantity)
    if (!gathered.applied) return { state, applied: false, reason: gathered.reason ?? 'SECT_ASSIGNMENT_GATHER_FAILED' }
    return { state: markReady(gathered.state), applied: true }
  }

  if (definition.kind === 'cull') {
    if (!definition.combatOpponentId) return { state, applied: false, reason: 'SECT_ASSIGNMENT_DEFINITION_INVALID' }
    if (getOrdinaryBeastEncounterWeightMultiplier(state, definition.targetLocationId, 'greenback_wolf') <= 0) {
      return { state, applied: false, reason: 'SECT_CULL_TARGET_CURRENTLY_DEPLETED' }
    }
    const started = resolveCombatStart(state, definition.combatOpponentId, 'field', [], 'ordinary')
    if (!started.applied) return { state, applied: false, reason: started.reason }
    if (!started.state.combat && started.state.pendingBeastLoot?.beastId === 'greenback_wolf') {
      return { state: markReady(started.state), applied: true }
    }
    return { state: started.state, applied: true }
  }

  return { state, applied: false, reason: 'SECT_ASSIGNMENT_USES_EXISTING_WORLD_ACTION' }
}

export function refreshSectAssignmentAfterExploration(state: GameState, locationId: string, elapsedDays: number): GameState {
  const progress = state.sectProgress
  const active = progress?.activeAssignment
  const definition = getActiveSectAssignmentDefinition(state)
  if (!progress || !active || !definition || active.status !== 'accepted') return state
  if (definition.kind !== 'patrol' || definition.targetLocationId !== locationId || elapsedDays <= 0) return state
  const requiredDays = definition.workDays ?? 0
  const progressDays = Math.min(requiredDays, active.progressDays + elapsedDays)
  const progressed: GameState = {
    ...state,
    sectProgress: {
      ...progress,
      activeAssignment: { ...active, progressDays },
    },
  }
  return progressDays >= requiredDays && progressed.status === 'playing' && !progressed.combat ? markReady(progressed) : progressed
}

export function refreshSectAssignmentAfterTravel(state: GameState, arrived: boolean, destinationId?: string): GameState {
  const active = state.sectProgress?.activeAssignment
  const definition = getActiveSectAssignmentDefinition(state)
  if (!active || !definition || active.status !== 'accepted') return state
  if (definition.kind !== 'escort' || !arrived || destinationId !== definition.targetLocationId) return state
  return markReady(state)
}

export function refreshSectAssignmentAfterCombat(before: GameState, after: GameState): GameState {
  const active = after.sectProgress?.activeAssignment
  const definition = getActiveSectAssignmentDefinition(after)
  const combat = before.combat
  if (!active || !definition || active.status !== 'accepted' || !combat || after.combat) return after
  if (after.status !== 'playing') return after

  if (definition.kind === 'cull' && combat.opponentId === definition.combatOpponentId) {
    const victoryLoot = after.pendingBeastLoot
    if (victoryLoot?.sourceBattleId === combat.battleId && victoryLoot.beastId === 'greenback_wolf') return markReady(after)
    return after
  }

  if (definition.kind === 'patrol' && active.progressDays >= (definition.workDays ?? 0) && combat.locationId === definition.targetLocationId) {
    return markReady(after)
  }
  return after
}

export function resolveSettleSectAssignment(state: GameState): SectAssignmentMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.world.currentLocationId !== 'qingyun_sect') return { state, applied: false, reason: 'SECT_ASSIGNMENT_SETTLEMENT_REQUIRES_QINGYUN' }
  if (!getSectAccess(state).affairsHallEntry) return { state, applied: false, reason: 'SECT_AFFAIRS_ACCESS_REQUIRED' }
  const progress = state.sectProgress
  const active = progress?.activeAssignment
  const definition = getActiveSectAssignmentDefinition(state)
  if (!progress || !active || !definition) return { state, applied: false, reason: 'NO_ACTIVE_SECT_ASSIGNMENT' }
  if (active.status !== 'ready-to-settle') return { state, applied: false, reason: 'SECT_ASSIGNMENT_OBJECTIVE_INCOMPLETE' }

  let next = state
  if (definition.gatherItem) {
    if (getInventoryQuantity(next, definition.gatherItem.itemId) < definition.gatherItem.quantity) {
      return { state, applied: false, reason: 'SECT_ASSIGNMENT_REQUIRED_ITEMS_MISSING' }
    }
    const removed = removeItem(next, definition.gatherItem.itemId, definition.gatherItem.quantity)
    if (!removed.applied) return { state, applied: false, reason: removed.reason ?? 'SECT_ASSIGNMENT_ITEM_HANDIN_FAILED' }
    next = removed.state
  }

  const contributionBefore = progress.contribution
  next = {
    ...next,
    resources: { ...next.resources, spiritStones: next.resources.spiritStones + definition.spiritStoneReward },
    sectProgress: {
      contribution: contributionBefore + definition.contributionReward,
      history: [...progress.history, {
        assignmentId: definition.id,
        outcome: 'settled',
        resolvedDay: next.worldDay,
        contributionDelta: definition.contributionReward,
      }],
    },
  }
  next = appendSettlementChronicle(next, definition, contributionBefore)
  return { state: next, applied: true }
}

export function resolveAbandonSectAssignment(state: GameState): SectAssignmentMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  const progress = state.sectProgress
  const active = progress?.activeAssignment
  const definition = getActiveSectAssignmentDefinition(state)
  if (!progress || !active || !definition) return { state, applied: false, reason: 'NO_ACTIVE_SECT_ASSIGNMENT' }

  let next = state
  if (active.status === 'ready-to-settle' && definition.gatherItem) {
    const owned = getInventoryQuantity(next, definition.gatherItem.itemId)
    const toReturn = Math.min(owned, definition.gatherItem.quantity)
    if (toReturn > 0) {
      const removed = removeItem(next, definition.gatherItem.itemId, toReturn)
      if (removed.applied) next = removed.state
    }
  }

  next = {
    ...next,
    sectProgress: {
      contribution: progress.contribution,
      history: [...progress.history, {
        assignmentId: definition.id,
        outcome: 'abandoned',
        resolvedDay: next.worldDay,
        contributionDelta: 0,
      }],
    },
  }
  return { state: next, applied: true }
}
