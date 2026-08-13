import type { GameEvent } from '../../types/event'

export const BREAKTHROUGH_EVENTS: readonly GameEvent[] = [
  {
    id: 'breakthrough_qi_entry',
    category: 'breakthrough',
    title: '引气入体',
    text: '你依照法诀调息，尝试第一次将天地灵气引入经脉。',
    weight: 1,
    conditions: [
      { type: 'realm', realm: 'mortal' },
      { type: 'hasTag', tag: 'has_spirit_root' },
      { type: 'flagEquals', key: 'has_cultivation_method', value: true },
    ],
    choices: [
      { id: 'attempt', text: '开始引气', effects: [] },
      { id: 'retreat', text: '暂缓突破', effects: [] },
    ],
  },
  {
    id: 'breakthrough_foundation',
    category: 'breakthrough',
    title: '筑基',
    text: '炼气九层已至圆满，你开始压缩灵力，尝试铸就道基。',
    weight: 1,
    conditions: [
      { type: 'realm', realm: 'qi' },
      { type: 'stageMin', stage: 9 },
      { type: 'resourceMin', resource: 'cultivation', value: 100 },
    ],
    choices: [
      { id: 'attempt', text: '冲击筑基', effects: [] },
      { id: 'retreat', text: '暂缓突破', effects: [] },
    ],
  },
  {
    id: 'breakthrough_golden_core',
    category: 'breakthrough',
    title: '结丹',
    text: '道基圆满，灵力汇聚丹田。成则寿元大增，败则多年苦功付诸东流。',
    weight: 1,
    conditions: [
      { type: 'realm', realm: 'foundation' },
      { type: 'stageMin', stage: 3 },
      { type: 'resourceMin', resource: 'cultivation', value: 500 },
    ],
    choices: [
      { id: 'attempt', text: '凝结金丹', effects: [] },
      { id: 'retreat', text: '暂缓突破', effects: [] },
    ],
  },
]
