import type { WorldLocationDefinition } from '../types/world'

export const WORLD_LOCATIONS = [
  {
    id: 'baishi_village',
    name: '白石村',
    type: 'mortal-settlement',
    description: '黑风山南麓的百余户山村，以耕作、狩猎、采药和季节性矿工为生。',
    danger: 'safe',
    qiDensity: 'none',
    adjacentLocationIds: ['qingstone_town', 'blackwind_foothill'],
    activityTags: ['family-life', 'mortal-work', 'local-rumors'],
    mapPosition: { x: 20, y: 70 },
  },
  {
    id: 'qingstone_town',
    name: '青石镇',
    type: 'mortal-settlement',
    description: '凡俗社会与低阶修仙社会交界的镇子，药铺、铁铺、镖局和山货商都在这里汇集。',
    danger: 'safe',
    qiDensity: 'thin',
    adjacentLocationIds: ['baishi_village', 'qingxia_market', 'linhe_county'],
    activityTags: ['mortal-trade', 'medicine', 'escort', 'cultivator-contact'],
    mapPosition: { x: 50, y: 70 },
  },
  {
    id: 'linhe_county',
    name: '临河县',
    type: 'mortal-settlement',
    description: '青霞地界最大的凡俗中心，粮布、木材、药材、铁器与河运在此集散。',
    danger: 'safe',
    qiDensity: 'none',
    adjacentLocationIds: ['qingstone_town'],
    activityTags: ['mortal-trade', 'martial-school', 'river-commerce'],
    mapPosition: { x: 50, y: 91 },
  },
  {
    id: 'qingxia_market',
    name: '青霞坊市',
    type: 'cultivation-market',
    description: '本地低阶修士最重要的交易聚点，由青云宗维持基本秩序，散修、商铺与家族势力长期往来。',
    danger: 'safe',
    qiDensity: 'medium',
    adjacentLocationIds: ['qingstone_town', 'qingyun_sect'],
    activityTags: ['cultivation-trade', 'market', 'cultivation-room', 'rumors'],
    mapPosition: { x: 50, y: 49 },
  },
  {
    id: 'qingyun_sect',
    name: '青云宗',
    type: 'sect',
    description: '青霞地界的本地修仙宗门，掌握核心灵脉、部分矿权、坊市秩序与稳定的低阶传承。',
    danger: 'safe',
    qiDensity: 'high',
    adjacentLocationIds: ['qingxia_market', 'blackwind_mountain', 'lingxi_valley', 'beast_ridge', 'qingyun_family_quarters'],
    activityTags: ['sect-life', 'technique-access', 'alchemy', 'crafting', 'sect-affairs'],
    mapPosition: { x: 50, y: 28 },
  },
  {
    id: 'blackwind_mountain',
    name: '黑风山',
    type: 'wilderness',
    description: '矿脉、妖兽、旧矿道与黑风矿变遗痕交错的山地，是青霞地界最重要也最复杂的野外区域。',
    danger: 'high',
    qiDensity: 'medium',
    adjacentLocationIds: ['qingyun_sect', 'blackwind_foothill'],
    activityTags: ['wilderness', 'ore', 'beasts', 'ruins'],
    mapPosition: { x: 22, y: 28 },
  },
  {
    id: 'blackwind_foothill',
    name: '黑风山山脚',
    type: 'fixed-entry',
    description: '白石村通往黑风山的外围入口，猎路、采药路和短工矿路从这里分开。',
    danger: 'low',
    qiDensity: 'low',
    adjacentLocationIds: ['blackwind_mountain', 'baishi_village'],
    activityTags: ['hunting-route', 'gathering-route', 'mountain-entry'],
    parentLocationId: 'blackwind_mountain',
    mapPosition: { x: 18, y: 49 },
  },
  {
    id: 'lingxi_valley',
    name: '灵溪谷',
    type: 'wilderness',
    description: '溪流、灵田与野生灵植并存的谷地，青云宗和陆家在此经营资源，也保留不少野生区域。',
    danger: 'moderate',
    qiDensity: 'medium',
    adjacentLocationIds: ['qingyun_sect', 'lu_estate'],
    activityTags: ['spirit-herbs', 'water-materials', 'family-fields', 'wilderness'],
    mapPosition: { x: 78, y: 28 },
  },
  {
    id: 'lu_estate',
    name: '陆家庄',
    type: 'clan-estate',
    description: '陆家在灵溪谷经营灵田与药材的主要据点，家族资源与使用权限都有明确规矩。',
    danger: 'safe',
    qiDensity: 'medium',
    adjacentLocationIds: ['lingxi_valley'],
    activityTags: ['clan-life', 'spirit-fields', 'herbs', 'family-training'],
    parentLocationId: 'lingxi_valley',
    mapPosition: { x: 84, y: 48 },
  },
  {
    id: 'beast_ridge',
    name: '万兽岭',
    type: 'wilderness',
    description: '妖兽活动占主导的山岭，越往深处越少有人类长期驻留，也是兽材和御兽机会的主要来源。',
    danger: 'extreme',
    qiDensity: 'medium',
    adjacentLocationIds: ['qingyun_sect'],
    activityTags: ['wilderness', 'beasts', 'hunting', 'taming'],
    mapPosition: { x: 50, y: 7 },
  },
  {
    id: 'qingyun_family_quarters',
    name: '青云宗家属区',
    type: 'fixed-entry',
    description: '位于宗门外围的执事家属与凡俗协作人员生活区域，与正式弟子活动区分开。',
    danger: 'safe',
    qiDensity: 'medium',
    adjacentLocationIds: ['qingyun_sect'],
    activityTags: ['sect-family-life', 'mortal-service', 'sect-contact'],
    parentLocationId: 'qingyun_sect',
    mapPosition: { x: 61, y: 38 },
  },
] as const satisfies readonly WorldLocationDefinition[]

const WORLD_LOCATION_MAP = new Map<string, WorldLocationDefinition>(
  WORLD_LOCATIONS.map((location) => [location.id, location] as [string, WorldLocationDefinition]),
)

export const WORLD_LOCATION_IDS = WORLD_LOCATIONS.map((location) => location.id)

export function getWorldLocationById(id: string): WorldLocationDefinition | undefined {
  return WORLD_LOCATION_MAP.get(id)
}

export function getWorldLocationParent(location: WorldLocationDefinition): WorldLocationDefinition | undefined {
  return location.parentLocationId ? WORLD_LOCATION_MAP.get(location.parentLocationId) : undefined
}
