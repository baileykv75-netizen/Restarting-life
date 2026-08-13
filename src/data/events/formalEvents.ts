import type { GameEvent } from '../../types/event'

export const FORMAL_EVENTS: readonly GameEvent[] = [
  {
    id: 'mortal_immortal_encounter',
    category: 'mortal',
    title: '山门来客',
    text: '一名青云宗外门执事路过此地，察觉到你身上微弱的灵气波动。',
    weight: 10,
    once: true,
    conditions: [
      { type: 'realm', realm: 'mortal' },
      { type: 'hasTag', tag: 'has_spirit_root' },
      { type: 'flagMissing', key: 'has_cultivation_method' },
    ],
    choices: [
      {
        id: 'join_qingyun',
        text: '随执事前往青云宗',
        effects: [
          { type: 'setFlag', key: 'has_cultivation_method', value: true },
          { type: 'changeFaction', faction: 'qingyun' },
          { type: 'addTag', tag: 'qingyun_initiate' },
          { type: 'addRelationship', id: 'elder', amount: 10 },
        ],
      },
      {
        id: 'remain_loose',
        text: '求一篇引气法诀，自行修行',
        effects: [
          { type: 'setFlag', key: 'has_cultivation_method', value: true },
          { type: 'changeFaction', faction: 'loose' },
          { type: 'addTag', tag: 'loose_cultivator' },
        ],
      },
    ],
  },
  {
    id: 'mortal_daily_labor',
    category: 'mortal',
    title: '凡尘营生',
    text: '没有仙缘降临，你仍要在柴米油盐中把日子过下去。',
    weight: 5,
    conditions: [
      { type: 'realm', realm: 'mortal' },
      { type: 'hasTag', tag: 'no_spirit_root' },
    ],
    choices: [
      {
        id: 'work',
        text: '踏实谋生',
        effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }],
      },
    ],
  },
  {
    id: 'loose_commission',
    category: 'mortal',
    title: '散修委托',
    text: '坊市里有人请你护送一批寻常灵材。',
    weight: 7,
    conditions: [{ type: 'faction', faction: 'loose' }],
    choices: [
      {
        id: 'accept',
        text: '接下委托',
        effects: [{ type: 'addSpiritStones', amount: 2 }],
      },
    ],
  },
  {
    id: 'sect_task',
    category: 'sect',
    title: '宗门差事',
    text: '外门执事分下一桩杂务，完成后可领取少量灵石。',
    weight: 10,
    conditions: [{ type: 'faction', faction: 'qingyun' }],
    choices: [
      {
        id: 'accept',
        text: '完成差事',
        effects: [
          { type: 'addSpiritStones', amount: 3 },
          { type: 'addRelationship', id: 'elder', amount: 1 },
        ],
      },
    ],
  },
  {
    id: 'exploration_spirit_herb',
    category: 'exploration',
    title: '山涧灵草',
    text: '你在山涧石缝中发现几株蕴含微弱灵气的药草。',
    weight: 10,
    choices: [
      {
        id: 'collect',
        text: '采下灵草',
        effects: [{ type: 'addSpiritStones', amount: 2 }],
      },
    ],
  },
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
