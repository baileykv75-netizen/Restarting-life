import {
  COMBAT_MOVES,
  COMBAT_OPPONENTS,
  ARMOR_COMBAT,
  WEAPON_COMBAT,
  getCombatMove,
  getPlayerCombatStats,
  type CombatOpponentSpecialDefinition,
} from '../data/combat'
import { getItemDefinition } from '../data/items'
import { getTechniqueById } from '../data/techniques'
import type { BeastCombatContextTag, BeastEncounterVariant } from '../types/beast'
import type { CombatAction, CombatOpponentId, CombatSource, CombatState, CombatStatusState, CombatTelegraph, CombatantRuntime } from '../types/combat'
import type { GameState, Realm } from '../types/game'
import { prepareBeastEncounter, settleBeastVictory } from './beastEngine'
import { getEquippedItemId, resolveEquipItem } from './equipmentEngine'
import { getInventoryQuantity, removeItem } from './inventoryEngine'
import { addInjuries, addOrExtendCombatSevereInjury, getActiveInjuries, hasActiveInjury } from './injuryEngine'
import { hasSeriousPoison, resolveApplyPoisonCondition } from './poisonEngine'
import { nextRandom, seedToState } from './rng'
import { isTechniqueMoveUnlocked } from './techniqueEngine'

export interface CombatMutationResult {
  state: GameState
  applied: boolean
  completed: boolean
  reason?: string
}

export interface FleeModifier {
  label: string
  percent: number
}

export interface FleePreview {
  chance: number
  modifiers: FleeModifier[]
  blockedReason?: string
}

export interface CombatMoveView {
  key: string
  techniqueId: string
  moveId: string
  name: string
  qiCost: number
  ready: boolean
  reason?: string
}

const COMBAT_ITEM_IDS = [
  'huiqi_dan',
  'fire_talisman',
  'golden_blade_talisman',
  'protective_talisman',
  'lightness_talisman',
  'spirit_breaking_awl',
  'thunderfire_orb',
  'beast_binding_rope',
] as const

const REALM_RANK: Readonly<Record<Realm, number>> = { mortal: 0, qi: 1, foundation: 2, golden_core: 3 }
const MOVEMENT_FLEE: Readonly<Record<string, number>> = { qingshen_shu: 8, liuyun_bu: 15, tafeng_xing: 20 }

function rejected(state: GameState, reason: string): CombatMutationResult {
  return { state, applied: false, completed: false, reason }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function moveKey(techniqueId: string, moveId: string): string {
  return `${techniqueId}:${moveId}`
}

function isStatusActive(untilBeat: number | undefined, beat: number): boolean {
  return untilBeat !== undefined && untilBeat >= beat
}

function appendLog(combat: CombatState, message: string): CombatState {
  return { ...combat, log: [...combat.log, message].slice(-5) }
}

function hasCombatContext(combat: CombatState, tag: BeastCombatContextTag): boolean {
  return combat.contextTags?.includes(tag) ?? false
}

function isColdPoolPython(combat: CombatState): boolean {
  return combat.opponentId === 'cold-pool-scale-python' && hasCombatContext(combat, 'cold-pool')
}

function playerWeaponId(state: GameState): string | null {
  return getEquippedItemId(state, 'main-weapon')
}

function playerArmorReduction(state: GameState): number {
  const itemId = getEquippedItemId(state, 'armor')
  return itemId ? (ARMOR_COMBAT[itemId]?.armorReduction ?? 0) : 0
}

function playerWeaponValues(state: GameState): { multiplier: number; interval: number; penetration: number; itemId: string | null } {
  const itemId = playerWeaponId(state)
  const definition = itemId ? WEAPON_COMBAT[itemId] : undefined
  return definition
    ? { multiplier: definition.basicMultiplier, interval: definition.basicInterval, penetration: definition.armorPenetration, itemId }
    : { multiplier: 0.75, interval: 1, penetration: 0, itemId: null }
}

function realmBand(realm: Realm, stage: number): number {
  if (realm === 'mortal') return 0
  if (realm === 'qi') return stage <= 3 ? 0 : stage <= 6 ? 1 : 2
  if (realm === 'foundation') return stage <= 2 ? 0 : 1
  return 0
}

function realmDifferenceModifier(playerRealm: Realm, playerStage: number, opponentRealm: Realm, opponentStage: number): number {
  const gap = REALM_RANK[playerRealm] - REALM_RANK[opponentRealm]
  if (gap !== 0) return Math.abs(gap) >= 2 ? Math.sign(gap) * 35 : Math.sign(gap) * 20
  return (realmBand(playerRealm, playerStage) - realmBand(opponentRealm, opponentStage)) * 5
}

function activeMovementFleeBonus(state: GameState): { label: string; percent: number } | null {
  const enabled = state.cultivation.auxiliaryTechniqueIds ?? []
  let bestId: string | null = null
  let best = 0
  for (const id of enabled) {
    if (!(state.cultivation.knownTechniqueIds ?? []).includes(id)) continue
    const value = MOVEMENT_FLEE[id] ?? 0
    if (value > best) { best = value; bestId = id }
  }
  if (!bestId) return null
  return { label: getTechniqueById(bestId)?.name ?? bestId, percent: best }
}

export function getPlayerFleePreview(state: GameState): FleePreview | null {
  const combat = state.combat
  if (!combat) return null
  if (combat.source === 'sunken-vein-core') return { chance: 0, modifiers: [], blockedReason: 'FLEE_BLOCKED_BY_SECRET_REALM_LOCK' }
  if (isStatusActive(combat.player.statuses.boundUntilBeat, combat.beat)) return { chance: 0, modifiers: [], blockedReason: 'PLAYER_BOUND' }
  const opponent = COMBAT_OPPONENTS[combat.opponentId]
  const modifiers: FleeModifier[] = []
  const realm = realmDifferenceModifier(state.cultivation.realm, state.cultivation.stage, opponent.realm, opponent.stage)
  if (realm !== 0) modifiers.push({ label: '境界差', percent: realm })
  const movement = activeMovementFleeBonus(state)
  if (movement) modifiers.push(movement)
  if (state.identity.talentIds.includes('light_foot')) modifiers.push({ label: '身轻步稳', percent: 8 })
  if (getEquippedItemId(state, 'support-artifact') === 'flowing_cloud_boots') modifiers.push({ label: '流云靴', percent: 15 })
  const armorId = getEquippedItemId(state, 'armor')
  const armorFlee = armorId ? (ARMOR_COMBAT[armorId]?.fleeModifier ?? 0) : 0
  if (armorFlee !== 0) modifiers.push({ label: '黑铁护甲', percent: armorFlee })
  if (isStatusActive(combat.player.statuses.lightnessTalismanUntilBeat, combat.beat)) modifiers.push({ label: '轻身符', percent: 25 })
  if (isStatusActive(combat.player.statuses.stoneArmorUntilBeat, combat.beat)) modifiers.push({ label: '石甲护体', percent: -15 })
  if (isStatusActive(combat.player.statuses.slowedUntilBeat, combat.beat)) modifiers.push({ label: '迟缓', percent: -20 })
  const injuries = getActiveInjuries(state)
  let injuryPenalty = 0
  if (injuries.some((injury) => injury.kind === 'light')) injuryPenalty -= 5
  if (injuries.some((injury) => injury.kind === 'severe')) injuryPenalty -= 15
  if (injuries.some((injury) => injury.kind === 'meridian')) injuryPenalty -= 10
  injuryPenalty = Math.max(-20, injuryPenalty)
  if (injuryPenalty !== 0) modifiers.push({ label: '当前伤势', percent: injuryPenalty })
  if (opponent.fleeHook !== 0) modifiers.push({ label: `${opponent.name}追击`, percent: opponent.fleeHook })
  if (isColdPoolPython(combat)) modifiers.push({ label: '寒潭水势', percent: -10 })
  const chance = clamp(50 + modifiers.reduce((sum, item) => sum + item.percent, 0), 10, 90)
  return { chance, modifiers }
}

function getConfiguredMoveKeys(state: GameState): string[] {
  const known = new Set(state.cultivation.knownTechniqueIds ?? [])
  const enabled = new Set(state.cultivation.auxiliaryTechniqueIds ?? [])
  const result: string[] = []
  for (const move of COMBAT_MOVES) {
    if (!known.has(move.techniqueId) || !enabled.has(move.techniqueId)) continue
    const technique = getTechniqueById(move.techniqueId)
    const sourceMove = technique?.moves?.find((candidate) => candidate.id === move.moveId)
    if (!sourceMove || !isTechniqueMoveUnlocked(state, move.techniqueId, sourceMove)) continue
    result.push(moveKey(move.techniqueId, move.moveId))
    if (result.length === 4) break
  }
  return result
}

function isSwordWeapon(itemId: string | null): boolean {
  return itemId === 'qingfeng_sword' || itemId === 'black_iron_greatsword'
}

export function getCombatMoveViews(state: GameState): CombatMoveView[] {
  const combat = state.combat
  if (!combat) return []
  return combat.configuredMoveKeys.map((key) => {
    const [techniqueId = '', moveId = ''] = key.split(':')
    const move = getCombatMove(techniqueId, moveId)
    if (!move) return { key, techniqueId, moveId, name: key, qiCost: 0, ready: false, reason: 'UNKNOWN_COMBAT_MOVE' }
    let reason: string | undefined
    if (combat.player.currentQi < move.qiCost) reason = '灵力不足'
    else if ((combat.moveReadyBeat[key] ?? 1) > combat.beat) reason = `冷却至第 ${combat.moveReadyBeat[key]} 拍`
    else if (move.techniqueId === 'qingfeng_jianjue' && !isSwordWeapon(playerWeaponId(state))) reason = '需要剑类主武器'
    return { key, techniqueId, moveId, name: move.name, qiCost: move.qiCost, ready: reason === undefined, reason }
  })
}

export function getCombatStatusLabels(combatant: CombatantRuntime, beat: number): string[] {
  const status = combatant.statuses
  const labels: string[] = []
  if (isStatusActive(status.boundUntilBeat, beat)) labels.push('束缚')
  if (isStatusActive(status.slowedUntilBeat, beat)) labels.push('迟缓')
  if (status.exposed) labels.push('暴露')
  if (isStatusActive(status.waterScreenUntilBeat, beat)) labels.push('水幕')
  if (isStatusActive(status.stoneArmorUntilBeat, beat)) labels.push('石甲')
  if (isStatusActive(status.protectiveTalismanUntilBeat, beat)) labels.push('护身符')
  if (isStatusActive(status.lightnessTalismanUntilBeat, beat)) labels.push('轻身符')
  if (isStatusActive(status.guardedUntilBeat, beat)) labels.push('护身')
  if (isStatusActive(status.damageBoostUntilBeat, beat)) labels.push('狼啸')
  if (status.enraged) labels.push('狂暴')
  return labels
}

export function getAvailableCombatItems(state: GameState): Array<{ itemId: string; name: string; quantity: number }> {
  if (!state.combat) return []
  return COMBAT_ITEM_IDS.map((itemId) => ({ itemId, name: getItemDefinition(itemId)?.name ?? itemId, quantity: getInventoryQuantity(state, itemId) }))
    .filter((item) => item.quantity > 0)
}

function applyExposed(rawDamage: number, target: CombatantRuntime): { damage: number; target: CombatantRuntime } {
  if (!target.statuses.exposed) return { damage: rawDamage, target }
  return { damage: rawDamage * 1.25, target: { ...target, statuses: { ...target.statuses, exposed: false } } }
}

function temporaryDefenseMultiplier(status: CombatStatusState, beat: number): { multiplier: number; consumed: CombatStatusState } {
  let reduction = 0
  const consumed = { ...status }
  if (isStatusActive(status.waterScreenUntilBeat, beat)) { reduction += 0.35; delete consumed.waterScreenUntilBeat }
  if (isStatusActive(status.stoneArmorUntilBeat, beat)) reduction += 0.2
  if (isStatusActive(status.protectiveTalismanUntilBeat, beat)) { reduction += 0.45; delete consumed.protectiveTalismanUntilBeat }
  if (isStatusActive(status.guardedUntilBeat, beat)) reduction += 0.2
  return { multiplier: 1 - Math.min(0.55, reduction), consumed }
}

function applyDamageToOpponent(combat: CombatState, rawDamage: number, armorPenetration: number): { combat: CombatState; damage: number } {
  let target = combat.opponent
  const exposed = applyExposed(rawDamage, target)
  target = exposed.target
  let raw = exposed.damage
  if (combat.player.statuses.enraged) raw *= 1.2
  if (target.statuses.enraged) raw *= 1.1
  const opponent = COMBAT_OPPONENTS[combat.opponentId]
  const terrainArmor = isColdPoolPython(combat) ? 0.05 : 0
  const armor = clamp(opponent.armorReduction + terrainArmor - armorPenetration, 0, 0.35)
  let damage = Math.max(0, Math.round(raw * (1 - armor)))
  const defense = temporaryDefenseMultiplier(target.statuses, combat.beat)
  target = { ...target, statuses: defense.consumed }
  damage = Math.max(0, Math.round(damage * defense.multiplier))
  target = { ...target, currentHP: Math.max(0, target.currentHP - damage) }
  return { combat: { ...combat, opponent: target }, damage }
}

function applyDamageToPlayer(state: GameState, combat: CombatState, rawDamage: number, armorPenetration: number, heavy: boolean): { combat: CombatState; damage: number } {
  let target = combat.player
  const exposed = applyExposed(rawDamage, target)
  target = exposed.target
  let raw = exposed.damage
  if (combat.opponent.statuses.enraged) raw *= 1.2
  if (target.statuses.enraged) raw *= 1.1
  if (isStatusActive(combat.opponent.statuses.damageBoostUntilBeat, combat.beat)) raw *= 1.15
  if (isColdPoolPython(combat)) raw *= 1.1
  const armor = clamp(playerArmorReduction(state) - armorPenetration, 0, 0.35)
  let damage = Math.max(0, Math.round(raw * (1 - armor)))
  const defense = temporaryDefenseMultiplier(target.statuses, combat.beat)
  target = { ...target, statuses: defense.consumed }
  damage = Math.max(0, Math.round(damage * defense.multiplier))
  let heartGuardUsed = combat.heartGuardUsed
  const mirrorEquipped = getEquippedItemId(state, 'protective-artifact') === 'heart_guard_mirror'
  if (mirrorEquipped && !heartGuardUsed && (heavy || damage >= target.maxHP * 0.25)) {
    damage = Math.max(0, Math.round(damage * 0.5))
    heartGuardUsed = true
  }
  target = { ...target, currentHP: Math.max(0, target.currentHP - damage) }
  return {
    combat: { ...combat, player: target, heartGuardUsed, maxPlayerHitTaken: Math.max(combat.maxPlayerHitTaken, damage) },
    damage,
  }
}

function addDeathChronicle(state: GameState, opponentName: string, source: CombatSource, opponentId: CombatOpponentId): GameState {
  const narrative = source === 'sunken-vein-core'
    ? '在沉脉石室脉心室与成年岩甲蜥交战时，你的气血耗尽。'
    : `在与${opponentName}交战时，你的气血耗尽。`
  const entry = {
    id: `${state.runId}:combat-death:${state.worldDay}:${state.chronicle.length + 1}`,
    startDay: state.worldDay,
    endDay: state.worldDay,
    title: '战斗中身死',
    sceneText: narrative,
    narrative,
    changes: [{ label: '状态', value: '死亡', tone: 'negative' as const }],
    importance: 'major' as const,
    sourceType: 'activity' as const,
    sourceId: `combat:${opponentId}`,
    locationId: state.world.currentLocationId ?? undefined,
  }
  return { ...state, chronicle: [...state.chronicle, entry] }
}

function withoutCombat(state: GameState): GameState {
  const next = { ...state }
  delete next.combat
  return next
}

function applyPostCombatInjury(state: GameState, combat: CombatState): GameState {
  const hpRatio = combat.player.currentHP / combat.player.maxHP
  if (hpRatio <= 0.1 || combat.maxPlayerHitTaken >= combat.player.maxHP * 0.35) {
    return addOrExtendCombatSevereInjury(state, combat.battleId)
  }
  if (hpRatio <= 0.3 || combat.maxPlayerHitTaken >= combat.player.maxHP * 0.25) {
    return addInjuries(state, combat.battleId, [{ kind: 'light', recoveryDays: 10 }])
  }
  return state
}

function applyPendingPoisonExposures(state: GameState, combat: CombatState): GameState {
  let next = state
  const exposures = combat.pendingPoisonExposures?.bishui_venom ?? 0
  for (let index = 0; index < exposures; index += 1) {
    next = resolveApplyPoisonCondition(next, 'bishui_venom').state
  }
  return next
}

function finishSurvivingCombat(state: GameState, combat: CombatState, result: 'victory' | 'player-fled' | 'opponent-fled'): GameState {
  let next = applyPostCombatInjury(state, combat)
  next = applyPendingPoisonExposures(next, combat)

  if (result === 'victory' && combat.source === 'sunken-vein-core' && next.secretRealm) {
    next = {
      ...next,
      secretRealm: {
        sunkenVeinChamber: { ...next.secretRealm.sunkenVeinChamber, encounter: 'victory' },
      },
    }
  } else if (result === 'victory') {
    const opponent = COMBAT_OPPONENTS[combat.opponentId]
    if (opponent.beastId) {
      next = settleBeastVictory(next, {
        beastId: opponent.beastId,
        beastName: opponent.name,
        battleId: combat.battleId,
        locationId: combat.locationId,
        variant: combat.encounterVariant ?? 'ordinary',
        ...(combat.beastInstanceId ? { instanceId: combat.beastInstanceId } : {}),
        ...(combat.contextTags ? { contextTags: combat.contextTags } : {}),
      })
    }
  }
  return withoutCombat(next)
}

function finishDeath(state: GameState, combat: CombatState): GameState {
  const opponent = COMBAT_OPPONENTS[combat.opponentId]
  const endReason = combat.source === 'sunken-vein-core'
    ? '在沉脉石室脉心室与成年岩甲蜥交战时气血耗尽。'
    : `在与${opponent.name}交战时气血耗尽。`
  let dead: GameState = withoutCombat({ ...state, combat, status: 'dead', endReason })
  dead = addDeathChronicle(dead, opponent.name, combat.source, combat.opponentId)
  return dead
}

function humanTelegraphForBeat(combat: CombatState): CombatTelegraph | null {
  if (combat.opponentId !== 'ordinary-loose-cultivator' || combat.beat % 3 !== 0) return null
  if (combat.opponentFireTalismanAvailable) return { id: 'enemy-fire-talisman', label: '散修摸出一张火符', multiplier: 1.45, movementRequired: false, heavy: false, kind: 'item' }
  if (combat.opponent.currentQi >= 12) return { id: 'enemy-firebolt', label: '散修开始凝聚火弹', multiplier: 1.35, movementRequired: false, heavy: false, kind: 'spell' }
  return null
}

function specialReadyBeat(combat: CombatState, special: CombatOpponentSpecialDefinition): number {
  return combat.opponentSpecialReadyBeat?.[special.id] ?? special.initialBeat
}

function selectOpponentSpecial(combat: CombatState): CombatTelegraph | null {
  const opponent = COMBAT_OPPONENTS[combat.opponentId]
  const special = opponent.specials?.find((candidate) => specialReadyBeat(combat, candidate) <= combat.beat)
  return special ? { ...special } : null
}

function setNextTelegraph(combat: CombatState): CombatState {
  if (combat.telegraph) return combat
  const telegraph = humanTelegraphForBeat(combat) ?? selectOpponentSpecial(combat)
  return { ...combat, telegraph }
}

function setSpecialCooldown(combat: CombatState, telegraph: CombatTelegraph): CombatState {
  const cooldown = telegraph.cooldown
  if (cooldown === undefined) return combat
  return {
    ...combat,
    opponentSpecialReadyBeat: {
      ...(combat.opponentSpecialReadyBeat ?? {}),
      [telegraph.id]: combat.beat + cooldown,
    },
  }
}

function getEnemyFleeChance(state: GameState, combat: CombatState): number {
  const opponent = COMBAT_OPPONENTS[combat.opponentId]
  if (opponent.lowHealthFleeChance !== undefined) return opponent.lowHealthFleeChance
  const modifier = realmDifferenceModifier(opponent.realm, opponent.stage, state.cultivation.realm, state.cultivation.stage)
  return clamp(50 + modifier, 10, 90) / 100
}

function resolveEnemyFlee(state: GameState, combat: CombatState): { combat: CombatState; fled: boolean } {
  const opponent = COMBAT_OPPONENTS[combat.opponentId]
  const roll = nextRandom(combat.rngState)
  let nextCombat = { ...combat, rngState: roll.nextState }
  const fled = roll.value < getEnemyFleeChance(state, combat)
  if (!fled) {
    nextCombat = {
      ...nextCombat,
      opponent: {
        ...nextCombat.opponent,
        statuses: { ...nextCombat.opponent.statuses, retreatingUntilBeat: combat.beat + 1 },
      },
    }
    nextCombat = appendLog(nextCombat, `${opponent.name}试图退走，但没能脱离交锋。`)
  }
  return { combat: nextCombat, fled }
}

function specialActionName(telegraph: CombatTelegraph): string {
  const labels: Readonly<Record<string, string>> = {
    pounce: '扑击',
    charge: '冲撞',
    'venom-strike': '毒袭',
    'tail-sweep': '扫尾',
    'charged-smash': '蓄力砸击',
    constrict: '缠杀',
    'cold-breath': '寒息',
    'wind-pounce': '裂风扑杀',
  }
  return labels[telegraph.id] ?? telegraph.label
}

function resolveTelegraphedEnemyAction(state: GameState, combat: CombatState): { combat: CombatState; opponentFled: boolean } {
  const opponent = COMBAT_OPPONENTS[combat.opponentId]
  const telegraph = combat.telegraph
  if (!telegraph) return { combat, opponentFled: false }

  let nextCombat = combat
  if (isStatusActive(nextCombat.opponent.statuses.boundUntilBeat, nextCombat.beat) && telegraph.movementRequired) {
    nextCombat = setSpecialCooldown({ ...nextCombat, telegraph: null }, telegraph)
    nextCombat = appendLog(nextCombat, `${opponent.name}被束缚，${specialActionName(telegraph)}被打断。`)
    return { combat: nextCombat, opponentFled: false }
  }

  if (telegraph.effect === 'escape') {
    const flee = resolveEnemyFlee(state, { ...nextCombat, telegraph: null })
    nextCombat = flee.combat
    if (flee.fled) return { combat: appendLog(nextCombat, `${opponent.name}抓住空隙脱离了战斗。`), opponentFled: true }
    return { combat: nextCombat, opponentFled: false }
  }

  if (telegraph.effect === 'guard-self') {
    nextCombat = setSpecialCooldown({
      ...nextCombat,
      telegraph: null,
      opponent: {
        ...nextCombat.opponent,
        statuses: { ...nextCombat.opponent.statuses, guardedUntilBeat: nextCombat.beat + 2 },
      },
    }, telegraph)
    return { combat: appendLog(nextCombat, `${opponent.name}屈身护住要害，接下来两拍减伤提高。`), opponentFled: false }
  }

  if (telegraph.effect === 'damage-boost') {
    nextCombat = setSpecialCooldown({
      ...nextCombat,
      telegraph: null,
      opponent: {
        ...nextCombat.opponent,
        statuses: { ...nextCombat.opponent.statuses, damageBoostUntilBeat: nextCombat.beat + 3 },
      },
    }, telegraph)
    return { combat: appendLog(nextCombat, `${opponent.name}长啸震谷，接下来三拍攻势更凶。`), opponentFled: false }
  }

  if (telegraph.id === 'enemy-firebolt') {
    nextCombat = { ...nextCombat, opponent: { ...nextCombat.opponent, currentQi: nextCombat.opponent.currentQi - 12 } }
  }
  if (telegraph.id === 'enemy-fire-talisman') {
    nextCombat = { ...nextCombat, opponentFireTalismanAvailable: false }
  }

  const hit = applyDamageToPlayer(state, { ...nextCombat, telegraph: null }, opponent.baseAttack * telegraph.multiplier, 0, telegraph.heavy)
  nextCombat = setSpecialCooldown(hit.combat, telegraph)
  const actionName = telegraph.id.startsWith('enemy-') ? telegraph.label : specialActionName(telegraph)
  nextCombat = appendLog(nextCombat, `${opponent.name}${telegraph.id.startsWith('enemy-') ? '使用' : '施展'}${actionName}，造成 ${hit.damage} 点伤害。`)

  if (telegraph.effect === 'expose-self') {
    nextCombat = {
      ...nextCombat,
      opponent: { ...nextCombat.opponent, statuses: { ...nextCombat.opponent.statuses, exposed: true } },
    }
  }
  if (telegraph.effect === 'bishui-poison-exposure' && hit.damage > 0) {
    nextCombat = {
      ...nextCombat,
      pendingPoisonExposures: {
        ...(nextCombat.pendingPoisonExposures ?? {}),
        bishui_venom: (nextCombat.pendingPoisonExposures?.bishui_venom ?? 0) + 1,
      },
    }
  }
  if (telegraph.effect === 'bind-player' && hit.damage > 0) {
    nextCombat = {
      ...nextCombat,
      player: { ...nextCombat.player, statuses: { ...nextCombat.player.statuses, boundUntilBeat: nextCombat.beat + 1 } },
    }
  }
  if (telegraph.effect === 'slow-player' && hit.damage > 0) {
    nextCombat = {
      ...nextCombat,
      player: { ...nextCombat.player, statuses: { ...nextCombat.player.statuses, slowedUntilBeat: nextCombat.beat + 2 } },
    }
  }
  return { combat: nextCombat, opponentFled: false }
}

function resolveEnemyPhase(state: GameState, combat: CombatState): { state: GameState; combat: CombatState; opponentFled: boolean } {
  const opponent = COMBAT_OPPONENTS[combat.opponentId]
  let nextCombat = combat

  if (nextCombat.telegraph) {
    const resolved = resolveTelegraphedEnemyAction(state, nextCombat)
    return { state, combat: resolved.combat, opponentFled: resolved.opponentFled }
  }

  const lowHealthTriggered = opponent.lowHealthBehavior &&
    !nextCombat.opponent.statuses.lowHealthResolved &&
    nextCombat.opponent.currentHP <= nextCombat.opponent.maxHP * (opponent.lowHealthRatio ?? 0)

  if (lowHealthTriggered && opponent.lowHealthBehavior === 'enrage') {
    nextCombat = appendLog({
      ...nextCombat,
      opponent: {
        ...nextCombat.opponent,
        statuses: { ...nextCombat.opponent.statuses, enraged: true, lowHealthResolved: true },
      },
    }, `${opponent.name}进入狂暴。`)
  }

  if (lowHealthTriggered && opponent.lowHealthBehavior === 'escape-telegraph' && !isStatusActive(nextCombat.opponent.statuses.boundUntilBeat, nextCombat.beat)) {
    nextCombat = appendLog({
      ...nextCombat,
      opponent: {
        ...nextCombat.opponent,
        statuses: { ...nextCombat.opponent.statuses, lowHealthResolved: true },
      },
      telegraph: {
        id: 'urgent-escape',
        label: '后退观察，随时准备急遁',
        multiplier: 0,
        movementRequired: true,
        heavy: false,
        kind: 'physical',
        effect: 'escape',
      },
    }, `${opponent.name}突然拉开距离，正在寻找脱身空隙。`)
    return { state, combat: nextCombat, opponentFled: false }
  }

  if (lowHealthTriggered && opponent.lowHealthBehavior === 'flee') {
    const secretRockCannotFlee = nextCombat.source === 'sunken-vein-core' && nextCombat.opponentId === 'adult-rock-lizard'
    if (secretRockCannotFlee) {
      nextCombat = {
        ...nextCombat,
        opponent: { ...nextCombat.opponent, statuses: { ...nextCombat.opponent.statuses, lowHealthResolved: true } },
      }
    } else if (!isStatusActive(nextCombat.opponent.statuses.boundUntilBeat, nextCombat.beat)) {
      nextCombat = {
        ...nextCombat,
        opponent: { ...nextCombat.opponent, statuses: { ...nextCombat.opponent.statuses, lowHealthResolved: true } },
      }
      const flee = resolveEnemyFlee(state, nextCombat)
      if (flee.fled) return { state, combat: appendLog(flee.combat, `${opponent.name}脱离了战斗。`), opponentFled: true }
      return { state, combat: flee.combat, opponentFled: false }
    }
  }

  if (isStatusActive(nextCombat.opponent.statuses.boundUntilBeat, nextCombat.beat)) {
    return { state, combat: appendLog(nextCombat, `${opponent.name}被束缚，本拍未能普通攻击。`), opponentFled: false }
  }
  if (nextCombat.beat < nextCombat.opponent.nextBasicAttackBeat) return { state, combat: nextCombat, opponentFled: false }
  const hit = applyDamageToPlayer(state, nextCombat, opponent.baseAttack * opponent.basicMultiplier, 0, false)
  nextCombat = appendLog({ ...hit.combat, opponent: { ...hit.combat.opponent, nextBasicAttackBeat: nextCombat.beat + opponent.basicInterval } }, `${opponent.name}${opponent.basicLabel}，造成 ${hit.damage} 点伤害。`)
  return { state, combat: nextCombat, opponentFled: false }
}

function advanceBeat(combat: CombatState): CombatState {
  const advanced = { ...combat, beat: combat.beat + 1, weaponSwitchUsedThisBeat: false }
  return setNextTelegraph(advanced)
}

function resolvePlayerBasic(state: GameState, combat: CombatState): CombatState {
  if (isStatusActive(combat.player.statuses.boundUntilBeat, combat.beat)) return appendLog(combat, '你被束缚，本拍无法普通攻击。')
  if (combat.beat < combat.player.nextBasicAttackBeat) return appendLog(combat, '武器尚未恢复到下一次普通攻击节拍。')
  const weapon = playerWeaponValues(state)
  const hit = applyDamageToOpponent(combat, combat.player.baseAttack * weapon.multiplier, weapon.penetration)
  const name = weapon.itemId ? (getItemDefinition(weapon.itemId)?.name ?? '主武器') : '徒手攻击'
  return appendLog({ ...hit.combat, player: { ...hit.combat.player, nextBasicAttackBeat: combat.beat + weapon.interval } }, `你以${name}普通攻击，造成 ${hit.damage} 点伤害。`)
}

function consumeQi(combat: CombatState, amount: number): CombatState {
  return { ...combat, player: { ...combat.player, currentQi: combat.player.currentQi - amount } }
}

function resolvePlayerMove(state: GameState, combat: CombatState, techniqueId: string, moveId: string): { state: GameState; combat?: CombatState; reason?: string } {
  const key = moveKey(techniqueId, moveId)
  if (!combat.configuredMoveKeys.includes(key)) return { state, reason: 'COMBAT_MOVE_NOT_CONFIGURED' }
  const move = getCombatMove(techniqueId, moveId)
  if (!move) return { state, reason: 'UNKNOWN_COMBAT_MOVE' }
  if (combat.player.currentQi < move.qiCost) return { state, reason: 'NOT_ENOUGH_QI' }
  if ((combat.moveReadyBeat[key] ?? 1) > combat.beat) return { state, reason: 'COMBAT_MOVE_COOLDOWN' }
  if (techniqueId === 'qingfeng_jianjue' && !isSwordWeapon(playerWeaponId(state))) return { state, reason: 'COMBAT_MOVE_REQUIRES_SWORD' }

  let next = consumeQi(combat, move.qiCost)
  const readyBeat = combat.beat + move.cooldown + 1
  next = { ...next, moveReadyBeat: { ...next.moveReadyBeat, [key]: readyBeat } }
  if (move.kind === 'guard') {
    if (moveId === 'water_screen') next = { ...next, player: { ...next.player, statuses: { ...next.player.statuses, waterScreenUntilBeat: combat.beat + 1 } } }
    if (moveId === 'stone_armor') next = { ...next, player: { ...next.player, statuses: { ...next.player.statuses, stoneArmorUntilBeat: combat.beat + 2 } } }
    return { state, combat: appendLog(next, `你施展${move.name}。`) }
  }
  if (move.kind === 'control' && moveId === 'bind') {
    const opponent = COMBAT_OPPONENTS[combat.opponentId]
    const gap = REALM_RANK[opponent.realm] - REALM_RANK[state.cultivation.realm]
    const chance = gap > 0 ? 40 : gap < 0 ? 90 : 70
    const roll = nextRandom(next.rngState)
    next = { ...next, rngState: roll.nextState }
    if (roll.value < chance / 100) {
      next = { ...next, opponent: { ...next.opponent, statuses: { ...next.opponent.statuses, boundUntilBeat: combat.beat } } }
      return { state, combat: appendLog(next, `缠束成功，${opponent.name}本拍受到束缚。`) }
    }
    return { state, combat: appendLog(next, `缠束未能限制${opponent.name}。`) }
  }

  const weapon = playerWeaponValues(state)
  let multiplier = move.multiplier ?? 1
  if (moveId === 'sword_chase' && isStatusActive(next.opponent.statuses.retreatingUntilBeat, combat.beat)) multiplier = 1.65
  if (moveId === 'thorn' && isStatusActive(next.opponent.statuses.boundUntilBeat, combat.beat)) multiplier = 1.55
  let raw = next.player.baseAttack * multiplier
  if (move.kind === 'weapon') raw *= weapon.multiplier
  const weaponDefinition = weapon.itemId ? WEAPON_COMBAT[weapon.itemId] : undefined
  if (move.element === 'fire' && weaponDefinition?.fireActiveDamageMultiplier) raw *= weaponDefinition.fireActiveDamageMultiplier
  const hit = applyDamageToOpponent(next, raw, (move.armorPenetration ?? 0) + (move.kind === 'weapon' ? weapon.penetration : 0))
  return { state, combat: appendLog(hit.combat, `你施展${move.name}，造成 ${hit.damage} 点伤害。`) }
}

function removeCombatItem(state: GameState, itemId: string): { state?: GameState; reason?: string } {
  if (getInventoryQuantity(state, itemId) < 1) return { reason: 'COMBAT_ITEM_NOT_OWNED' }
  const removed = removeItem(state, itemId, 1)
  return removed.applied ? { state: removed.state } : { reason: removed.reason ?? 'COMBAT_ITEM_CONSUME_FAILED' }
}

function resolvePlayerItem(state: GameState, combat: CombatState, itemId: string): { state?: GameState; combat?: CombatState; reason?: string } {
  if (!COMBAT_ITEM_IDS.includes(itemId as (typeof COMBAT_ITEM_IDS)[number])) return { reason: 'ITEM_NOT_USABLE_IN_COMBAT' }
  if (itemId === 'huiqi_dan' && combat.qiPillsUsed >= 2) return { reason: 'HUIQI_DAN_BATTLE_LIMIT' }
  if (itemId === 'beast_binding_rope' && !COMBAT_OPPONENTS[combat.opponentId].beast) return { reason: 'BEAST_BINDING_ROPE_REQUIRES_BEAST' }
  const removed = removeCombatItem(state, itemId)
  if (!removed.state) return { reason: removed.reason }
  let next = combat
  if (itemId === 'huiqi_dan') {
    const restored = Math.min(40, next.player.maxQi - next.player.currentQi)
    next = { ...next, qiPillsUsed: next.qiPillsUsed + 1, player: { ...next.player, currentQi: next.player.currentQi + restored } }
    return { state: removed.state, combat: appendLog(next, `你服下一枚回气丹，恢复 ${restored} 点灵力。`) }
  }
  if (itemId === 'protective_talisman') {
    next = { ...next, player: { ...next.player, statuses: { ...next.player.statuses, protectiveTalismanUntilBeat: combat.beat + 2 } } }
    return { state: removed.state, combat: appendLog(next, '你激发护身符，准备挡下下一次命中。') }
  }
  if (itemId === 'lightness_talisman') {
    const statuses = { ...next.player.statuses, lightnessTalismanUntilBeat: combat.beat + 2 }
    delete statuses.slowedUntilBeat
    next = { ...next, player: { ...next.player, statuses } }
    return { state: removed.state, combat: appendLog(next, '你激发轻身符，脚下顿时轻快许多。') }
  }
  if (itemId === 'spirit_breaking_awl') {
    const targetStatuses = next.opponent.statuses
    const hasGuard = isStatusActive(targetStatuses.waterScreenUntilBeat, combat.beat) || isStatusActive(targetStatuses.stoneArmorUntilBeat, combat.beat) || isStatusActive(targetStatuses.protectiveTalismanUntilBeat, combat.beat) || isStatusActive(targetStatuses.guardedUntilBeat, combat.beat)
    if (hasGuard) {
      const statuses = { ...targetStatuses, exposed: true }
      delete statuses.waterScreenUntilBeat
      delete statuses.stoneArmorUntilBeat
      delete statuses.protectiveTalismanUntilBeat
      delete statuses.guardedUntilBeat
      next = { ...next, opponent: { ...next.opponent, statuses } }
      return { state: removed.state, combat: appendLog(next, '破灵锥撕开了对方的临时防护，使其暴露。') }
    }
    const hit = applyDamageToOpponent(next, next.player.baseAttack * 0.6, 0)
    return { state: removed.state, combat: appendLog(hit.combat, `破灵锥没有找到可破的防护，只造成 ${hit.damage} 点伤害。`) }
  }
  if (itemId === 'beast_binding_rope') {
    const opponent = COMBAT_OPPONENTS[next.opponentId]
    const gap = REALM_RANK[opponent.realm] - REALM_RANK[state.cultivation.realm]
    const chance = gap <= 0 ? 85 : gap === 1 ? 50 : 20
    const duration = gap <= 0 ? 2 : 1
    const roll = nextRandom(next.rngState)
    next = { ...next, rngState: roll.nextState }
    if (roll.value < chance / 100) {
      next = { ...next, opponent: { ...next.opponent, statuses: { ...next.opponent.statuses, boundUntilBeat: combat.beat + duration - 1 } } }
      return { state: removed.state, combat: appendLog(next, `困兽索束住${opponent.name} ${duration} 拍。`) }
    }
    return { state: removed.state, combat: appendLog(next, `困兽索没能困住${opponent.name}。`) }
  }

  let raw = next.player.baseAttack
  let penetration = 0
  if (itemId === 'fire_talisman') raw *= 1.45
  if (itemId === 'golden_blade_talisman') { raw *= 1.3; penetration = 0.2 }
  if (itemId === 'thunderfire_orb') { raw = Math.min(next.player.baseAttack * 2.2, next.opponent.maxHP * 0.35); penetration = 0.1 }
  const hit = applyDamageToOpponent(next, raw, penetration)
  return { state: removed.state, combat: appendLog(hit.combat, `你使用${getItemDefinition(itemId)?.name ?? itemId}，造成 ${hit.damage} 点伤害。`) }
}

function startPrerequisite(state: GameState, opponentId: CombatOpponentId, source: CombatSource): string | undefined {
  if (state.status !== 'playing') return 'GAME_ENDED'
  if (state.lifeStage !== 'adult') return 'COMBAT_REQUIRES_ADULT'
  if (state.combat) return 'COMBAT_ALREADY_ACTIVE'
  if (state.pendingBeastLoot) return 'BEAST_LOOT_PENDING'
  if (!COMBAT_OPPONENTS[opponentId]) return 'UNKNOWN_COMBAT_OPPONENT'
  if (state.events.currentEventId !== null) return 'EVENT_PENDING'
  if (source === 'sunken-vein-core') {
    const runtime = state.secretRealm?.sunkenVeinChamber
    if (!runtime?.active || runtime.currentNodeId !== 'vein-heart-chamber' || !runtime.coreLockedBehindPlayer || runtime.encounter !== 'unresolved') return 'SECRET_REALM_CORE_COMBAT_UNAVAILABLE'
    if (opponentId !== 'adult-rock-lizard') return 'SECRET_REALM_CORE_OPPONENT_INVALID'
  }
  return undefined
}

export function resolveCombatStart(
  state: GameState,
  opponentId: CombatOpponentId,
  source: CombatSource,
  contextTags: readonly BeastCombatContextTag[] = [],
  requestedVariant?: BeastEncounterVariant,
): CombatMutationResult {
  const prerequisite = startPrerequisite(state, opponentId, source)
  if (prerequisite) return rejected(state, prerequisite)
  const opponent = COMBAT_OPPONENTS[opponentId]
  let workingState = state
  let encounterVariant: BeastEncounterVariant | undefined = requestedVariant
  let beastInstanceId: string | undefined

  if (source !== 'sunken-vein-core' && opponent.beastId) {
    const prepared = prepareBeastEncounter(state, opponent.beastId, state.world.currentLocationId, requestedVariant)
    if (!prepared.applied) return rejected(state, prepared.reason ?? 'BEAST_ENCOUNTER_UNAVAILABLE')
    workingState = prepared.state
    encounterVariant = prepared.variant
    beastInstanceId = prepared.instanceId
  } else if (source === 'sunken-vein-core') {
    encounterVariant = 'special'
  }

  const playerStats = getPlayerCombatStats(workingState.cultivation.realm, workingState.cultivation.stage)
  const hpMultiplier = hasActiveInjury(workingState, 'severe') ? 0.7 : hasSeriousPoison(workingState) ? 0.85 : 1
  const qiMultiplier = hasActiveInjury(workingState, 'meridian') ? 0.65 : 1
  const playerMaxHP = Math.max(1, Math.floor(playerStats.maxHP * hpMultiplier))
  const playerMaxQi = Math.max(0, Math.floor(playerStats.maxQi * qiMultiplier))
  const mainRoll = nextRandom(workingState.rngState)
  const combatSeed = seedToState(`${workingState.runSeed}:r20-combat:${mainRoll.nextState}:${source}:${opponentId}`)
  let combat: CombatState = {
    battleId: `${workingState.runId}:combat:${opponentId}:${workingState.worldDay}:${mainRoll.nextState}`,
    source,
    opponentId,
    locationId: workingState.world.currentLocationId,
    beat: 1,
    rngState: combatSeed,
    player: { currentHP: playerMaxHP, maxHP: playerMaxHP, currentQi: playerMaxQi, maxQi: playerMaxQi, baseAttack: playerStats.baseAttack, nextBasicAttackBeat: 1, statuses: {} },
    opponent: { currentHP: opponent.maxHP, maxHP: opponent.maxHP, currentQi: opponent.maxQi, maxQi: opponent.maxQi, baseAttack: opponent.baseAttack, nextBasicAttackBeat: 1, statuses: {} },
    configuredMoveKeys: getConfiguredMoveKeys(workingState),
    moveReadyBeat: {},
    qiPillsUsed: 0,
    heartGuardUsed: false,
    weaponSwitchUsedThisBeat: false,
    openingShotResolved: false,
    opponentFireTalismanAvailable: opponentId === 'ordinary-loose-cultivator',
    telegraph: null,
    maxPlayerHitTaken: 0,
    log: [`遭遇${opponent.name}。`],
    contextTags: [...contextTags],
    ...(encounterVariant ? { encounterVariant } : {}),
    ...(beastInstanceId ? { beastInstanceId } : {}),
    opponentSpecialReadyBeat: {},
    pendingPoisonExposures: {},
  }
  let nextState: GameState = { ...workingState, rngState: mainRoll.nextState, combat }
  const openingWeapon = playerWeaponId(workingState)
  if (openingWeapon === 'green_bamboo_spirit_bow') {
    const weapon = WEAPON_COMBAT[openingWeapon]
    const hit = applyDamageToOpponent(combat, combat.player.baseAttack * (weapon.rangedOpeningMultiplier ?? 1.15), 0)
    combat = appendLog({ ...hit.combat, openingShotResolved: true }, `青竹灵弓先手命中，造成 ${hit.damage} 点伤害。`)
    nextState = { ...nextState, combat }
    if (combat.opponent.currentHP <= 0) return { state: finishSurvivingCombat(nextState, combat, 'victory'), applied: true, completed: true }
  }
  return { state: nextState, applied: true, completed: false }
}

function resolveWeaponSwitch(state: GameState, combat: CombatState, itemId: string): CombatMutationResult {
  if (combat.weaponSwitchUsedThisBeat) return rejected(state, 'COMBAT_WEAPON_SWITCH_ALREADY_USED')
  if (playerWeaponId(state) === itemId) return rejected(state, 'COMBAT_WEAPON_UNCHANGED')
  const definition = getItemDefinition(itemId)
  if (!definition || definition.equipmentSlot !== 'main-weapon') return rejected(state, 'COMBAT_SWITCH_REQUIRES_WEAPON')
  const equipped = resolveEquipItem(state, itemId)
  if (!equipped.applied) return rejected(state, equipped.reason ?? 'COMBAT_WEAPON_SWITCH_FAILED')
  const nextCombat = appendLog({ ...combat, weaponSwitchUsedThisBeat: true }, `你切换为${definition.name}。`)
  return { state: { ...equipped.state, combat: nextCombat }, applied: true, completed: false }
}

export function resolveCombatAction(state: GameState, action: CombatAction): CombatMutationResult {
  const combat = state.combat
  if (!combat) return rejected(state, 'NO_ACTIVE_COMBAT')
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  if (action.type === 'switch-weapon') return resolveWeaponSwitch(state, combat, action.itemId)

  let workingState = state
  let workingCombat = combat
  if (action.type === 'basic') {
    workingCombat = resolvePlayerBasic(workingState, workingCombat)
  } else if (action.type === 'move') {
    const result = resolvePlayerMove(workingState, workingCombat, action.techniqueId, action.moveId)
    if (!result.combat) return rejected(state, result.reason ?? 'COMBAT_MOVE_FAILED')
    workingState = result.state
    workingCombat = result.combat
  } else if (action.type === 'item') {
    const result = resolvePlayerItem(workingState, workingCombat, action.itemId)
    if (!result.state || !result.combat) return rejected(state, result.reason ?? 'COMBAT_ITEM_FAILED')
    workingState = result.state
    workingCombat = result.combat
  } else if (action.type === 'flee') {
    const preview = getPlayerFleePreview({ ...workingState, combat: workingCombat })
    if (!preview) return rejected(state, 'FLEE_PREVIEW_UNAVAILABLE')
    if (preview.blockedReason) return rejected(state, preview.blockedReason)
    const roll = nextRandom(workingCombat.rngState)
    workingCombat = { ...workingCombat, rngState: roll.nextState }
    if (roll.value < preview.chance / 100) {
      workingCombat = appendLog(workingCombat, '你成功脱离了战斗。')
      workingState = { ...workingState, combat: workingCombat }
      return { state: finishSurvivingCombat(workingState, workingCombat, 'player-fled'), applied: true, completed: true }
    }
    workingCombat = appendLog(workingCombat, '你试图脱离战斗，但没有成功。')
  }

  workingState = { ...workingState, combat: workingCombat }
  if (workingCombat.opponent.currentHP <= 0) {
    return { state: finishSurvivingCombat(workingState, workingCombat, 'victory'), applied: true, completed: true }
  }

  const enemy = resolveEnemyPhase(workingState, workingCombat)
  workingState = enemy.state
  workingCombat = enemy.combat
  workingState = { ...workingState, combat: workingCombat }
  if (enemy.opponentFled) return { state: finishSurvivingCombat(workingState, workingCombat, 'opponent-fled'), applied: true, completed: true }
  if (workingCombat.player.currentHP <= 0) return { state: finishDeath(workingState, workingCombat), applied: true, completed: true }

  const advanced = advanceBeat(workingCombat)
  return { state: { ...workingState, combat: advanced }, applied: true, completed: false }
}

export function getCombatOpponentName(opponentId: CombatOpponentId): string {
  return COMBAT_OPPONENTS[opponentId].name
}

export function getCombatOpponentRealmLabel(opponentId: CombatOpponentId): string {
  const opponent = COMBAT_OPPONENTS[opponentId]
  if (opponent.realmLabel) return opponent.realmLabel
  if (opponent.realm === 'qi') return `炼气${opponent.stage}层量级`
  if (opponent.realm === 'foundation') return `筑基${opponent.stage}阶段量级`
  if (opponent.realm === 'golden_core') return '金丹量级'
  return '凡俗量级'
}

export function getCombatItemIds(): readonly string[] {
  return COMBAT_ITEM_IDS
}
