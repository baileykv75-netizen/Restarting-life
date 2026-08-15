import type { SpiritElement } from '../types/content'

export type TechniqueCategory = 'main' | 'combat' | 'movement' | 'body' | 'secret'
export type TechniqueProficiencyStage = 'entry' | 'skilled' | 'minor' | 'major'

export interface TechniqueMoveDefinition {
  id: string
  name: string
  description: string
  requiredProficiency?: TechniqueProficiencyStage
  ruleTags: readonly string[]
}

export interface TechniqueDefinition {
  id: string
  name: string
  category: TechniqueCategory
  description: string
  ruleTags: readonly string[]
  moves?: readonly TechniqueMoveDefinition[]
  /** Only main techniques with frozen R16 cultivation balance carry these fields. */
  baseEfficiency?: number
  universal?: boolean
  preferredElements?: readonly SpiritElement[]
}

export interface CultivationTechniqueDefinition extends TechniqueDefinition {
  category: 'main'
  baseEfficiency: number
  universal: boolean
  preferredElements: readonly SpiritElement[]
}

export const R16_TECHNIQUES: readonly CultivationTechniqueDefinition[] = [
  {
    id: 'xiaozhoutian_tuna',
    name: '《小周天吐纳法》',
    category: 'main',
    baseEfficiency: 1,
    universal: true,
    preferredElements: [],
    ruleTags: ['cultivation:universal', 'cultivation:stable'],
    description: '散修常见的基础吐纳法，适应性广，效率普通。',
  },
  {
    id: 'qingyuan_yinqi',
    name: '《青元引气诀》',
    category: 'main',
    baseEfficiency: 1.08,
    universal: true,
    preferredElements: [],
    ruleTags: ['cultivation:universal', 'cultivation:stable', 'source:qingyun'],
    description: '青云宗基础功法，运转稳定，经脉负担较小。',
  },
  {
    id: 'chunmu_yangyuan',
    name: '《春木养元功》',
    category: 'main',
    baseEfficiency: 1.04,
    universal: false,
    preferredElements: ['wood'],
    ruleTags: ['cultivation:wood', 'cultivation:stable'],
    description: '木属性基础主修，恢复与经脉稳定见长。',
  },
  {
    id: 'chiyang_jue',
    name: '《赤阳诀》',
    category: 'main',
    baseEfficiency: 1.08,
    universal: false,
    preferredElements: ['fire'],
    ruleTags: ['cultivation:fire', 'cultivation:future-heat-risk'],
    description: '火属性基础主修，吐纳较快，长期修炼的燥火风险留待后续状态系统接入。',
  },
  {
    id: 'hanshui_jing',
    name: '《寒水经》',
    category: 'main',
    baseEfficiency: 1.04,
    universal: false,
    preferredElements: ['water', 'ice'],
    ruleTags: ['cultivation:water', 'cultivation:cold'],
    description: '水寒体系基础主修，灵力绵长，冰灵根也视为契合。',
  },
  {
    id: 'houtu_yangqi',
    name: '《厚土养气篇》',
    category: 'main',
    baseEfficiency: 1.02,
    universal: false,
    preferredElements: ['earth'],
    ruleTags: ['cultivation:earth', 'cultivation:stable'],
    description: '土属性基础主修，运转稳定，偏重根基。',
  },
]

const R17_REGISTRY_ONLY: readonly TechniqueDefinition[] = [
  {
    id: 'gengjin_ruili',
    name: '《庚金锐气诀》',
    category: 'main',
    description: '金属性主修，偏重锐利与攻伐；具体基础修炼效率尚未冻结。',
    preferredElements: ['metal'],
    universal: false,
    ruleTags: ['cultivation:metal', 'balance:pending-cultivation-efficiency'],
  },
  {
    id: 'fengxing_tuna',
    name: '《风行吐纳篇》',
    category: 'main',
    description: '风属性主修，强调灵力流转与轻灵；具体基础修炼效率尚未冻结。',
    preferredElements: ['wind'],
    universal: false,
    ruleTags: ['cultivation:wind', 'balance:pending-cultivation-efficiency'],
  },
  {
    id: 'leiyin_jue',
    name: '《雷引诀》',
    category: 'main',
    description: '雷属性主修，本地传承少见；具体基础修炼效率尚未冻结。',
    preferredElements: ['thunder'],
    universal: false,
    ruleTags: ['cultivation:thunder', 'balance:pending-cultivation-efficiency'],
  },
  {
    id: 'yinsui_lu_fragment',
    name: '《阴髓录》残篇',
    category: 'main',
    description: '阴寒邪道残篇，会把修行引向更危险的资源与身体代价；低阶精确效率尚未冻结。',
    preferredElements: ['water', 'ice'],
    universal: false,
    ruleTags: ['cultivation:cold', 'cultivation:evil', 'balance:pending-cultivation-efficiency'],
  },
  {
    id: 'qingfeng_jianjue',
    name: '《青锋剑诀》',
    category: 'combat',
    description: '青锋一脉的基础剑诀，以刺、斩建立基本剑路，小成后可进一步掌握御剑追击。',
    ruleTags: ['combat:sword'],
    moves: [
      { id: 'thrust', name: '刺', description: '沿剑锋直取一点的基础剑式。', ruleTags: ['combat:future-active'] },
      { id: 'slash', name: '斩', description: '以完整挥斩形成正面剑路。', ruleTags: ['combat:future-active'] },
      { id: 'sword_chase', name: '御剑追击', description: '小成后可掌握的追击剑式。', requiredProficiency: 'minor', ruleTags: ['combat:future-active', 'combat:future-chase'] },
    ],
  },
  {
    id: 'chiyan_shu',
    name: '《赤焰术》',
    category: 'combat',
    description: '常见火系术法，以火弹与炎爆为主要施术形式。',
    ruleTags: ['combat:fire'],
    moves: [
      { id: 'firebolt', name: '火弹', description: '凝聚火性灵力后向目标打出。', ruleTags: ['combat:future-active'] },
      { id: 'flame_burst', name: '炎爆', description: '令聚集的火性灵力瞬间爆开。', ruleTags: ['combat:future-active'] },
    ],
  },
  {
    id: 'futeng_shu',
    name: '《缚藤术》',
    category: 'combat',
    description: '木系束缚术法，可用于缠束与荆刺。',
    ruleTags: ['combat:wood', 'combat:control'],
    moves: [
      { id: 'bind', name: '缠束', description: '催生藤蔓限制目标行动。', ruleTags: ['combat:future-active'] },
      { id: 'thorn', name: '荆刺', description: '借藤蔓与荆棘形成攻击。', ruleTags: ['combat:future-active'] },
    ],
  },
  {
    id: 'shuimu_shu',
    name: '《水幕术》',
    category: 'combat',
    description: '以水性灵力形成短时防御水幕，正式减伤数值留到战斗系统。',
    ruleTags: ['combat:water', 'combat:defense'],
    moves: [{ id: 'water_screen', name: '水幕', description: '形成短时防御水幕。', ruleTags: ['combat:future-active', 'combat:future-defense'] }],
  },
  {
    id: 'shijia_shu',
    name: '《石甲术》',
    category: 'combat',
    description: '土系护体术法，正式护体数值留到战斗系统。',
    ruleTags: ['combat:earth', 'combat:defense'],
    moves: [{ id: 'stone_armor', name: '石甲护体', description: '以土性灵力护住身体。', ruleTags: ['combat:future-active', 'combat:future-defense'] }],
  },
  {
    id: 'jinmang_jue',
    name: '《金芒诀》',
    category: 'combat',
    description: '金系远程术法，偏向锐利与穿透。',
    ruleTags: ['combat:metal', 'combat:ranged'],
    moves: [{ id: 'golden_ray', name: '金芒', description: '凝成一道锐利金芒远攻。', ruleTags: ['combat:future-active', 'combat:future-pierce'] }],
  },
  {
    id: 'qingshen_shu',
    name: '《轻身术》',
    category: 'movement',
    description: '基础轻身法门，用于改善步法与短距离移动。',
    ruleTags: ['movement:lightness'],
  },
  {
    id: 'liuyun_bu',
    name: '《流云步》',
    category: 'movement',
    description: '强调连续变向与步法衔接的身法。',
    ruleTags: ['movement:agility'],
  },
  {
    id: 'tafeng_xing',
    name: '《踏风行》',
    category: 'movement',
    description: '偏向速度与长距离移动的风系身法。',
    ruleTags: ['movement:wind'],
  },
  {
    id: 'fuyue_duanti',
    name: '《伏岳锻体篇》',
    category: 'body',
    description: '偏重筋骨与承载能力的炼体法门。',
    ruleTags: ['body:refining', 'body:heavy'],
  },
  {
    id: 'tieyi_gong',
    name: '《铁衣功》',
    category: 'body',
    description: '以反复锤炼提高护体与抗击能力的炼体功。',
    ruleTags: ['body:refining', 'body:defense'],
  },
  {
    id: 'ranxue_jue',
    name: '《燃血诀》',
    category: 'secret',
    description: '以燃烧自身状态换取短时爆发的危险秘术，正式代价与战斗效果留到对应系统。',
    ruleTags: ['secret:blood', 'cultivation:evil', 'combat:future-burst'],
  },
]

export const TECHNIQUES: readonly TechniqueDefinition[] = [...R16_TECHNIQUES, ...R17_REGISTRY_ONLY]

const TECHNIQUE_MAP = new Map(TECHNIQUES.map((technique) => [technique.id, technique]))
const CULTIVATION_TECHNIQUE_MAP = new Map(R16_TECHNIQUES.map((technique) => [technique.id, technique]))

export function getTechniqueById(id: string): TechniqueDefinition | undefined {
  return TECHNIQUE_MAP.get(id)
}

export function getCultivationTechniqueById(id: string): CultivationTechniqueDefinition | undefined {
  return CULTIVATION_TECHNIQUE_MAP.get(id)
}
