import type { CombatOpponentId } from '../types/combat'
import type { SectAssignmentId, SectAssignmentKind } from '../types/sect'

export interface SectAssignmentDefinition {
  id: SectAssignmentId
  kind: SectAssignmentKind
  name: string
  description: string
  targetLocationId: string
  targetLocationLabel: string
  objectiveText: string
  actionLabel: string
  contributionReward: number
  spiritStoneReward: number
  workDays?: number
  gatherItem?: { itemId: string; quantity: number; label: string }
  combatOpponentId?: CombatOpponentId
}

export const QINGYUN_SECT_ASSIGNMENTS = [
  {
    id: 'qingyun_lingxi_herb_collection',
    kind: 'herb',
    name: '灵溪谷采药',
    description: '事务堂需要一批青露草补充常用药材库存。去灵溪谷野生区域采三株，带回宗门交差。',
    targetLocationId: 'lingxi_valley',
    targetLocationLabel: '灵溪谷',
    objectiveText: '在灵溪谷采得 3 株青露草并带回宗门。',
    actionLabel: '按药图采集三日',
    workDays: 3,
    gatherItem: { itemId: 'green_dew_grass', quantity: 3, label: '青露草' },
    contributionReward: 8,
    spiritStoneReward: 4,
  },
  {
    id: 'qingyun_blackwind_patrol',
    kind: 'patrol',
    name: '黑风山外巡',
    description: '外院需要更新黑风山近宗门一侧的路况与妖兽活动记录。实际巡过山路再回来报备。',
    targetLocationId: 'blackwind_mountain',
    targetLocationLabel: '黑风山',
    objectiveText: '在黑风山累计完成 2 个实际探索日；途中遭遇会照常打断行动。',
    actionLabel: '使用现有区域探索完成巡山',
    workDays: 2,
    contributionReward: 10,
    spiritStoneReward: 5,
  },
  {
    id: 'qingyun_qingxia_escort',
    kind: 'escort',
    name: '坊市物资护送',
    description: '护送一批封签药材从青云宗送到青霞坊青云行馆。宗门只认实际送达，不在事务堂原地结算路程。',
    targetLocationId: 'qingxia_market',
    targetLocationLabel: '青霞坊市',
    objectiveText: '从宗门出发并实际抵达青霞坊市；送达后回宗门交结。',
    actionLabel: '沿现有路线护送至青霞坊市',
    contributionReward: 12,
    spiritStoneReward: 6,
  },
  {
    id: 'qingyun_greenback_cull',
    kind: 'cull',
    name: '黑风山狼患清剿',
    description: '黑风山外山近期有青背狼截路。事务堂要的是确实清掉一只，不是交一份纸面报告。',
    targetLocationId: 'blackwind_mountain',
    targetLocationLabel: '黑风山',
    objectiveText: '在黑风山找到并击杀 1 只青背狼；逃跑或让目标逃走都不算完成。',
    actionLabel: '沿已知狼踪搜索目标',
    combatOpponentId: 'greenback-wolf',
    contributionReward: 18,
    spiritStoneReward: 8,
  },
] as const satisfies readonly SectAssignmentDefinition[]

const ASSIGNMENT_BY_ID = new Map<SectAssignmentId, SectAssignmentDefinition>(
  QINGYUN_SECT_ASSIGNMENTS.map((assignment) => [assignment.id, assignment]),
)

export function getSectAssignmentById(id: SectAssignmentId): SectAssignmentDefinition | undefined {
  return ASSIGNMENT_BY_ID.get(id)
}
