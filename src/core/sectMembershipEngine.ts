import type { GameState } from '../types/game'
import type { QingyunJoinPath, SectAccess, SectRank } from '../types/sect'

const QINGYUAN_YINQI = 'qingyuan_yinqi'

const RANK_LABELS: Readonly<Record<SectRank, string>> = {
  service: '杂役',
  outer: '外门',
  inner: '内门',
  true: '真传',
}

const JOIN_PATH_LABELS: Readonly<Record<QingyunJoinPath, string>> = {
  'regular-recruitment': '公开招录',
  'clan-recommendation': '家族引荐',
  'steward-family': '执事家属正规流程',
  'mortal-service': '宗门外围凡俗差事',
}

export interface QingyunJoinOffer {
  available: boolean
  targetRank?: SectRank
  joinPath?: QingyunJoinPath
  routeLabel: string
  conditions: string[]
  missing: string[]
  reason?: string
}

export interface SectMutationResult {
  state: GameState
  applied: boolean
  reason?: string
}

function hasRoot(state: GameState): boolean {
  return state.identity.spiritRootId !== 'none' && state.identity.spiritRootId.trim().length > 0
}

function hasTag(state: GameState, tag: string): boolean {
  return state.tags.includes(tag)
}

function isQingyunMember(state: GameState): boolean {
  return state.sectMembership?.sectId === 'qingyun'
}

export function formatSectRank(rank: SectRank): string {
  return RANK_LABELS[rank]
}

export function formatQingyunJoinPath(path: QingyunJoinPath): string {
  return JOIN_PATH_LABELS[path]
}

export function getSectAccess(state: GameState): SectAccess {
  const rank = state.sectMembership?.sectId === 'qingyun' ? state.sectMembership.rank : null
  if (!rank) {
    return {
      publicArea: true,
      outerRegistry: false,
      serviceArea: false,
      basicInternalResources: false,
      basicTeaching: false,
      discipleCultivationArea: false,
      affairsHallEntry: false,
      innerResources: false,
      trueInheritance: false,
    }
  }

  if (rank === 'service') {
    return {
      publicArea: true,
      outerRegistry: true,
      serviceArea: true,
      basicInternalResources: true,
      basicTeaching: false,
      discipleCultivationArea: false,
      affairsHallEntry: false,
      innerResources: false,
      trueInheritance: false,
    }
  }

  if (rank === 'outer') {
    return {
      publicArea: true,
      outerRegistry: true,
      serviceArea: true,
      basicInternalResources: true,
      basicTeaching: true,
      discipleCultivationArea: true,
      affairsHallEntry: true,
      innerResources: false,
      trueInheritance: false,
    }
  }

  if (rank === 'inner') {
    return {
      publicArea: true,
      outerRegistry: true,
      serviceArea: true,
      basicInternalResources: true,
      basicTeaching: true,
      discipleCultivationArea: true,
      affairsHallEntry: true,
      innerResources: true,
      trueInheritance: false,
    }
  }

  return {
    publicArea: true,
    outerRegistry: true,
    serviceArea: true,
    basicInternalResources: true,
    basicTeaching: true,
    discipleCultivationArea: true,
    affairsHallEntry: true,
    innerResources: true,
    trueInheritance: true,
  }
}

function rootJoinPath(state: GameState): QingyunJoinPath {
  if (hasTag(state, 'adult_access:qingyun_family_recommendation') || hasTag(state, 'adult_access:qingyun_clan_recruitment')) {
    return 'clan-recommendation'
  }
  if (state.identity.backgroundId === 'qingyun_steward_family') return 'steward-family'
  return 'regular-recruitment'
}

export function getQingyunJoinOffer(state: GameState): QingyunJoinOffer {
  if (isQingyunMember(state)) {
    return { available: false, routeLabel: '已登记', conditions: [], missing: [], reason: 'ALREADY_QINGYUN_MEMBER' }
  }
  if (state.lifeStage !== 'adult') {
    return { available: false, routeLabel: '尚未成年', conditions: ['成年后才能登记宗门身份'], missing: ['尚未成年'], reason: 'SECT_REQUIRES_ADULT' }
  }

  const currentLocationId = state.world.currentLocationId
  const root = hasRoot(state)
  const qingyunFamilyService = state.identity.backgroundId === 'qingyun_steward_family' && hasTag(state, 'adult_path:qingyun_mortal_service')

  if (!root) {
    const atFamilyQuarters = currentLocationId === 'qingyun_family_quarters'
    const available = qingyunFamilyService && atFamilyQuarters
    return {
      available,
      ...(available ? { targetRank: 'service' as const, joinPath: 'mortal-service' as const } : {}),
      routeLabel: qingyunFamilyService ? '外围凡俗差事登记' : '无常规弟子招录资格',
      conditions: ['无灵根不能参加正式修士弟子招录', '只有已有宗门外围差事渠道时可登记为杂役'],
      missing: available ? [] : [qingyunFamilyService ? '需回到青云宗外围家属区办理登记' : '当前没有可用的宗门外围差事渠道'],
      ...(!available ? { reason: 'NO_QINGYUN_JOIN_ROUTE' } : {}),
    }
  }

  if (currentLocationId === 'qingyun_family_quarters' && state.identity.backgroundId === 'qingyun_steward_family') {
    const hasFamilyRoute = hasTag(state, 'adult_access:qingyun_regular_recruitment') || hasTag(state, 'adult_path:qingyun_recruitment')
    return {
      available: hasFamilyRoute,
      ...(hasFamilyRoute ? { targetRank: 'outer' as const, joinPath: 'steward-family' as const } : {}),
      routeLabel: '执事家属正规流程',
      conditions: ['具备灵根', '通过家属区已有的正规招录渠道登记'],
      missing: hasFamilyRoute ? [] : ['尚未取得家属区的正式招录登记渠道；也可以直接前往青云宗参加公开招录'],
      ...(!hasFamilyRoute ? { reason: 'QINGYUN_FAMILY_ROUTE_NOT_OPEN' } : {}),
    }
  }

  if (currentLocationId !== 'qingyun_sect') {
    return {
      available: false,
      routeLabel: '青云宗公开招录',
      conditions: ['具备灵根', '本人前往青云宗完成正式登记'],
      missing: ['需前往青云宗'],
      reason: 'QINGYUN_RECRUITMENT_REQUIRES_SECT_LOCATION',
    }
  }

  const joinPath = rootJoinPath(state)
  return {
    available: true,
    targetRank: 'outer',
    joinPath,
    routeLabel: JOIN_PATH_LABELS[joinPath],
    conditions: joinPath === 'clan-recommendation'
      ? ['具备灵根', '已有家族引荐记录', '本人到宗门完成正式登记']
      : joinPath === 'steward-family'
        ? ['具备灵根', '执事家属仍需走正式弟子登记']
        : ['具备灵根', '本人参加青云宗公开招录'],
    missing: [],
  }
}

export function resolveJoinQingyunSect(state: GameState): SectMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.sectMembership) return { state, applied: false, reason: 'SECT_MEMBERSHIP_ALREADY_EXISTS' }
  if (state.identity.faction === 'qingyun') return { state, applied: false, reason: 'LEGACY_QINGYUN_FACTION_WITHOUT_MEMBERSHIP' }

  const offer = getQingyunJoinOffer(state)
  if (!offer.available || !offer.targetRank || !offer.joinPath) return { state, applied: false, reason: offer.reason ?? 'QINGYUN_JOIN_UNAVAILABLE' }

  const membership = {
    sectId: 'qingyun' as const,
    rank: offer.targetRank,
    joinedDay: state.worldDay,
    joinPath: offer.joinPath,
  }
  const rankLabel = RANK_LABELS[offer.targetRank]
  const pathLabel = JOIN_PATH_LABELS[offer.joinPath]
  const narrative = offer.targetRank === 'service'
    ? '你在外院登记了杂役名籍。从今天起，你正式属于青云宗体系，但并不因此获得修士弟子的传承与修炼权限。'
    : `你完成了青云宗的正式登记，成为外门弟子。${pathLabel}给你的是入门渠道，不是更高一层的身份。`

  return {
    state: {
      ...state,
      sectMembership: membership,
      identity: { ...state.identity, faction: 'qingyun' },
      chronicle: [...state.chronicle, {
        id: `${state.runId}:sect:qingyun:join:${state.worldDay}`,
        startDay: state.worldDay,
        endDay: state.worldDay,
        title: offer.targetRank === 'service' ? '登记青云杂役' : '拜入青云宗',
        sceneText: '你把自己的姓名、来历与资质正式登记进青云宗名册。',
        narrative,
        choiceText: `加入青云宗 · ${rankLabel}`,
        changes: [
          { label: '宗门', value: '青云宗', tone: 'positive' },
          { label: '身份', value: rankLabel, tone: 'positive' },
          { label: '入门路径', value: pathLabel, tone: 'neutral' },
        ],
        importance: 'major',
        sourceType: 'activity',
        sourceId: `sect:qingyun:join:${offer.joinPath}`,
        locationId: state.world.currentLocationId ?? undefined,
      }],
    },
    applied: true,
  }
}

export function resolveReceiveQingyunBasicTeaching(state: GameState): SectMutationResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.world.currentLocationId !== 'qingyun_sect') return { state, applied: false, reason: 'QINGYUN_TEACHING_REQUIRES_SECT_LOCATION' }
  if (!getSectAccess(state).basicTeaching) return { state, applied: false, reason: 'QINGYUN_BASIC_TEACHING_NOT_ALLOWED' }
  if (!hasRoot(state)) return { state, applied: false, reason: 'NO_SPIRIT_ROOT' }
  if (!state.cultivation.practiceInitialized) return { state, applied: false, reason: 'CULTIVATION_NOT_INITIALIZED' }
  if ((state.cultivation.knownTechniqueIds ?? []).includes(QINGYUAN_YINQI)) return { state, applied: false, reason: 'QINGYUN_BASIC_TEACHING_ALREADY_KNOWN' }

  const knownTechniqueIds = [...(state.cultivation.knownTechniqueIds ?? []), QINGYUAN_YINQI]
  const techniquePractice = state.cultivation.techniqueSystemInitialized
    ? { ...(state.cultivation.techniquePractice ?? {}), [QINGYUAN_YINQI]: { proficiencyPoints: 0 } }
    : state.cultivation.techniquePractice

  return {
    state: {
      ...state,
      cultivation: {
        ...state.cultivation,
        knownTechniqueIds,
        ...(techniquePractice ? { techniquePractice } : {}),
      },
    },
    applied: true,
  }
}