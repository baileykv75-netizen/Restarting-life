import { ARMOR_COMBAT, COMBAT_OPPONENTS, WEAPON_COMBAT, getPlayerCombatStats } from '../data/combat'
import type { CombatOpponentId } from '../types/combat'
import type { RegionRisk } from '../types/exploration'
import type { GameState } from '../types/game'
import type { WorldDanger } from '../types/world'
import { getOrdinaryBeastEncounterWeightMultiplier } from './beastEcologySelectors'
import { getEquippedItemId } from './equipmentEngine'
import { getActiveInjuries } from './injuryEngine'
import { hasSeriousPoison } from './poisonEngine'
import { getKnownStrongThreatOpponentIds } from './strongBeastTerritoryEngine'
import { getOrdinaryWildernessEncounterPool } from './wildernessEncounterEngine'

export interface RiskAssessment {
  risk: RegionRisk
  signals: string[]
}

const DANGER_RANK: Readonly<Record<WorldDanger, number>> = {
  safe: 0,
  low: 1,
  moderate: 2,
  high: 3,
  extreme: 4,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function combatBaseBand(state: GameState): number {
  const stats = getPlayerCombatStats(state.cultivation.realm, state.cultivation.stage)
  if (stats.baseAttack <= 10) return 0
  if (stats.baseAttack <= 14) return 1
  if (stats.baseAttack <= 20) return 2
  if (stats.baseAttack <= 26) return 3
  if (stats.baseAttack <= 48) return 4
  return 5
}

function preparationBonus(state: GameState): { band: number; signals: string[] } {
  let points = 0
  const signals: string[] = []
  const weaponId = getEquippedItemId(state, 'main-weapon')
  const armorId = getEquippedItemId(state, 'armor')
  const protectiveId = getEquippedItemId(state, 'protective-artifact')
  const supportId = getEquippedItemId(state, 'support-artifact')

  if (weaponId && WEAPON_COMBAT[weaponId]) {
    points += WEAPON_COMBAT[weaponId].basicMultiplier >= 1.4 ? 0.8 : 0.6
    signals.push('主武器已准备')
  }
  if (armorId && ARMOR_COMBAT[armorId]) {
    points += ARMOR_COMBAT[armorId].armorReduction >= 0.18 ? 0.7 : 0.5
    signals.push('护甲能提供真实减伤')
  }
  if (protectiveId === 'heart_guard_mirror') {
    points += 0.35
    signals.push('护心镜能兜住一次重击')
  }
  if (supportId === 'flowing_cloud_boots') {
    points += 0.3
    signals.push('流云靴让撤离更有余地')
  }
  const movementIds = new Set(['qingshen_shu', 'liuyun_bu', 'tafeng_xing'])
  if ((state.cultivation.auxiliaryTechniqueIds ?? []).some((id) => movementIds.has(id))) {
    points += 0.3
    signals.push('已启用可用于脱身的身法')
  }
  if (state.identity.talentIds.includes('light_foot')) {
    points += 0.15
    signals.push('身轻步稳让山地撤离更稳定')
  }

  return { band: points >= 1 ? 1 : 0, signals }
}

function healthPenalty(state: GameState): { band: number; signals: string[] } {
  const injuries = getActiveInjuries(state)
  let band = 0
  const signals: string[] = []
  if (injuries.some((injury) => injury.kind === 'severe')) {
    band += 2
    signals.push('重伤会显著压低实际承伤能力')
  }
  if (injuries.some((injury) => injury.kind === 'meridian')) {
    band += 1
    signals.push('经脉伤会限制战斗中的可用灵力')
  }
  if (hasSeriousPoison(state)) {
    band += 1
    signals.push('严重中毒正在削弱当前气血状态')
  }
  return { band, signals }
}

function playerCapabilityBand(state: GameState): { band: number; signals: string[] } {
  const preparation = preparationBonus(state)
  const health = healthPenalty(state)
  return {
    band: clamp(combatBaseBand(state) + preparation.band - health.band, 0, 5),
    signals: [...health.signals, ...preparation.signals],
  }
}

function ordinaryEcologyShift(state: GameState, locationId: string): { shift: number; signal?: string } {
  const pool = getOrdinaryWildernessEncounterPool(locationId)
  if (pool.length === 0) return { shift: 0 }
  const average = pool.reduce((sum, candidate) => (
    sum + getOrdinaryBeastEncounterWeightMultiplier(state, locationId, candidate.beastId)
  ), 0) / pool.length
  if (average >= 1.35) return { shift: 1, signal: '近期普通妖兽活动明显偏密' }
  if (average <= 0.5) return { shift: -1, signal: '这一带普通妖兽活动已经明显变稀' }
  return { shift: 0 }
}

function riskFromDifference(difference: number): RegionRisk {
  if (difference >= 2) return 'extreme'
  if (difference === 1) return 'high'
  if (difference <= -2) return 'low'
  return 'manageable'
}

function opponentThreatBand(opponentId: CombatOpponentId): number {
  const opponent = COMBAT_OPPONENTS[opponentId]
  if (opponent.realm === 'mortal') return 0
  if (opponent.realm === 'qi') {
    if (opponent.stage <= 3) return 1
    if (opponent.stage <= 6) return 2
    return 3
  }
  if (opponent.realm === 'foundation') return opponent.stage <= 2 ? 4 : 5
  return 5
}

export function getOpponentRiskAssessment(state: GameState, opponentId: CombatOpponentId): RiskAssessment {
  const capability = playerCapabilityBand(state)
  const threat = opponentThreatBand(opponentId)
  const risk = riskFromDifference(threat - capability.band)
  const signals = [...capability.signals]
  if (risk === 'high' || risk === 'extreme') signals.unshift('对方量级已经明显压过你当前的正面战斗余地')
  else if (risk === 'low') signals.unshift('以你现在的状态，对方已经不属于主要威胁')
  else signals.unshift('双方差距没有大到可以忽略临场失误')
  if (state.identity.talentIds.includes('danger_sense') && (risk === 'high' || risk === 'extreme')) {
    signals.push('危机直觉：真正踏进去后，退路可能比抢先出手更重要')
  }
  return { risk, signals }
}

export function getRegionRiskAssessment(state: GameState, locationId: string, danger: WorldDanger): RiskAssessment {
  const capability = playerCapabilityBand(state)
  const ecology = ordinaryEcologyShift(state, locationId)
  const knownStrong = getKnownStrongThreatOpponentIds(state, locationId)
  let threatBand = DANGER_RANK[danger] + ecology.shift
  if (knownStrong.length > 0) threatBand += 1
  threatBand = clamp(threatBand, 0, 5)

  const signals = [...capability.signals]
  if (ecology.signal) signals.push(ecology.signal)
  if (knownStrong.length > 0) signals.push('你已经确认这里还存在远强于外围普通妖兽的活动痕迹')
  const risk = riskFromDifference(threatBand - capability.band)
  if (state.identity.talentIds.includes('danger_sense') && (risk === 'high' || risk === 'extreme')) {
    signals.push('危机直觉：这里给你的不安已经超过普通野外遭遇')
  }
  return { risk, signals }
}
