import type { CombatOpponentId } from '../types/combat'
import type { GameState } from '../types/game'
import type { StrongBeastTerritoryId, StrongBeastTerritoryStatus } from '../types/territory'
import { materializeBeastEcology } from './beastEngine'
import { resolveCombatStart } from './combatEngine'

export interface StrongBeastTerritoryView {
  id: StrongBeastTerritoryId
  locationId: 'lingxi_valley' | 'beast_ridge'
  name: string
  status: StrongBeastTerritoryStatus
  clue: string
  warning: string
  canEnter: boolean
  entryLabel?: string
  opponentId?: CombatOpponentId
  threatKnown: boolean
}

export interface StrongBeastTerritoryEntryResult {
  state: GameState
  applied: boolean
  reason?: string
  enteredEmpty?: boolean
}

const TERRITORY_LOCATION: Readonly<Record<StrongBeastTerritoryId, 'lingxi_valley' | 'beast_ridge'>> = {
  lingxi_cold_pool: 'lingxi_valley',
  azure_wolf_range: 'beast_ridge',
}

function exploredDays(state: GameState, locationId: string): number {
  return state.exploration?.locations[locationId]?.exploredDays ?? 0
}

function hasTalent(state: GameState, talentId: string): boolean {
  return state.identity.talentIds.includes(talentId)
}

export function isStrongBeastTerritoryDiscovered(state: GameState, territoryId: StrongBeastTerritoryId): boolean {
  const locationId = TERRITORY_LOCATION[territoryId]
  if (state.knowledge.locations[locationId] !== 'discovered') return false
  const days = exploredDays(state, locationId)

  if (territoryId === 'lingxi_cold_pool') {
    const traceSensitive = hasTalent(state, 'observant')
    return days >= (traceSensitive ? 5 : 15)
  }

  const beastSensitive = hasTalent(state, 'observant') || hasTalent(state, 'beast_handler')
  return days >= (beastSensitive ? 5 : 15)
}

function coldPoolView(state: GameState): StrongBeastTerritoryView | null {
  if (!isStrongBeastTerritoryDiscovered(state, 'lingxi_cold_pool')) return null
  const ecology = materializeBeastEcology(state).beastEcology!
  const python = ecology.specialIndividuals.coldPoolScalePython
  const checkedEmpty = state.flags.cold_pool_checked_empty === true

  if (python.lairCleared || (python.generated && !python.alive)) {
    return {
      id: 'lingxi_cold_pool',
      locationId: 'lingxi_valley',
      name: '灵溪谷深处寒潭',
      status: 'cleared',
      clue: '潭边残留着大战后的折枝、鳞痕与翻卷泥水。那股压在水下的威胁已经消失。',
      warning: '这里仍然寒冷湿滑，但已没有此前那只强大个体盘踞。',
      canEnter: false,
      threatKnown: false,
    }
  }

  if (checkedEmpty) {
    return {
      id: 'lingxi_cold_pool',
      locationId: 'lingxi_valley',
      name: '灵溪谷深处寒潭',
      status: 'empty-confirmed',
      clue: '你已经沿潭岸和浅水处查过一遍，没有发现足以证明大型妖兽仍在此活动的新鲜痕迹。',
      warning: '寒潭本身仍不安全，但目前没有确认到那种远强于外围妖兽的活动。',
      canEnter: false,
      threatKnown: false,
    }
  }

  if (python.generated && python.alive) {
    return {
      id: 'lingxi_cold_pool',
      locationId: 'lingxi_valley',
      name: '灵溪谷深处寒潭',
      status: 'active-threat',
      clue: '潭边能看见新鲜拖痕和大片被压倒的水草，尺度明显不是普通碧水蛇留下的。水下偶尔有沉重暗影掠过。',
      warning: '这些痕迹指向一只远强于谷外普通妖兽的水中大物。你可以进去，但必须接受它可能正占着地利。',
      canEnter: true,
      entryLabel: '进入寒潭深处',
      opponentId: 'cold-pool-scale-python',
      threatKnown: true,
    }
  }

  return {
    id: 'lingxi_cold_pool',
    locationId: 'lingxi_valley',
    name: '灵溪谷深处寒潭',
    status: 'uncertain',
    clue: '溪谷深处有一口异常冰冷的寒潭，岸边旧鳞痕与水道痕迹杂乱，但暂时看不出是否还有大型妖兽活动。',
    warning: '你只能确认地点本身危险，无法确认水下现在有什么。进去意味着接受这份未知。',
    canEnter: true,
    entryLabel: '进入寒潭深处',
    threatKnown: false,
  }
}

function azureWolfView(state: GameState): StrongBeastTerritoryView | null {
  if (!isStrongBeastTerritoryDiscovered(state, 'azure_wolf_range')) return null
  const ecology = materializeBeastEcology(state).beastEcology!
  const wolf = ecology.specialIndividuals.oneHornedAzureWolf

  if (!wolf.alive) {
    return {
      id: 'azure_wolf_range',
      locationId: 'beast_ridge',
      name: '万兽岭苍狼领地',
      status: 'cleared',
      clue: '原先连青背狼群都刻意绕开的那片山脊已经失去主人的气味，外围狼群开始重新向这里活动。',
      warning: '独占这片山脊的强大个体已经死亡，领地格局正在重新松动。',
      canEnter: false,
      threatKnown: false,
    }
  }

  return {
    id: 'azure_wolf_range',
    locationId: 'beast_ridge',
    name: '万兽岭苍狼领地',
    status: 'active-threat',
    clue: '附近青背狼群会主动避开一段山脊，岩面上却留着单独大型狼类反复巡行的爪痕与气味标记。',
    warning: '能让本地狼群主动让出领地的个体，实力明显不在普通炼气妖兽层次。你仍然可以主动进去。',
    canEnter: true,
    entryLabel: '踏入苍狼领地',
    opponentId: 'one-horned-azure-wolf',
    threatKnown: true,
  }
}

export function getVisibleStrongBeastTerritories(state: GameState, locationId: string): StrongBeastTerritoryView[] {
  const result: StrongBeastTerritoryView[] = []
  if (locationId === 'lingxi_valley') {
    const view = coldPoolView(state)
    if (view) result.push(view)
  }
  if (locationId === 'beast_ridge') {
    const view = azureWolfView(state)
    if (view) result.push(view)
  }
  return result
}

export function getKnownStrongThreatOpponentIds(state: GameState, locationId: string): CombatOpponentId[] {
  return getVisibleStrongBeastTerritories(state, locationId)
    .filter((view) => view.threatKnown && view.opponentId && view.status === 'active-threat')
    .map((view) => view.opponentId!)
}

export function resolveStrongBeastTerritoryEntry(
  state: GameState,
  territoryId: StrongBeastTerritoryId,
): StrongBeastTerritoryEntryResult {
  if (state.status !== 'playing') return { state, applied: false, reason: 'GAME_ENDED' }
  if (state.lifeStage !== 'adult') return { state, applied: false, reason: 'TERRITORY_REQUIRES_ADULT' }
  if (state.pendingBeastLoot) return { state, applied: false, reason: 'PENDING_BEAST_LOOT' }
  const requiredLocation = TERRITORY_LOCATION[territoryId]
  if (state.world.currentLocationId !== requiredLocation) return { state, applied: false, reason: 'WRONG_TERRITORY_LOCATION' }
  if (!isStrongBeastTerritoryDiscovered(state, territoryId)) return { state, applied: false, reason: 'TERRITORY_NOT_DISCOVERED' }

  const withEcology = materializeBeastEcology(state)
  const ecology = withEcology.beastEcology!

  if (territoryId === 'lingxi_cold_pool') {
    const python = ecology.specialIndividuals.coldPoolScalePython
    if (python.lairCleared || (python.generated && !python.alive)) {
      return { state: withEcology, applied: false, reason: 'COLD_POOL_TERRITORY_CLEARED' }
    }
    if (!python.generated) {
      if (withEcology.flags.cold_pool_checked_empty === true) {
        return { state: withEcology, applied: false, reason: 'COLD_POOL_ALREADY_CHECKED_EMPTY' }
      }
      return {
        state: {
          ...withEcology,
          flags: { ...withEcology.flags, cold_pool_checked_empty: true },
        },
        applied: true,
        enteredEmpty: true,
      }
    }
    const started = resolveCombatStart(withEcology, 'cold-pool-scale-python', 'field', ['cold-pool'], 'special')
    return { state: started.state, applied: started.applied, reason: started.reason }
  }

  const wolf = ecology.specialIndividuals.oneHornedAzureWolf
  if (!wolf.alive) return { state: withEcology, applied: false, reason: 'AZURE_WOLF_TERRITORY_CLEARED' }
  const started = resolveCombatStart(withEcology, 'one-horned-azure-wolf', 'field', [], 'unique')
  return { state: started.state, applied: started.applied, reason: started.reason }
}
