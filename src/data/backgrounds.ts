import type { BackgroundDefinition } from '../types/content'

export const BACKGROUNDS = [
  {
    id: 'hunter_family',
    name: '山村猎户之子',
    description: '自小跟着家里人进山，身子结实，也更习惯风餐露宿。',
    weight: 1,
    statModifiers: { constitution: 2, mentality: 1, comprehension: -1 },
    spiritStones: 0,
    tags: ['background:hunter_family'],
  },
  {
    id: 'merchant_family',
    name: '小镇商贾之家',
    description: '家里常与南来北往的客商打交道，你从小就比旁人更懂钱与消息的分量。',
    weight: 1,
    statModifiers: { comprehension: 1, luck: 1 },
    spiritStones: 20,
    tags: ['background:merchant_family'],
  },
  {
    id: 'scholar_family',
    name: '没落书香门第',
    description: '家道已经败落，旧宅里仍留着几箱残书。你幼时读得多，身子却不算强健。',
    weight: 1,
    statModifiers: { comprehension: 2, mentality: 1, constitution: -1 },
    spiritStones: 0,
    tags: ['background:scholar_family'],
  },
  {
    id: 'cultivator_branch',
    name: '修仙家族旁系',
    description: '虽只是家族旁支，你终究比普通凡人更早听过灵根、功法和坊市这些词。',
    weight: 1,
    statModifiers: { spiritSense: 2, comprehension: 1 },
    spiritStones: 15,
    tags: ['background:cultivator_branch'],
  },
  {
    id: 'orphan',
    name: '无依孤儿',
    description: '很早便学会自己讨生活。缺少依靠让日子更难，也让你更能熬过难处。',
    weight: 1,
    statModifiers: { mentality: 2, luck: 1 },
    spiritStones: 0,
    tags: ['background:orphan'],
  },
] as const satisfies readonly BackgroundDefinition[]
