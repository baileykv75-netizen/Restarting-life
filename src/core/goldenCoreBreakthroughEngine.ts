import { SPIRIT_ROOTS } from '../data/spiritRoots'
import { getCultivationTechniqueById } from '../data/techniques'
import { getWorldLocationById } from '../data/worldLocations'
import type { StateChange } from '../types/chronicle'
import type { GameState } from '../types/game'
import type { ResolvedOutcome } from '../types/persistence'
import type { QiDensity } from '../types/world'
import { addInjuries, hasActiveInjury } from './injuryEngine'
import { getInventoryQuantity, removeItem } from './inventoryEngine'
import { applyPermanentLifespanPenalty, getEffectiveMaxLifespanYears } from './lifespanEngine'
import { nextRandom } from './rng'
import { getProficiencyLabel, getTechniqueProficiencyStage } from './techniqueEngine'
import { formatDuration } from './timeEngine'
import { advanceWorldTime } from './worldEngine'

export type GoldenCoreRoute = 'standard' | 'evil'
export type GoldenCoreSpiritStoneInvestment = 0 | 200 | 400
export type GoldenCoreFailureSeverity = 'light' | 'severe' | 'extreme'
export interface GoldenCoreBreakthroughOptions { route: GoldenCoreRoute; useBaoyuanDan: boolean; useCenturySpiritGinsengForRecovery: boolean; spiritStoneInvestment: GoldenCoreSpiritStoneInvestment }
export interface GoldenCoreModifier { label: string; percent: number }
export interface GoldenCoreBreakthroughPreview {
  successPercent: number; route: GoldenCoreRoute; techniqueId: string; techniqueName: string; proficiencyLabel: string; locationId: string; locationName: string; environmentLabel: string; modifiers: GoldenCoreModifier[];
  ownsBaoyuanDan: boolean; ownsCenturySpiritGinseng: boolean; ownsEvilBeastCore: boolean; ownsHighGradeBeastEssence: boolean; spiritStoneInvestment: GoldenCoreSpiritStoneInvestment; useBaoyuanDan: boolean; useCenturySpiritGinsengForRecovery: boolean
}
export interface GoldenCoreBreakthroughResult { state: GameState; applied: boolean; completed: boolean; reason?: string; success?: boolean; severity?: GoldenCoreFailureSeverity; outcome?: ResolvedOutcome; preview?: GoldenCoreBreakthroughPreview }

const GOLDEN_CORE_DURATION_DAYS = 60
const BAOYUAN_DAN_ID = 'baoyuan_dan'
const CENTURY_GINSENG_ID = 'century_spirit_ginseng'
const EVIL_CORE_ID = 'complete_second_tier_beast_core'
const EVIL_ESSENCE_ID = 'high_grade_beast_essence'
const EVIL_SUCCESS_PENALTY = 'lifespan_penalty:evil_core_success'
const ENVIRONMENT_MODIFIER: Record<QiDensity, number> = { none: -15, thin: -10, low: -6, medium: 0, high: 8 }
const ENVIRONMENT_LABEL: Record<QiDensity, string> = { none: '几乎无灵气', thin: '灵气稀薄', low: '灵气偏低', medium: '灵气普通', high: '灵气充沛' }
const PROFICIENCY_MODIFIER = { entry: 0, skilled: 5, minor: 10, major: 15 } as const

function rejected(state: GameState, reason: string): GoldenCoreBreakthroughResult { return { state, applied: false, completed: false, reason } }
function clampChance(value: number): number { return Math.max(5, Math.min(90, Math.round(value))) }
function hasGuidance(state: GameState): boolean { return state.flags['breakthrough_guidance:golden_core'] === true }
function isInvestment(value: number): value is GoldenCoreSpiritStoneInvestment { return value === 0 || value === 200 || value === 400 }
function getInvestmentModifier(value: GoldenCoreSpiritStoneInvestment): number { return value === 200 ? 10 : value === 400 ? 18 : 0 }
function getEnvironment(state: GameState): { modifier: number; label: string; locationId: string; locationName: string } | null {
  const locationId = state.world.currentLocationId; const location = locationId ? getWorldLocationById(locationId) : undefined; if (!location) return null
  let density = location.qiDensity; let label = ENVIRONMENT_LABEL[density]
  if (location.id === 'qingyun_sect' && density === 'high' && state.identity.faction !== 'qingyun') { density = 'medium'; label = '宗门外围 · 灵气普通' }
  const blackwindPenalty = location.id === 'blackwind_mountain' ? -6 : 0
  return { modifier: ENVIRONMENT_MODIFIER[density] + blackwindPenalty, label: blackwindPenalty ? `${label} · 灵气紊乱` : label, locationId, locationName: location.name }
}
function getAffinityModifier(state: GameState, techniqueId: string): GoldenCoreModifier {
  const technique = getCultivationTechniqueById(techniqueId); if (!technique || technique.universal) return { label: '通用主修', percent: 0 }
  const root = SPIRIT_ROOTS.find((entry) => entry.id === state.identity.spiritRootId); const matched = Boolean(root?.elements.some((element) => technique.preferredElements.includes(element)))
  return matched ? { label: '灵根与主修契合', percent: 6 } : { label: '灵根与主修不契合', percent: -12 }
}
function validateBase(state: GameState, options: GoldenCoreBreakthroughOptions): string | null {
  if (state.status !== 'playing') return 'GAME_ENDED'
  if (state.lifeStage !== 'adult') return 'GOLDEN_CORE_REQUIRES_ADULT'
  if (state.cultivation.realm !== 'foundation' || state.cultivation.stage !== 4 || state.resources.cultivation !== 1000) return 'FOUNDATION_NOT_COMPLETE'
  if (!state.cultivation.mainTechniqueId) return 'NO_MAIN_TECHNIQUE'
  if (!(state.cultivation.knownTechniqueIds ?? []).includes(state.cultivation.mainTechniqueId)) return 'MAIN_TECHNIQUE_NOT_KNOWN'
  const technique = getCultivationTechniqueById(state.cultivation.mainTechniqueId); if (!technique?.supportsGoldenCoreBreakthrough) return 'MAIN_TECHNIQUE_CANNOT_FORM_CORE'
  if (hasActiveInjury(state, 'severe') || hasActiveInjury(state, 'meridian')) return 'INJURY_BLOCKS_GOLDEN_CORE'
  if (state.secretRealm?.sunkenVeinChamber.active) return 'SECRET_REALM_ACTIVE'
  if (state.events.currentEventId !== null) return 'EVENT_PENDING'
  if (!isInvestment(options.spiritStoneInvestment)) return 'INVALID_GOLDEN_CORE_STONE_INVESTMENT'
  if (!state.world.currentLocationId || !getWorldLocationById(state.world.currentLocationId)) return 'INVALID_GOLDEN_CORE_LOCATION'
  if (state.world.currentLocationId === 'beast_ridge' && state.flags['breakthrough_shelter:beast_ridge'] !== true) return 'GOLDEN_CORE_SITE_UNSAFE'
  if (options.route === 'evil') { if (state.cultivation.mainTechniqueId !== 'yinsui_ningcha') return 'EVIL_CORE_ROUTE_REQUIRES_YINSUI'; if (options.useBaoyuanDan) return 'EVIL_CORE_ROUTE_CANNOT_USE_BAOYUAN' }
  return null
}

export function calculateGoldenCoreBreakthroughPreview(state: GameState, options: GoldenCoreBreakthroughOptions): GoldenCoreBreakthroughPreview | null {
  if (validateBase(state, options)) return null
  const techniqueId = state.cultivation.mainTechniqueId!; const technique = getCultivationTechniqueById(techniqueId)!; const environment = getEnvironment(state)!; const proficiency = getTechniqueProficiencyStage(state, techniqueId); const affinity = getAffinityModifier(state, techniqueId)
  const modifiers: GoldenCoreModifier[] = [
    affinity,
    { label: `主修${getProficiencyLabel(proficiency)}`, percent: PROFICIENCY_MODIFIER[proficiency] },
    ...(technique.ruleTags.includes('cultivation:stable') ? [{ label: '主修运转稳定', percent: 4 }] : []),
    ...(state.identity.talentIds.includes('still_mind') ? [{ label: '静心守一', percent: 4 }] : []),
    ...(hasActiveInjury(state, 'light') ? [{ label: '当前轻伤', percent: -8 }] : []),
    { label: environment.label, percent: environment.modifier },
    ...(options.route === 'standard' && options.useBaoyuanDan ? [{ label: '抱元丹', percent: 25 }] : []),
    ...(options.spiritStoneInvestment > 0 ? [{ label: `聚灵与恢复 ${options.spiritStoneInvestment} 灵石`, percent: getInvestmentModifier(options.spiritStoneInvestment) }] : []),
    ...(hasGuidance(state) ? [{ label: '结丹针对性指点', percent: 10 }] : []),
  ]
  return { successPercent: clampChance(15 + modifiers.reduce((sum, modifier) => sum + modifier.percent, 0)), route: options.route, techniqueId, techniqueName: technique.name, proficiencyLabel: getProficiencyLabel(proficiency), locationId: environment.locationId, locationName: environment.locationName, environmentLabel: environment.label, modifiers,
    ownsBaoyuanDan: getInventoryQuantity(state, BAOYUAN_DAN_ID) > 0, ownsCenturySpiritGinseng: getInventoryQuantity(state, CENTURY_GINSENG_ID) > 0, ownsEvilBeastCore: getInventoryQuantity(state, EVIL_CORE_ID) > 0, ownsHighGradeBeastEssence: getInventoryQuantity(state, EVIL_ESSENCE_ID) > 0,
    spiritStoneInvestment: options.spiritStoneInvestment, useBaoyuanDan: options.useBaoyuanDan, useCenturySpiritGinsengForRecovery: options.useCenturySpiritGinsengForRecovery }
}
function validateResources(state: GameState, options: GoldenCoreBreakthroughOptions): string | null {
  if (state.resources.spiritStones < options.spiritStoneInvestment) return 'NOT_ENOUGH_SPIRIT_STONES'
  if (options.useCenturySpiritGinsengForRecovery && getInventoryQuantity(state, CENTURY_GINSENG_ID) < 1) return 'CENTURY_SPIRIT_GINSENG_NOT_OWNED'
  if (options.route === 'standard' && options.useBaoyuanDan && getInventoryQuantity(state, BAOYUAN_DAN_ID) < 1) return 'BAOYUAN_DAN_NOT_OWNED'
  if (options.route === 'evil') { if (getInventoryQuantity(state, EVIL_CORE_ID) < 1) return 'COMPLETE_SECOND_TIER_BEAST_CORE_NOT_OWNED'; if (getInventoryQuantity(state, EVIL_ESSENCE_ID) < 1) return 'HIGH_GRADE_BEAST_ESSENCE_NOT_OWNED' }
  return null
}
function consumeResources(state: GameState, options: GoldenCoreBreakthroughOptions): GameState | null {
  let next: GameState = { ...state, resources: { ...state.resources, spiritStones: state.resources.spiritStones - options.spiritStoneInvestment } }
  const ids: string[] = []; if (options.route === 'standard' && options.useBaoyuanDan) ids.push(BAOYUAN_DAN_ID); if (options.useCenturySpiritGinsengForRecovery) ids.push(CENTURY_GINSENG_ID); if (options.route === 'evil') ids.push(EVIL_CORE_ID, EVIL_ESSENCE_ID)
  for (const itemId of ids) { const removed = removeItem(next, itemId, 1); if (!removed.applied) return null; next = removed.state }
  return next
}
function severityWeights(successPercent: number, evil: boolean): Record<GoldenCoreFailureSeverity, number> {
  const base = successPercent >= 65 ? { light: 60, severe: 32, extreme: 8 } : successPercent >= 35 ? { light: 45, severe: 40, extreme: 15 } : { light: 30, severe: 45, extreme: 25 }
  return evil ? { light: base.light - 10, severe: base.severe + 5, extreme: base.extreme + 5 } : base
}
function pickSeverity(rngState: number, successPercent: number, evil: boolean): { severity: GoldenCoreFailureSeverity; nextState: number } {
  const step = nextRandom(rngState); const weights = severityWeights(successPercent, evil); const target = step.value * 100
  if (target < weights.light) return { severity: 'light', nextState: step.nextState }; if (target < weights.light + weights.severe) return { severity: 'severe', nextState: step.nextState }; return { severity: 'extreme', nextState: step.nextState }
}
function recoveryDays(days: number, ginseng: boolean): number { return ginseng ? Math.ceil(days * 0.75) : days }
function failureOutcome(preview: GoldenCoreBreakthroughPreview, severity: GoldenCoreFailureSeverity, ginseng: boolean): ResolvedOutcome {
  const label = severity === 'light' ? '轻度失败' : severity === 'severe' ? '严重失败' : '极端失败'; const recovery = severity === 'light' ? recoveryDays(90, ginseng) : severity === 'severe' ? recoveryDays(270, ginseng) : recoveryDays(540, ginseng)
  return { title: `结丹${label}`, narrative: severity === 'light' ? '丹胚未能稳定，灵力重新散入经脉。' : '结丹过程中灵力失控，丹田与经脉受到明显反噬。', changes: [
    { label: '时间', value: `+${formatDuration(GOLDEN_CORE_DURATION_DAYS)}`, tone: 'neutral' }, { label: '结果', value: label, tone: 'negative' }, { label: '预计恢复', value: `约${formatDuration(recovery)}`, tone: 'negative' },
  ], consequence: `本次最终成功率为 ${preview.successPercent}%。恢复并重新修满后才可再次尝试。` }
}
function successOutcome(before: GameState, after: GameState, preview: GoldenCoreBreakthroughPreview): ResolvedOutcome {
  const changes: StateChange[] = [
    { label: '时间', value: `+${formatDuration(GOLDEN_CORE_DURATION_DAYS)}`, tone: 'neutral' }, { label: '境界', value: '筑基圆满 → 金丹', tone: 'positive' }, { label: '最大寿元', value: `${getEffectiveMaxLifespanYears(before)}年 → ${getEffectiveMaxLifespanYears(after)}年`, tone: 'positive' },
  ]; if (preview.route === 'evil') changes.push({ label: '妖丹凝煞代价', value: '-20年最大寿元', tone: 'negative' })
  return { title: '结丹成功', narrative: '丹田中的灵力完成收束，丹胚稳定成形。你正式踏入金丹。', changes, consequence: '金丹是当前首版修炼上限，普通修炼在此停止。' }
}
function appendGoldenCoreChronicle(state: GameState, route: GoldenCoreRoute): GameState {
  return { ...state, chronicle: [...state.chronicle, { id: `${state.runId}:golden-core:${state.worldDay}`, startDay: state.worldDay - GOLDEN_CORE_DURATION_DAYS, endDay: state.worldDay, title: '结成金丹', sceneText: route === 'evil' ? '你以妖丹与精血凝煞，最终结成金丹。' : '你完成长久收束与稳固，最终结成金丹。', narrative: route === 'evil' ? '你以妖丹与精血凝煞，最终结成金丹。' : '你完成长久收束与稳固，最终结成金丹。', changes: [{ label: '境界', value: '筑基圆满 → 金丹', tone: 'positive' }], importance: 'major', sourceType: 'activity', sourceId: 'golden-core-breakthrough', locationId: state.world.currentLocationId ?? undefined }] }
}

export function resolveGoldenCoreBreakthrough(state: GameState, options: GoldenCoreBreakthroughOptions): GoldenCoreBreakthroughResult {
  const baseReason = validateBase(state, options); if (baseReason) return rejected(state, baseReason)
  const resourceReason = validateResources(state, options); if (resourceReason) return rejected(state, resourceReason)
  const preview = calculateGoldenCoreBreakthroughPreview(state, options); if (!preview) return rejected(state, 'GOLDEN_CORE_PREVIEW_UNAVAILABLE')
  const consumed = consumeResources(state, options); if (!consumed) return rejected(state, 'GOLDEN_CORE_RESOURCE_CONSUME_FAILED')
  const advanced = advanceWorldTime(consumed, GOLDEN_CORE_DURATION_DAYS).state; if (advanced.status !== 'playing') return { state: advanced, applied: true, completed: false, preview }
  const successRoll = nextRandom(advanced.rngState); let withRng: GameState = { ...advanced, rngState: successRoll.nextState }
  if (successRoll.value * 100 < preview.successPercent) {
    const beforeSuccess = withRng
    let successState: GameState = { ...withRng, cultivation: { ...withRng.cultivation, realm: 'golden_core', stage: 0 }, resources: { ...withRng.resources, cultivation: 0 } }
    if (options.route === 'evil') successState = applyPermanentLifespanPenalty(successState, EVIL_SUCCESS_PENALTY)
    successState = appendGoldenCoreChronicle(successState, options.route)
    return { state: successState, applied: true, completed: true, success: true, preview, outcome: successOutcome(beforeSuccess, successState, preview) }
  }
  const severityRoll = pickSeverity(withRng.rngState, preview.successPercent, options.route === 'evil'); withRng = { ...withRng, rngState: severityRoll.nextState }; const ginseng = options.useCenturySpiritGinsengForRecovery
  if (severityRoll.severity === 'extreme') { const deathRoll = nextRandom(withRng.rngState); withRng = { ...withRng, rngState: deathRoll.nextState }; if (deathRoll.value < 0.6) return { state: { ...withRng, status: 'dead', endReason: '结丹反噬，丹田崩裂' }, applied: true, completed: true, success: false, severity: 'extreme', preview } }
  const targetStage = severityRoll.severity === 'light' ? 3 : severityRoll.severity === 'severe' ? 2 : 1; const targetCultivation = severityRoll.severity === 'light' ? 800 : severityRoll.severity === 'severe' ? 500 : 300; const baseRecovery = severityRoll.severity === 'light' ? 90 : severityRoll.severity === 'severe' ? 270 : 540
  const entries = severityRoll.severity === 'light' ? [{ kind: 'light' as const, recoveryDays: recoveryDays(baseRecovery, ginseng) }] : [{ kind: 'severe' as const, recoveryDays: recoveryDays(baseRecovery, ginseng) }, { kind: 'meridian' as const, recoveryDays: recoveryDays(baseRecovery, ginseng) }]
  let failed: GameState = { ...withRng, cultivation: { ...withRng.cultivation, stage: targetStage }, resources: { ...withRng.resources, cultivation: targetCultivation } }; failed = addInjuries(failed, `golden-core-${severityRoll.severity}`, entries)
  return { state: failed, applied: true, completed: true, success: false, severity: severityRoll.severity, preview, outcome: failureOutcome(preview, severityRoll.severity, ginseng) }
}
