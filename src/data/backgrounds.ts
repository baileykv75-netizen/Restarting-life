import type { BackgroundDefinition } from '../types/content'

export const BACKGROUNDS = [
  {
    id: 'hunter_family',
    name: '山村猎户之子',
    weight: 1,
    statModifiers: { constitution: 2, mentality: 1, comprehension: -1 },
    spiritStones: 0,
    tags: ['background:hunter_family'],
  },
  {
    id: 'merchant_family',
    name: '小镇商贾之家',
    weight: 1,
    statModifiers: { comprehension: 1, luck: 1 },
    spiritStones: 20,
    tags: ['background:merchant_family'],
  },
  {
    id: 'scholar_family',
    name: '没落书香门第',
    weight: 1,
    statModifiers: { comprehension: 2, mentality: 1, constitution: -1 },
    spiritStones: 0,
    tags: ['background:scholar_family'],
  },
  {
    id: 'cultivator_branch',
    name: '修仙家族旁系',
    weight: 1,
    statModifiers: { spiritSense: 2, comprehension: 1 },
    spiritStones: 15,
    tags: ['background:cultivator_branch'],
  },
  {
    id: 'orphan',
    name: '无依孤儿',
    weight: 1,
    statModifiers: { mentality: 2, luck: 1 },
    spiritStones: 0,
    tags: ['background:orphan'],
  },
] as const satisfies readonly BackgroundDefinition[]
