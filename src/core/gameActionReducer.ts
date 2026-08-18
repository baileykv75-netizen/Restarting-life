import { getWorldLocationById } from '../data/worldLocations'
import type { GameState, LifeStage, LocationKnowledgeStatus } from '../types/game'
import type { GameAction, GameFlagValue } from '../types/gameAction'
import { resolveBeastLootAbandon, resolveBeastLootClaim } from './beastEngine'
import { resolveCombatAction, resolveCombatStart } from './combatEngine'
import { resolveSublocationInitialization } from './sublocationEngine'
import { advanceWorldTime } from './worldEngine'

export interface GameActionResult {
  state: GameState
  applied: boolean
  reason?: string
}

function rejected(state: GameState, reason: string): GameActionResult { return { state, applied: false, reason } }
function isNonEmptyId(value: string): boolean { return value.trim().length > 0 }
function isLifeStage(value: unknown): value is LifeStage { return value === 'legacy-adult' || value === 'childhood' || value === 'adult' }
function isLocationKnowledgeStatus(value: unknown): value is LocationKnowledgeStatus { return value === 'rumored' || value === 'discovered' }
function isFlagValue(value: unknown): value is GameFlagValue { return typeof value === 'boolean' || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) }

export function applyGameAction(state: GameState, action: GameAction): GameActionResult {
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  if (state.combat && action.type !== 'COMBAT_ACTION') return rejected(state, 'COMBAT_ACTIVE')

  switch (action.type) {
    case 'ADVANCE_TIME': {
      if (!Number.isSafeInteger(action.days) || action.days <= 0) return rejected(state, 'INVALID_TIME')
      return { state: advanceWorldTime(state, action.days).state, applied: true }
    }
    case 'SET_FLAG': {
      if (!isNonEmptyId(action.key) || !isFlagValue(action.value)) return rejected(state, 'INVALID_FLAG')
      if (state.flags[action.key] === action.value) return rejected(state, 'NO_CHANGE')
      return { state: { ...state, flags: { ...state.flags, [action.key]: action.value } }, applied: true }
    }
    case 'REMOVE_FLAG': {
      if (!isNonEmptyId(action.key)) return rejected(state, 'INVALID_FLAG')
      if (!Object.prototype.hasOwnProperty.call(state.flags, action.key)) return rejected(state, 'FLAG_NOT_SET')
      const nextFlags = { ...state.flags }
      delete nextFlags[action.key]
      return { state: { ...state, flags: nextFlags }, applied: true }
    }
    case 'SET_LIFE_STAGE': {
      if (!isLifeStage(action.stage)) return rejected(state, 'INVALID_LIFE_STAGE')
      if (state.lifeStage === action.stage) return rejected(state, 'NO_CHANGE')
      return { state: { ...state, lifeStage: action.stage }, applied: true }
    }
    case 'SET_CURRENT_LOCATION': {
      if (action.locationId !== null && !isNonEmptyId(action.locationId)) return rejected(state, 'INVALID_LOCATION')
      if (state.world.currentLocationId === action.locationId) return rejected(state, 'NO_CHANGE')
      return { state: { ...state, world: { ...state.world, currentLocationId: action.locationId } }, applied: true }
    }
    case 'INITIALIZE_SUBLOCATIONS': {
      return resolveSublocationInitialization(state)
    }
    case 'START_COMBAT': {
      const result = resolveCombatStart(state, action.opponentId, action.source, action.contextTags, action.encounterVariant)
      return { state: result.state, applied: result.applied, reason: result.reason }
    }
    case 'COMBAT_ACTION': {
      const result = resolveCombatAction(state, action.action)
      return { state: result.state, applied: result.applied, reason: result.reason }
    }
    case 'CLAIM_BEAST_LOOT': {
      const result = resolveBeastLootClaim(state, action.itemId, action.quantity)
      return { state: result.state, applied: result.applied, reason: result.reason }
    }
    case 'ABANDON_BEAST_LOOT': {
      const result = resolveBeastLootAbandon(state)
      return { state: result.state, applied: result.applied, reason: result.reason }
    }
    case 'SET_LOCATION_KNOWLEDGE': {
      if (!isNonEmptyId(action.locationId) || !isLocationKnowledgeStatus(action.status)) return rejected(state, 'INVALID_LOCATION_KNOWLEDGE')
      if (!getWorldLocationById(action.locationId)) return rejected(state, 'INVALID_LOCATION_KNOWLEDGE_ID')
      const current = state.knowledge.locations[action.locationId]
      if (current === 'discovered' && action.status === 'rumored') return rejected(state, 'LOCATION_KNOWLEDGE_CANNOT_DOWNGRADE')
      if (current === action.status) return rejected(state, 'NO_CHANGE')
      return { state: { ...state, knowledge: { locations: { ...state.knowledge.locations, [action.locationId]: action.status } } }, applied: true }
    }
  }
}
