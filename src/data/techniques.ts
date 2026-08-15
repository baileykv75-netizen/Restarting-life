import type { SpiritElement } from '../types/content'

export interface TechniqueDefinition {
  id: string
  name: string
  baseEfficiency: number
  universal: boolean
  preferredElements: readonly SpiritElement[]
  ruleTags: readonly string[]
  description: string
}

export const R16_TECHNIQUES: readonly TechniqueDefinition[] = [
  {
    id: 'xiaozhoutian_tuna',
    name: '《小周天吐纳法》',
    baseEfficiency: 1,
    universal: true,
    preferredElements: [],
    ruleTags: ['cultivation:universal', 'cultivation:stable'],
    description: '散修常见的基础吐纳法，适应性广，效率普通。',
  },
  {
    id: 'qingyuan_yinqi',
    name: '《青元引气诀》',
    baseEfficiency: 1.08,
    universal: true,
    preferredElements: [],
    ruleTags: ['cultivation:universal', 'cultivation:stable', 'source:qingyun'],
    description: '青云宗基础功法，运转稳定，经脉负担较小。',
  },
  {
    id: 'chunmu_yangyuan',
    name: '《春木养元功》',
    baseEfficiency: 1.04,
    universal: false,
    preferredElements: ['wood'],
    ruleTags: ['cultivation:wood', 'cultivation:stable'],
    description: '木属性基础主修，恢复与经脉稳定见长。',
  },
  {
    id: 'chiyang_jue',
    name: '《赤阳诀》',
    baseEfficiency: 1.08,
    universal: false,
    preferredElements: ['fire'],
    ruleTags: ['cultivation:fire', 'cultivation:future-heat-risk'],
    description: '火属性基础主修，吐纳较快，长期修炼的燥火风险留待后续状态系统接入。',
  },
  {
    id: 'hanshui_jing',
    name: '《寒水经》',
    baseEfficiency: 1.04,
    universal: false,
    preferredElements: ['water', 'ice'],
    ruleTags: ['cultivation:water', 'cultivation:cold'],
    description: '水寒体系基础主修，灵力绵长，冰灵根也视为契合。',
  },
  {
    id: 'houtu_yangqi',
    name: '《厚土养气篇》',
    baseEfficiency: 1.02,
    universal: false,
    preferredElements: ['earth'],
    ruleTags: ['cultivation:earth', 'cultivation:stable'],
    description: '土属性基础主修，运转稳定，偏重根基。',
  },
]

const TECHNIQUE_MAP = new Map(R16_TECHNIQUES.map((technique) => [technique.id, technique]))

export function getTechniqueById(id: string): TechniqueDefinition | undefined {
  return TECHNIQUE_MAP.get(id)
}
