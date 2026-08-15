import type { PhysiqueDefinition } from '../types/content'

export const PHYSIQUES = [
  {
    id: 'none',
    name: '无特殊体质',
    description: '一个正常的身体，没有隐藏补偿，也没有额外负担。',
    weight: 72,
    statModifiers: {},
    ruleTags: [],
  },
  {
    id: 'innate_sword_bone',
    name: '先天剑骨',
    description: '骨相天生适剑，对剑诀、御剑与剑道传承有异常好的适应。',
    weight: 3,
    statModifiers: { comprehension: 1 },
    ruleTags: ['physique:sword', 'event:sword_path', 'training:sword_fast'],
  },
  {
    id: 'red_yang_body',
    name: '赤阳灵体',
    description: '体内阳气与火性灵力活跃，火、阳体系更契合，极阴功法则更难适应。',
    weight: 5,
    statModifiers: { constitution: 1 },
    ruleTags: ['physique:fire_yang', 'cultivation:fire_affinity', 'event:fire_resonance'],
  },
  {
    id: 'mysterious_yin_body',
    name: '玄阴灵体',
    description: '对阴、水、寒体系格外契合，也更容易与寒潭、阴性灵物和某些邪道需求产生联系。',
    weight: 5,
    statModifiers: { spiritSense: 1 },
    ruleTags: ['physique:yin_cold', 'cultivation:cold_affinity', 'event:yin_attention'],
  },
  {
    id: 'hundred_herbs_body',
    name: '百草灵体',
    description: '对灵植成熟、损伤与药性变化异常敏锐，采集和炼丹相关判断更可靠。',
    weight: 5,
    statModifiers: { comprehension: 1 },
    ruleTags: ['physique:herb', 'profession:alchemy', 'exploration:plant_insight'],
  },
  {
    id: 'beast_heart',
    name: '通灵兽心',
    description: '更容易察觉妖兽的敌意、恐惧、护崽与领地行为，并获得部分御兽特殊选择。',
    weight: 4,
    statModifiers: { spiritSense: 1 },
    ruleTags: ['physique:beast_empathy', 'profession:beast_taming', 'event:beast_insight'],
  },
  {
    id: 'iron_bone_body',
    name: '铁骨灵躯',
    description: '肉身强健，承受重击和外伤的能力更好，也更适合炼体、重武器与重护具。',
    weight: 4,
    statModifiers: { constitution: 2 },
    ruleTags: ['physique:iron_body', 'combat:heavy_weapon', 'training:body_refining'],
  },
  {
    id: 'empty_mind_platform',
    name: '空明灵台',
    description: '对灵气异常、阵法痕迹与隐秘变化更敏锐，但不会直接告诉你隐藏之物在哪里。',
    weight: 3,
    statModifiers: { spiritSense: 2 },
    ruleTags: ['physique:spirit_sense', 'exploration:spiritual_anomaly', 'training:soul_affinity'],
  },
] as const satisfies readonly PhysiqueDefinition[]

export function getPhysiqueById(id: string): PhysiqueDefinition | undefined {
  return PHYSIQUES.find((physique) => physique.id === id)
}
