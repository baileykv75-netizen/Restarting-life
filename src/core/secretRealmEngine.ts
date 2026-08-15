import type { ChronicleEntry, StateChange } from '../types/chronicle'
import type { GameState } from '../types/game'
import type { ResolvedOutcome } from '../types/persistence'
import type {
  SecretRealmAction,
  SecretRealmMaterialCounts,
  SecretRealmMaterialId,
  SecretRealmNodeId,
  SecretRealmState,
  SunkenVeinChamberRuntime,
  SunkenVeinRewards,
} from '../types/secretRealm'
import { applyGameAction } from './gameActionReducer'
import { getRegionExploredDays } from './regionExplorationEngine'
import { nextRandom, randomInt, seedToState } from './rng'

const BLACKWIND_ID = 'blackwind_mountain'
const REALM_SOURCE_ID = 'sunken-vein-chamber'

const MATERIAL_LABELS: Record<SecretRealmMaterialId, string> = {
  green_dew_grass: '青露草',
  water_spirit_moss: '水灵苔',
  jade_marrow_fungus: '玉髓芝',
  black_iron: '黑铁',
  red_pattern_iron: '赤纹铁',
  shattered_spirit_crystal: '碎灵晶',
  rock_lizard_carapace: '岩甲蜥背甲',
  rock_lizard_mineral_crystal: '岩甲蜥矿性结晶',
}

const NODE_LABELS: Record<SecretRealmNodeId, string> = {
  'fissure-corridor': '裂隙矿廊',
  'seepage-herb-bed': '渗水药圃',
  'vein-guide-side-room': '引脉侧室',
  'vein-lock-gate': '锁脉石门',
  'vein-heart-chamber': '脉心室',
}

export interface SecretRealmCommandResult {
  state: GameState
  applied: boolean
  reason?: string
  outcome?: ResolvedOutcome
}

function rejected(state: GameState, reason: string): SecretRealmCommandResult {
  return { state, applied: false, reason }
}

function makeOutcome(title: string, narrative: string, changes: StateChange[] = [], consequence: string | null = null): ResolvedOutcome {
  return { title, narrative, changes, consequence }
}

function appendMajorChronicle(
  state: GameState,
  sourceId: string,
  title: string,
  narrative: string,
): GameState {
  const sequence = state.chronicle.length + 1
  const canonicalSourceId = `${REALM_SOURCE_ID}:${sourceId}`
  const entry: ChronicleEntry = {
    id: `chronicle:world:${canonicalSourceId}:${sequence}`,
    startDay: state.worldDay,
    endDay: state.worldDay,
    title,
    sceneText: narrative,
    narrative,
    changes: [],
    importance: 'major',
    sourceType: 'world',
    sourceId: canonicalSourceId,
    locationId: BLACKWIND_ID,
  }
  return { ...state, chronicle: [...state.chronicle, entry] }
}

function addMaterialCounts(
  current: SecretRealmMaterialCounts,
  added: SecretRealmMaterialCounts,
): SecretRealmMaterialCounts {
  const next: SecretRealmMaterialCounts = { ...current }
  for (const [id, count] of Object.entries(added) as Array<[SecretRealmMaterialId, number | undefined]>) {
    if (!count) continue
    next[id] = (next[id] ?? 0) + count
  }
  return next
}

function materialChanges(materials: SecretRealmMaterialCounts): StateChange[] {
  return (Object.entries(materials) as Array<[SecretRealmMaterialId, number | undefined]>)
    .filter(([, count]) => Boolean(count))
    .map(([id, count]) => ({ label: MATERIAL_LABELS[id], value: `+${count}份`, tone: 'positive' as const }))
}

function rewardInt(state: number, min: number, max: number): { value: number; state: number } {
  const step = randomInt(state, min, max)
  return { value: step.value, state: step.nextState }
}

export function generateSunkenVeinRewards(runSeed: string): SunkenVeinRewards {
  let state = seedToState(`${runSeed}:r13-sunken-vein-rewards`)
  const green = rewardInt(state, 2, 4); state = green.state
  const moss = rewardInt(state, 1, 3); state = moss.state
  const fungus = rewardInt(state, 0, 1); state = fungus.state
  const blackIron = rewardInt(state, 1, 3); state = blackIron.state
  const sideRedIron = rewardInt(state, 0, 1); state = sideRedIron.state
  const sideCrystal = rewardInt(state, 1, 2); state = sideCrystal.state
  const coreCrystal = rewardInt(state, 2, 4); state = coreCrystal.state
  const coreRedIron = rewardInt(state, 1, 2); state = coreRedIron.state
  const stones = rewardInt(state, 8, 15)

  return {
    herbBed: {
      green_dew_grass: green.value,
      water_spirit_moss: moss.value,
      ...(fungus.value > 0 ? { jade_marrow_fungus: fungus.value } : {}),
    },
    sideRoom: {
      black_iron: blackIron.value,
      ...(sideRedIron.value > 0 ? { red_pattern_iron: sideRedIron.value } : {}),
      shattered_spirit_crystal: sideCrystal.value,
    },
    core: {
      shattered_spirit_crystal: coreCrystal.value,
      red_pattern_iron: coreRedIron.value,
      rock_lizard_carapace: 1,
      rock_lizard_mineral_crystal: 1,
    },
    coreSpiritStones: stones.value,
  }
}

function getAnchorCandidates(state: GameState) {
  if (!state.sublocations) return []
  return Object.values(state.sublocations.generated)
    .filter((runtime) => runtime.parentLocationId === BLACKWIND_ID && (runtime.archetype === 'cave' || runtime.archetype === 'ruin'))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function selectSunkenVeinAnchor(state: GameState): string | null {
  const candidates = getAnchorCandidates(state)
  if (candidates.length === 0) return null
  const rng = randomInt(seedToState(`${state.runSeed}:r13-sunken-vein-anchor`), 0, candidates.length - 1)
  return candidates[rng.value]?.id ?? null
}

function hasEarlyRecognitionCondition(state: GameState): boolean {
  return state.identity.talentIds.includes('observant') || state.identity.physiqueIds.includes('empty_mind_platform')
}

function shouldDiscover(state: GameState, runtime: SunkenVeinChamberRuntime): boolean {
  if (state.knowledge.locations[BLACKWIND_ID] !== 'discovered') return false
  const anchor = state.sublocations?.generated[runtime.anchorSublocationId]
  if (!anchor?.discovered) return false
  const exploredDays = getRegionExploredDays(state, BLACKWIND_ID)
  if (exploredDays < 15) return false
  if (exploredDays >= 30) return true
  return hasEarlyRecognitionCondition(state)
}

function withRuntime(state: GameState, runtime: SunkenVeinChamberRuntime): GameState {
  const secretRealm: SecretRealmState = { sunkenVeinChamber: runtime }
  return { ...state, secretRealm }
}

export function resolveSecretRealmInitialization(state: GameState): SecretRealmCommandResult {
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  if (state.lifeStage !== 'adult' || state.flags.location_knowledge_initialized !== true) {
    return rejected(state, 'SECRET_REALM_REQUIRES_ADULT_WORLD')
  }
  if (!state.sublocations) return rejected(state, 'SECRET_REALM_REQUIRES_SUBLOCATIONS')
  if (state.secretRealm) return rejected(state, 'SECRET_REALM_ALREADY_INITIALIZED')

  const anchorSublocationId = selectSunkenVeinAnchor(state)
  if (!anchorSublocationId) return rejected(state, 'SECRET_REALM_ANCHOR_MISSING')

  const baseRuntime: SunkenVeinChamberRuntime = {
    anchorSublocationId,
    discovered: false,
    active: false,
    currentNodeId: null,
    gateOpened: false,
    gateMethod: null,
    coreLockedBehindPlayer: false,
    cleared: false,
    nodeClaims: { herbBed: false, sideRoom: false, core: false },
    knowledge: { ventSequence: false, mineIncidentEvidence: false },
    pendingMaterials: {},
    rewards: generateSunkenVeinRewards(state.runSeed),
    encounter: 'unresolved',
  }
  const discovered = shouldDiscover(state, baseRuntime)
  let nextState = withRuntime(state, { ...baseRuntime, discovered })
  if (discovered) {
    nextState = appendMajorChronicle(
      nextState,
      'discovery',
      '发现沉脉石室',
      '你在黑风山旧矿深处确认了一处被断层和坍塌重新封住的古修石室。现存结构与矿工支护完全不同。',
    )
  }
  return { state: nextState, applied: true }
}

export function refreshSunkenVeinDiscovery(state: GameState): GameState {
  const runtime = state.secretRealm?.sunkenVeinChamber
  if (!runtime || runtime.discovered || state.status !== 'playing') return state
  if (!shouldDiscover(state, runtime)) return state
  return appendMajorChronicle(
    withRuntime(state, { ...runtime, discovered: true }),
    'discovery',
    '发现沉脉石室',
    '你在黑风山旧矿深处确认了一处被断层和坍塌重新封住的古修石室。现存结构与矿工支护完全不同。',
  )
}

export function isSunkenVeinVisible(state: GameState): boolean {
  return state.secretRealm?.sunkenVeinChamber.discovered === true
}

export function getSunkenVeinNodeLabel(nodeId: SecretRealmNodeId | null): string {
  return nodeId ? NODE_LABELS[nodeId] : '沉脉石室'
}

function requireRuntime(state: GameState): SunkenVeinChamberRuntime | null {
  return state.secretRealm?.sunkenVeinChamber ?? null
}

function updateRuntime(state: GameState, runtime: SunkenVeinChamberRuntime): GameState {
  return { ...state, secretRealm: { sunkenVeinChamber: runtime } }
}

function advanceOneDay(state: GameState): GameState {
  const result = applyGameAction(state, { type: 'ADVANCE_TIME', days: 1 })
  return result.applied ? result.state : state
}

function ensureOuterActive(state: GameState, runtime: SunkenVeinChamberRuntime): string | null {
  if (state.status !== 'playing') return 'GAME_ENDED'
  if (!runtime.active) return 'SECRET_REALM_NOT_ACTIVE'
  if (runtime.coreLockedBehindPlayer) return 'SECRET_REALM_CORE_LOCKED'
  if (runtime.cleared) return 'SECRET_REALM_ALREADY_CLEARED'
  return null
}

function inspectHerbBed(state: GameState, runtime: SunkenVeinChamberRuntime): SecretRealmCommandResult {
  if (runtime.currentNodeId !== 'seepage-herb-bed') return rejected(state, 'SECRET_REALM_WRONG_NODE')
  if (runtime.nodeClaims.herbBed) return rejected(state, 'SECRET_REALM_NODE_ALREADY_CLAIMED')
  const advanced = advanceOneDay(state)
  if (advanced.status !== 'playing') return { state: advanced, applied: true }
  const current = requireRuntime(advanced) ?? runtime
  const nextRuntime: SunkenVeinChamberRuntime = {
    ...current,
    nodeClaims: { ...current.nodeClaims, herbBed: true },
    pendingMaterials: addMaterialCounts(current.pendingMaterials, current.rewards.herbBed),
  }
  return {
    state: updateRuntime(advanced, nextRuntime),
    applied: true,
    outcome: makeOutcome(
      '药圃检查完毕',
      '你花了一天清理浅槽里的腐叶和矿尘，只取走还能辨认、保存完整的灵植。这里不会在本世短期重新长出一批资源。',
      [{ label: '时间', value: '+1天', tone: 'neutral' }, ...materialChanges(current.rewards.herbBed)],
      '这些材料已作为待接管物资记录；正式背包会在 R14 接入。',
    ),
  }
}

function inspectSideRoom(state: GameState, runtime: SunkenVeinChamberRuntime): SecretRealmCommandResult {
  if (runtime.currentNodeId !== 'vein-guide-side-room') return rejected(state, 'SECRET_REALM_WRONG_NODE')
  if (runtime.nodeClaims.sideRoom) return rejected(state, 'SECRET_REALM_NODE_ALREADY_CLAIMED')
  const advanced = advanceOneDay(state)
  if (advanced.status !== 'playing') return { state: advanced, applied: true }
  const current = requireRuntime(advanced) ?? runtime
  const nextRuntime: SunkenVeinChamberRuntime = {
    ...current,
    nodeClaims: { ...current.nodeClaims, sideRoom: true },
    knowledge: { ...current.knowledge, ventSequence: true },
    pendingMaterials: addMaterialCounts(current.pendingMaterials, current.rewards.sideRoom),
  }
  return {
    state: updateRuntime(advanced, nextRuntime),
    applied: true,
    outcome: makeOutcome(
      '引脉侧室检查完毕',
      '你沿着残存沟槽把旧阵的灵气走向重新理了一遍，确认了锁脉石门仍可使用的泄压顺序，也取走了已经松脱的矿材。',
      [
        { label: '时间', value: '+1天', tone: 'neutral' },
        { label: '地点知识', value: '掌握旧阵泄压顺序', tone: 'positive' },
        ...materialChanges(current.rewards.sideRoom),
      ],
    ),
  }
}

function operateGate(
  state: GameState,
  runtime: SunkenVeinChamberRuntime,
  method: 'safe' | 'force',
): SecretRealmCommandResult {
  if (runtime.currentNodeId !== 'vein-lock-gate') return rejected(state, 'SECRET_REALM_WRONG_NODE')
  if (runtime.gateOpened) return rejected(state, 'SECRET_REALM_GATE_ALREADY_OPEN')
  if (method === 'safe' && !runtime.knowledge.ventSequence) return rejected(state, 'SECRET_REALM_VENT_SEQUENCE_UNKNOWN')
  const advanced = advanceOneDay(state)
  if (advanced.status !== 'playing') return { state: advanced, applied: true }
  const current = requireRuntime(advanced) ?? runtime
  const nextRuntime = { ...current, gateOpened: true, gateMethod: method } satisfies SunkenVeinChamberRuntime
  return {
    state: updateRuntime(advanced, nextRuntime),
    applied: true,
    outcome: makeOutcome(
      method === 'safe' ? '石门缓缓开启' : '石门被强行开启',
      method === 'safe'
        ? '你按侧室留下的泄压顺序逐段松开旧阵。石门后的灵压仍然紊乱，但没有在开启时继续抬高。'
        : '你绕过已经看不懂的旧阵，直接推动残存禁制。石门最终打开，门内灵压明显比外围更乱。',
      [{ label: '时间', value: '+1天', tone: 'neutral' }],
      '进入门后旧阵可能重新闭锁；里面还有大型爬行妖兽活动痕迹。',
    ),
  }
}

function encounterChance(state: GameState, runtime: SunkenVeinChamberRuntime): number {
  const { realm, stage } = state.cultivation
  if (realm === 'mortal') return 0
  if (realm === 'foundation' || realm === 'golden_core') return 1
  let chance = stage <= 2 ? 0.2 : stage <= 5 ? 0.6 : 0.9
  if (runtime.gateMethod === 'safe') chance += 0.1
  return Math.min(1, chance)
}

function resolveCoreEncounter(state: GameState, runtime: SunkenVeinChamberRuntime): SecretRealmCommandResult {
  if (runtime.currentNodeId !== 'vein-heart-chamber' || !runtime.coreLockedBehindPlayer) {
    return rejected(state, 'SECRET_REALM_CORE_NOT_ENTERED')
  }
  if (runtime.encounter !== 'unresolved') return rejected(state, 'SECRET_REALM_ENCOUNTER_ALREADY_RESOLVED')

  const step = nextRandom(state.rngState)
  const victory = step.value < encounterChance(state, runtime)
  const nextRuntime: SunkenVeinChamberRuntime = { ...runtime, encounter: victory ? 'victory' : 'death' }
  if (!victory) {
    return {
      state: {
        ...updateRuntime(state, nextRuntime),
        rngState: step.nextState,
        status: 'dead',
        endReason: '在沉脉石室脉心室遭遇成年岩甲蜥。石门已经闭锁，你未能击退它，最终死在核心区。',
      },
      applied: true,
    }
  }

  return {
    state: { ...updateRuntime(state, nextRuntime), rngState: step.nextState },
    applied: true,
    outcome: makeOutcome(
      '脉心室的危险已经处理',
      '成年岩甲蜥失去继续占据核心区的能力。堵在另一侧的泄压孔现在可以靠近，但旧阵仍需要处理后才能离开。',
      [{ label: '核心危险', value: '已解除', tone: 'positive' }],
    ),
  }
}

function ventAndExit(state: GameState, runtime: SunkenVeinChamberRuntime): SecretRealmCommandResult {
  if (runtime.currentNodeId !== 'vein-heart-chamber' || runtime.encounter !== 'victory') {
    return rejected(state, 'SECRET_REALM_CORE_DANGER_UNRESOLVED')
  }
  if (runtime.nodeClaims.core || runtime.cleared) return rejected(state, 'SECRET_REALM_CORE_ALREADY_CLAIMED')

  const nextMaterials = addMaterialCounts(runtime.pendingMaterials, runtime.rewards.core)
  const nextRuntime: SunkenVeinChamberRuntime = {
    ...runtime,
    active: false,
    currentNodeId: null,
    coreLockedBehindPlayer: false,
    cleared: true,
    nodeClaims: { ...runtime.nodeClaims, core: true },
    knowledge: { ...runtime.knowledge, mineIncidentEvidence: true },
    pendingMaterials: nextMaterials,
  }
  let sublocations = state.sublocations
  if (sublocations?.generated[runtime.anchorSublocationId]) {
    sublocations = {
      generated: {
        ...sublocations.generated,
        [runtime.anchorSublocationId]: {
          ...sublocations.generated[runtime.anchorSublocationId],
          deepConfirmed: true,
        },
      },
    }
  }
  let nextState: GameState = {
    ...state,
    resources: {
      ...state.resources,
      spiritStones: state.resources.spiritStones + runtime.rewards.coreSpiritStones,
    },
    sublocations,
    flags: {
      ...state.flags,
      sunken_vein_mine_incident_evidence: true,
      sunken_vein_cleared: true,
    },
    secretRealm: { sunkenVeinChamber: nextRuntime },
  }
  nextState = appendMajorChronicle(
    nextState,
    'cleared',
    '沉脉石室泄压',
    '你处理了脉心室的危险并打开内侧泄压结构，从断层返回黑风山。石刻证明这里原本是古修长期维护的引脉设施，而不是藏宝洞府。',
  )
  return {
    state: nextState,
    applied: true,
    outcome: makeOutcome(
      '从断层离开沉脉石室',
      '泄压后的灵气冲开了侧面断层。你从旧矿另一侧回到黑风山，沉脉石室的核心已经被取走并永久改变。',
      [
        { label: '下品灵石', value: `+${runtime.rewards.coreSpiritStones}枚`, tone: 'positive' },
        { label: '历史证据', value: '古修引脉设施', tone: 'positive' },
        ...materialChanges(runtime.rewards.core),
      ],
      '核心与外围已经领取的资源本世不会刷新。',
    ),
  }
}

export function resolveSecretRealmAction(state: GameState, action: SecretRealmAction): SecretRealmCommandResult {
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  const runtime = requireRuntime(state)
  if (!runtime) return rejected(state, 'SECRET_REALM_NOT_INITIALIZED')
  if (!runtime.discovered) return rejected(state, 'SECRET_REALM_NOT_DISCOVERED')
  if (state.world.currentLocationId !== BLACKWIND_ID) return rejected(state, 'SECRET_REALM_REQUIRES_BLACKWIND')

  if (action === 'enter') {
    if (runtime.active) return rejected(state, 'SECRET_REALM_ALREADY_ACTIVE')
    return {
      state: updateRuntime(state, { ...runtime, active: true, currentNodeId: 'fissure-corridor' }),
      applied: true,
    }
  }

  if (!runtime.active) return rejected(state, 'SECRET_REALM_NOT_ACTIVE')

  if (runtime.cleared) {
    if (action !== 'exit-outer') return rejected(state, 'SECRET_REALM_ALREADY_CLEARED')
    return {
      state: updateRuntime(state, { ...runtime, active: false, currentNodeId: null }),
      applied: true,
    }
  }

  if (action === 'resolve-core-encounter') return resolveCoreEncounter(state, runtime)
  if (action === 'vent-and-exit') return ventAndExit(state, runtime)

  const outerError = ensureOuterActive(state, runtime)
  if (outerError) return rejected(state, outerError)

  if (action === 'visit-herb-bed') {
    if (runtime.currentNodeId !== 'fissure-corridor') return rejected(state, 'SECRET_REALM_WRONG_NODE')
    return { state: updateRuntime(state, { ...runtime, currentNodeId: 'seepage-herb-bed' }), applied: true }
  }
  if (action === 'inspect-herb-bed') return inspectHerbBed(state, runtime)
  if (action === 'visit-side-room') {
    if (runtime.currentNodeId !== 'fissure-corridor') return rejected(state, 'SECRET_REALM_WRONG_NODE')
    return { state: updateRuntime(state, { ...runtime, currentNodeId: 'vein-guide-side-room' }), applied: true }
  }
  if (action === 'inspect-side-room') return inspectSideRoom(state, runtime)
  if (action === 'visit-gate') {
    if (runtime.currentNodeId !== 'fissure-corridor') return rejected(state, 'SECRET_REALM_WRONG_NODE')
    return { state: updateRuntime(state, { ...runtime, currentNodeId: 'vein-lock-gate' }), applied: true }
  }
  if (action === 'return-corridor') {
    if (runtime.currentNodeId === 'fissure-corridor') return rejected(state, 'SECRET_REALM_ALREADY_AT_CORRIDOR')
    return { state: updateRuntime(state, { ...runtime, currentNodeId: 'fissure-corridor' }), applied: true }
  }
  if (action === 'exit-outer') {
    if (runtime.currentNodeId !== 'fissure-corridor') return rejected(state, 'SECRET_REALM_EXIT_FROM_CORRIDOR_ONLY')
    return { state: updateRuntime(state, { ...runtime, active: false, currentNodeId: null }), applied: true }
  }
  if (action === 'open-gate-safe') return operateGate(state, runtime, 'safe')
  if (action === 'open-gate-force') return operateGate(state, runtime, 'force')
  if (action === 'confirm-core-entry') {
    if (runtime.currentNodeId !== 'vein-lock-gate' || !runtime.gateOpened) return rejected(state, 'SECRET_REALM_GATE_NOT_OPEN')
    return {
      state: updateRuntime(state, {
        ...runtime,
        currentNodeId: 'vein-heart-chamber',
        coreLockedBehindPlayer: true,
      }),
      applied: true,
    }
  }

  return rejected(state, 'SECRET_REALM_ACTION_UNKNOWN')
}
