import type { WorldRouteDefinition } from '../types/world'

export const WORLD_ROUTES: readonly WorldRouteDefinition[] = [
  { id: 'baishi-qingstone', from: 'baishi_village', to: 'qingstone_town', travelDays: 2, stableFastTravel: true, description: '村镇之间常年有人往来，路况相对稳定。' },
  { id: 'baishi-blackwind-foothill', from: 'baishi_village', to: 'blackwind_foothill', travelDays: 1, stableFastTravel: true, description: '村民、猎人和采药人常走的山脚路。' },
  { id: 'qingstone-qingxia', from: 'qingstone_town', to: 'qingxia_market', travelDays: 2, stableFastTravel: true, description: '通往青霞坊市的常用商路。' },
  { id: 'qingstone-linhe', from: 'qingstone_town', to: 'linhe_county', travelDays: 3, stableFastTravel: true, description: '凡俗商旅长期使用的县镇道路。' },
  { id: 'qingxia-qingyun', from: 'qingxia_market', to: 'qingyun_sect', travelDays: 1, stableFastTravel: true, description: '青云宗与坊市之间维护较好的固定通路。' },
  { id: 'qingyun-blackwind', from: 'qingyun_sect', to: 'blackwind_mountain', travelDays: 3, stableFastTravel: false, description: '进入黑风山后路况复杂，不能视为稳定快速通路。' },
  { id: 'qingyun-lingxi', from: 'qingyun_sect', to: 'lingxi_valley', travelDays: 2, stableFastTravel: true, description: '宗门与灵溪谷资源区之间有长期维护的通路。' },
  { id: 'qingyun-beast-ridge', from: 'qingyun_sect', to: 'beast_ridge', travelDays: 4, stableFastTravel: false, description: '越靠近万兽岭越缺少稳定道路，不适合快速通行。' },
  { id: 'qingyun-family-quarters', from: 'qingyun_sect', to: 'qingyun_family_quarters', travelDays: 1, stableFastTravel: true, description: '宗门外围家属区域与宗门之间的日常通路。' },
  { id: 'blackwind-foothill-mountain', from: 'blackwind_foothill', to: 'blackwind_mountain', travelDays: 2, stableFastTravel: false, description: '从山脚真正进入黑风山的猎路与矿路，风险和路况都不稳定。' },
  { id: 'lingxi-lu-estate', from: 'lingxi_valley', to: 'lu_estate', travelDays: 1, stableFastTravel: true, description: '陆家长期使用和维护的谷内道路。' },
]

const ROUTE_MAP = new Map<string, WorldRouteDefinition>(WORLD_ROUTES.map((route) => [route.id, route]))

function edgeKey(a: string, b: string): string {
  return [a, b].sort().join('::')
}

const EDGE_ROUTE_MAP = new Map<string, WorldRouteDefinition>(
  WORLD_ROUTES.map((route) => [edgeKey(route.from, route.to), route]),
)

export function getWorldRouteById(id: string): WorldRouteDefinition | undefined {
  return ROUTE_MAP.get(id)
}

export function getWorldRouteBetween(a: string, b: string): WorldRouteDefinition | undefined {
  return EDGE_ROUTE_MAP.get(edgeKey(a, b))
}
