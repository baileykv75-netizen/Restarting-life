import type { GameEvent } from '../../types/event'

export const TEST_EVENTS: readonly GameEvent[] = [
  {
    id: 'test_mountain_glimmer',
    category: 'mortal',
    title: '测试：山中异光',
    text: '用于验证年龄、选项条件、Flag、Tag、时间推进和事件链。',
    weight: 10,
    once: true,
    conditions: [{ type: 'ageMin', years: 10 }],
    choices: [
      {
        id: 'investigate',
        text: '仔细探查',
        conditions: [{ type: 'statMin', stat: 'spiritSense', value: 5 }],
        effects: [
          { type: 'addTag', tag: 'test_cave_clue' },
          { type: 'setFlag', key: 'test_saw_glimmer', value: true },
          { type: 'advanceTime', months: 1 },
        ],
        nextEventId: 'test_cave_echo',
      },
      {
        id: 'leave',
        text: '谨慎离开',
        effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }],
      },
    ],
  },
  {
    id: 'test_cave_echo',
    category: 'chain',
    title: '测试：洞中回响',
    text: '用于验证 nextEventId 的优先级与 queueEvent 共存。',
    weight: 1,
    once: true,
    choices: [
      {
        id: 'collect',
        text: '收起灵石后返回',
        effects: [
          { type: 'addSpiritStones', amount: 3 },
          { type: 'queueEvent', eventId: 'test_aftershock' },
        ],
        nextEventId: 'test_return_home',
      },
    ],
  },
  {
    id: 'test_return_home',
    category: 'chain',
    title: '测试：归家',
    text: '用于验证事件队列按顺序继续推进。',
    weight: 1,
    once: true,
    choices: [
      {
        id: 'rest',
        text: '休息两个月',
        effects: [{ type: 'advanceTime', months: 2 }],
      },
    ],
  },
  {
    id: 'test_aftershock',
    category: 'chain',
    title: '测试：余波',
    text: '用于验证排队事件在前置链节点结束后继续触发。',
    weight: 1,
    once: true,
    choices: [
      {
        id: 'endure',
        text: '承受余波',
        effects: [{ type: 'addStat', stat: 'constitution', amount: -1 }],
      },
    ],
  },
  {
    id: 'test_market_offer',
    category: 'mortal',
    title: '测试：坊市交易',
    text: '用于验证资源条件与资源扣减。',
    weight: 5,
    conditions: [{ type: 'resourceMin', resource: 'spiritStones', value: 2 }],
    choices: [
      {
        id: 'buy',
        text: '花两枚灵石买下残页',
        effects: [
          { type: 'addSpiritStones', amount: -2 },
          { type: 'addTag', tag: 'test_bought_page' },
        ],
      },
    ],
  },
  {
    id: 'test_qingyun_notice',
    category: 'sect',
    title: '测试：宗门传令',
    text: '用于验证势力条件、关系值与 Flag。',
    weight: 5,
    conditions: [{ type: 'faction', faction: 'qingyun' }],
    choices: [
      {
        id: 'accept',
        text: '接受任务',
        effects: [
          { type: 'addRelationship', id: 'elder', amount: 10 },
          { type: 'setFlag', key: 'test_qingyun_notice', value: true },
        ],
      },
    ],
  },
  {
    id: 'test_old_debt',
    category: 'chain',
    title: '测试：旧账',
    text: '用于验证 Flag 与关系值组合条件。',
    weight: 1,
    conditions: [
      { type: 'flagEquals', key: 'test_qingyun_notice', value: true },
      { type: 'relationshipMin', id: 'elder', value: 5 },
    ],
    choices: [
      {
        id: 'settle',
        text: '了结旧账',
        effects: [{ type: 'addRelationship', id: 'elder', amount: -5 }],
      },
    ],
  },
  {
    id: 'test_fatal_trap',
    category: 'exploration',
    title: '测试：致命陷阱',
    text: '用于验证死亡后立即终止效果与后续事件。',
    weight: 1,
    choices: [
      {
        id: 'fall',
        text: '坠入陷阱',
        effects: [
          { type: 'killPlayer', reason: '测试陷阱' },
          { type: 'addSpiritStones', amount: 99 },
        ],
        nextEventId: 'test_return_home',
      },
    ],
  },
]
