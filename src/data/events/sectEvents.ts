import type { GameEvent } from '../../types/event'

export const SECT_EVENTS: readonly GameEvent[] = [
  {
    id: 'sect_task',
    category: 'sect',
    title: '宗门差事',
    text: '外门执事分下一桩杂务，完成后可领取少量灵石。',
    weight: 12,
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
    id: 'sect_scripture_hall',
    category: 'sect',
    title: '藏经阁一日',
    text: '轮到你整理外门藏书。那些基础注疏看似浅显，却把许多概念说得极清楚。',
    weight: 5,
    once: true,
    conditions: [{ type: 'faction', faction: 'qingyun' }],
    choices: [
      {
        id: 'read',
        text: '趁机认真研读',
        effects: [{ type: 'addStat', stat: 'comprehension', amount: 1 }],
      },
    ],
  },
  {
    id: 'sect_sparring',
    category: 'sect',
    title: '同门切磋',
    text: '演武场上几名弟子正在相互拆招，你也被叫了过去。',
    weight: 9,
    conditions: [{ type: 'faction', faction: 'qingyun' }],
    choices: [
      {
        id: 'observe',
        text: '在旁观摩',
        effects: [{ type: 'addCultivation', amount: 10 }],
      },
      {
        id: 'join',
        text: '下场切磋',
        effects: [{ type: 'addCultivation', amount: 15 }],
      },
    ],
  },
  {
    id: 'sect_herb_garden',
    category: 'sect',
    title: '药园轮值',
    text: '照料灵草并不体面，但药园管事从不克扣报酬。',
    weight: 9,
    conditions: [{ type: 'faction', faction: 'qingyun' }],
    choices: [
      {
        id: 'work',
        text: '把这一轮值守做好',
        effects: [{ type: 'addSpiritStones', amount: 2 }],
      },
    ],
  },
  {
    id: 'sect_night_watch',
    category: 'sect',
    title: '山门守夜',
    text: '夜色极静，护山阵法之外的风吹草动都变得格外清晰。',
    weight: 4,
    once: true,
    conditions: [{ type: 'faction', faction: 'qingyun' }],
    choices: [
      {
        id: 'listen',
        text: '凝神感知四周',
        effects: [{ type: 'addStat', stat: 'spiritSense', amount: 1 }],
      },
    ],
  },
  {
    id: 'sect_elder_question',
    category: 'sect',
    title: '执事问话',
    text: '外门执事随口问起你近来的修行，你知道这也算一次留下印象的机会。',
    weight: 5,
    once: true,
    conditions: [{ type: 'faction', faction: 'qingyun' }],
    choices: [
      {
        id: 'respectful',
        text: '如实而恭敬地回答',
        effects: [
          { type: 'addRelationship', id: 'elder', amount: 5 },
          { type: 'addStat', stat: 'mentality', amount: 1 },
        ],
      },
      {
        id: 'direct',
        text: '直接说出自己的疑惑',
        effects: [
          { type: 'addRelationship', id: 'elder', amount: -2 },
          { type: 'addStat', stat: 'comprehension', amount: 1 },
        ],
      },
    ],
  },
  {
    id: 'sect_contribution_exchange',
    category: 'sect',
    title: '贡献换丹',
    text: '你用部分积蓄从宗门换来一瓶适合当前境界的辅修丹药。',
    weight: 5,
    conditions: [
      { type: 'faction', faction: 'qingyun' },
      { type: 'resourceMin', resource: 'spiritStones', value: 5 },
    ],
    choices: [
      {
        id: 'exchange',
        text: '支付五枚灵石',
        effects: [
          { type: 'addSpiritStones', amount: -5 },
          { type: 'addCultivation', amount: 35 },
        ],
      },
      { id: 'save', text: '暂时不换', effects: [] },
    ],
  },
  {
    id: 'sect_outer_exam',
    category: 'sect',
    title: '外门小考',
    text: '宗门按例考校弟子修行进度，你被叫到执事面前演示基础法诀。',
    weight: 4,
    once: true,
    conditions: [
      { type: 'faction', faction: 'qingyun' },
      { type: 'realm', realm: 'qi' },
      { type: 'stageMin', stage: 4 },
    ],
    choices: [
      {
        id: 'perform',
        text: '稳稳完成考校',
        effects: [
          { type: 'setFlag', key: 'outer_exam_passed', value: true },
          { type: 'addRelationship', id: 'elder', amount: 8 },
        ],
      },
    ],
  },
]
