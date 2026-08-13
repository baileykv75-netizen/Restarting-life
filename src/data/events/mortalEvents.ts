import type { GameEvent } from '../../types/event'

export const MORTAL_EVENTS: readonly GameEvent[] = [
  {
    id: 'mortal_daily_labor',
    category: 'mortal',
    title: '凡尘营生',
    text: '没有仙缘降临，你仍要在柴米油盐中把日子过下去。',
    weight: 10,
    once: true,
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
    id: 'mortal_old_book',
    category: 'mortal',
    title: '旧书残卷',
    text: '旧书摊上有一本残缺的杂记，字里行间似乎藏着前人的处世之道。',
    weight: 7,
    once: true,
    conditions: [{ type: 'realm', realm: 'mortal' }],
    choices: [
      {
        id: 'read',
        text: '耐心读完',
        effects: [{ type: 'addStat', stat: 'comprehension', amount: 1 }],
      },
    ],
  },
  {
    id: 'mortal_market_rumor',
    category: 'mortal',
    title: '市井仙闻',
    text: '茶摊上的客人又在谈论山中仙师，只是谁也说不清是真是假。',
    weight: 8,
    conditions: [{ type: 'realm', realm: 'mortal' }],
    choices: [
      {
        id: 'listen',
        text: '记下这些传闻',
        effects: [{ type: 'setFlag', key: 'heard_market_rumor', value: true }],
      },
    ],
  },
  {
    id: 'loose_commission',
    category: 'mortal',
    title: '散修委托',
    text: '坊市里有人请你护送一批寻常灵材。',
    weight: 10,
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
    id: 'loose_market_stall',
    category: 'mortal',
    title: '坊市散摊',
    text: '散修摆出的摊位上有一瓶粗炼聚气散，成色只能算勉强。',
    weight: 7,
    conditions: [{ type: 'faction', faction: 'loose' }],
    choices: [
      {
        id: 'buy',
        text: '花两枚灵石买下',
        conditions: [{ type: 'resourceMin', resource: 'spiritStones', value: 2 }],
        effects: [
          { type: 'addSpiritStones', amount: -2 },
          { type: 'addCultivation', amount: 15 },
        ],
      },
      { id: 'pass', text: '看看便走', effects: [] },
    ],
  },
  {
    id: 'loose_rain_shelter',
    category: 'mortal',
    title: '破庙听雨',
    text: '一场山雨把你困在破庙里。没有宗门庇护的日子，总得学会独自熬过去。',
    weight: 5,
    once: true,
    conditions: [{ type: 'faction', faction: 'loose' }],
    choices: [
      {
        id: 'reflect',
        text: '静坐听雨',
        effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }],
      },
    ],
  },
]
