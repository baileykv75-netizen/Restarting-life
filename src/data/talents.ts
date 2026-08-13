import type { TalentDefinition } from '../types/content'

export const TALENTS = [
  {
    id: 'strong_body',
    name: '天生强健',
    weight: 10,
    statModifiers: { constitution: 2 },
    spiritStones: 0,
  },
  {
    id: 'photographic_memory',
    name: '过目不忘',
    weight: 10,
    statModifiers: { comprehension: 2 },
    spiritStones: 0,
  },
  {
    id: 'keen_soul',
    name: '神魂敏锐',
    weight: 10,
    statModifiers: { spiritSense: 2 },
    spiritStones: 0,
  },
  {
    id: 'pure_heart',
    name: '赤子之心',
    weight: 10,
    statModifiers: { mentality: 2 },
    spiritStones: 0,
  },
  {
    id: 'fortunate',
    name: '福缘深厚',
    weight: 8,
    statModifiers: { luck: 2 },
    spiritStones: 0,
  },
  {
    id: 'hard_worker',
    name: '吃苦耐劳',
    weight: 10,
    statModifiers: { constitution: 1, mentality: 1 },
    spiritStones: 0,
  },
  {
    id: 'dao_seed',
    name: '悟道种子',
    weight: 7,
    statModifiers: { comprehension: 1, mentality: 1 },
    spiritStones: 0,
  },
  {
    id: 'observant',
    name: '察微知著',
    weight: 9,
    statModifiers: { spiritSense: 1, comprehension: 1 },
    spiritStones: 0,
  },
  {
    id: 'wealth_luck',
    name: '财运亨通',
    weight: 7,
    statModifiers: { luck: 1 },
    spiritStones: 20,
  },
  {
    id: 'tempered_by_hardship',
    name: '苦难磨心',
    weight: 9,
    statModifiers: { mentality: 2, constitution: 1, luck: -1 },
    spiritStones: 0,
  },
] as const satisfies readonly TalentDefinition[]
