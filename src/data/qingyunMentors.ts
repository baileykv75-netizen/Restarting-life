import type { QingyunMasterNpcId, SectAssignmentId } from '../types/sect'

export interface QingyunMentorDefinition {
  id: QingyunMasterNpcId
  npcCode: 'N03' | 'N04'
  name: string
  title: string
  realmLabel: string
  specialty: string
  description: string
  contributionRequired: number
  requiredSettledAssignments: readonly SectAssignmentId[]
  taughtTechniqueIds: readonly string[]
  teachingText: string
  guidanceText: string
}

export const QINGYUN_MENTORS: readonly QingyunMentorDefinition[] = [
  {
    id: 'qingyun_lin_zhaochuan',
    npcCode: 'N03',
    name: '林照川',
    title: '外事长老',
    realmLabel: '筑基中期',
    specialty: '剑法、身法与外出战斗',
    description: '林照川不太看漂亮话，更在意弟子在山外办事时是否稳得住阵脚、收得住手。',
    contributionRequired: 18,
    requiredSettledAssignments: ['qingyun_blackwind_patrol', 'qingyun_greenback_cull'],
    taughtTechniqueIds: ['qingfeng_jianjue', 'liuyun_bu'],
    teachingText: '正式拜师后，他会把《青锋剑诀》的基础剑路与《流云步》的换位要领交给你。',
    guidanceText: '另有一次十日当面指点：在你现有主修法门上纠正行气与收束，正常修炼收益额外提高四分之一。',
  },
  {
    id: 'qingyun_lu_qingyi',
    npcCode: 'N04',
    name: '陆清仪',
    title: '丹堂长老',
    realmLabel: '筑基初期',
    specialty: '灵药、经脉稳定与灵溪谷事务',
    description: '陆清仪看重的是辨药、做事和收尾是否细致。灵药差事办得干净，比在她面前夸口更有用。',
    contributionRequired: 8,
    requiredSettledAssignments: ['qingyun_lingxi_herb_collection'],
    taughtTechniqueIds: ['chunmu_yangyuan', 'shuimu_shu'],
    teachingText: '正式拜师后，她会传你《春木养元功》的基础行气次序与《水幕术》。是否适合作为主修，仍取决于你的灵根与现有路线。',
    guidanceText: '另有一次十日当面指点：从经脉负担与周天细节入手，正常修炼收益额外提高四分之一。',
  },
]

const MENTOR_MAP = new Map(QINGYUN_MENTORS.map((mentor) => [mentor.id, mentor]))

export function getQingyunMentorById(id: QingyunMasterNpcId): QingyunMentorDefinition | undefined {
  return MENTOR_MAP.get(id)
}
