import type { GameEvent } from '../../types/event'

export const CULTIVATION_EVENTS: readonly GameEvent[] = [
  {
    id: 'cultivation_steady_breathing',
    category: 'cultivation',
    title: '吐纳渐稳',
    text: '这一轮周天格外顺畅，灵气在经脉中循序而行。',
    weight: 12,
    choices: [
      {
        id: 'continue',
        text: '顺势运功',
        effects: [{ type: 'addCultivation', amount: 8 }],
      },
    ],
  },
  {
    id: 'cultivation_meridian_ache',
    category: 'cultivation',
    title: '经脉隐痛',
    text: '连续运转功法后，经脉传来细微刺痛。',
    weight: 7,
    choices: [
      { id: 'rest', text: '稳妥收功', effects: [] },
      {
        id: 'push',
        text: '强行再冲一轮',
        effects: [
          { type: 'addCultivation', amount: 18 },
          { type: 'addStat', stat: 'constitution', amount: -1 },
        ],
      },
    ],
  },
  {
    id: 'cultivation_spirit_stone_aid',
    category: 'cultivation',
    title: '灵石辅修',
    text: '你想到可以直接引出灵石中的灵气，加快这一轮修炼。',
    weight: 7,
    choices: [
      {
        id: 'spend',
        text: '消耗两枚灵石',
        conditions: [{ type: 'resourceMin', resource: 'spiritStones', value: 2 }],
        effects: [
          { type: 'addSpiritStones', amount: -2 },
          { type: 'addCultivation', amount: 25 },
        ],
      },
      { id: 'save', text: '留着灵石', effects: [] },
    ],
  },
  {
    id: 'cultivation_small_insight',
    category: 'cultivation',
    title: '偶有所得',
    text: '过去一直想不通的一处行气关窍，在今日突然豁然开朗。',
    weight: 4,
    once: true,
    conditions: [{ type: 'statMin', stat: 'comprehension', value: 6 }],
    choices: [
      {
        id: 'grasp',
        text: '抓住这点灵光',
        effects: [{ type: 'addCultivation', amount: 40 }],
      },
    ],
  },
  {
    id: 'cultivation_temper_heart',
    category: 'cultivation',
    title: '枯坐磨心',
    text: '修炼没有任何惊喜，只有一遍又一遍重复周天。真正难熬的反而是寂寞。',
    weight: 4,
    once: true,
    conditions: [{ type: 'statMax', stat: 'mentality', value: 8 }],
    choices: [
      {
        id: 'endure',
        text: '继续坐下去',
        effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }],
      },
    ],
  },
  {
    id: 'cultivation_spirit_sense_echo',
    category: 'cultivation',
    title: '神识回响',
    text: '入定极深时，你第一次清晰察觉到自身神魂的边界。',
    weight: 3,
    once: true,
    conditions: [{ type: 'statMin', stat: 'spiritSense', value: 6 }],
    choices: [
      {
        id: 'observe',
        text: '细细体悟',
        effects: [{ type: 'addStat', stat: 'spiritSense', amount: 1 }],
      },
    ],
  },
  {
    id: 'cultivation_family_notes',
    category: 'cultivation',
    title: '家传旧注',
    text: '你重新翻出旁系长辈留下的修炼批注，其中几句话如今才看得懂。',
    weight: 4,
    once: true,
    conditions: [{ type: 'hasTag', tag: 'background:cultivator_branch' }],
    choices: [
      {
        id: 'study',
        text: '对照功法研读',
        effects: [{ type: 'addCultivation', amount: 30 }],
      },
    ],
  },
  {
    id: 'cultivation_bottleneck_reflection',
    category: 'cultivation',
    title: '瓶颈之前',
    text: '修为增长渐慢，你开始重新审视自己一路修行的得失。',
    weight: 4,
    once: true,
    conditions: [{ type: 'stageMin', stage: 3 }],
    choices: [
      {
        id: 'reflect',
        text: '不急着求快',
        effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }],
      },
    ],
  },
]
