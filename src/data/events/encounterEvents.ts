import type { GameEvent } from '../../types/event'

export const ENCOUNTER_EVENTS: readonly GameEvent[] = [
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
    id: 'encounter_no_root_beggar',
    category: 'mortal',
    title: '路边老乞',
    text: '一个病弱老人倒在路边，身旁只有一只裂口葫芦。你并不知道这一念善恶会留下些什么。',
    weight: 1,
    once: true,
    conditions: [
      { type: 'realm', realm: 'mortal' },
      { type: 'hasTag', tag: 'no_spirit_root' },
      { type: 'flagMissing', key: 'no_root_fate_seed' },
    ],
    choices: [
      {
        id: 'help',
        text: '给他水和干粮',
        effects: [
          { type: 'setFlag', key: 'no_root_fate_seed', value: true },
          { type: 'addStat', stat: 'mentality', amount: 1 },
        ],
      },
      {
        id: 'ignore',
        text: '匆匆离开',
        effects: [{ type: 'setFlag', key: 'no_root_fate_missed', value: true }],
      },
    ],
  },
  {
    id: 'encounter_li_qing_injury',
    category: 'sect',
    title: '受伤的同门',
    text: '同门李青在任务中受了伤，强撑着回到山门，身边的人却都赶着交差。',
    weight: 2,
    once: true,
    conditions: [{ type: 'faction', faction: 'qingyun' }],
    choices: [
      {
        id: 'help',
        text: '停下来照料他',
        effects: [
          { type: 'setFlag', key: 'saved_li_qing', value: true },
          { type: 'addRelationship', id: 'li_qing', amount: 20 },
        ],
      },
      {
        id: 'leave',
        text: '先完成自己的差事',
        effects: [{ type: 'setFlag', key: 'ignored_li_qing', value: true }],
      },
    ],
  },
  {
    id: 'encounter_master_attention',
    category: 'sect',
    title: '长老驻足',
    text: '一位内门长老在演武场边看了你很久，忽然问你是否愿意随他修行一段时间。',
    weight: 1,
    once: true,
    conditions: [
      { type: 'faction', faction: 'qingyun' },
      { type: 'statMin', stat: 'comprehension', value: 6 },
    ],
    choices: [
      {
        id: 'accept',
        text: '行礼拜见师父',
        effects: [
          { type: 'setFlag', key: 'master_disciple', value: true },
          { type: 'addRelationship', id: 'master', amount: 20 },
        ],
      },
      {
        id: 'decline',
        text: '婉拒这份机缘',
        effects: [{ type: 'setFlag', key: 'master_declined', value: true }],
      },
    ],
  },
  {
    id: 'encounter_ancient_cave',
    category: 'exploration',
    title: '断崖石门',
    text: '断崖后的藤蔓遮着一道石门，门缝里透出的灵气与周围格格不入。',
    weight: 1,
    once: true,
    conditions: [{ type: 'statMin', stat: 'spiritSense', value: 5 }],
    choices: [
      {
        id: 'inspect',
        text: '只记录石门纹路，不贸然进入',
        effects: [
          { type: 'setFlag', key: 'ancient_cave_clue', value: true },
          { type: 'addTag', tag: 'ancient_inscription' },
        ],
      },
      {
        id: 'leave',
        text: '暂时离开',
        effects: [{ type: 'setFlag', key: 'ancient_cave_abandoned', value: true }],
      },
    ],
  },
  {
    id: 'encounter_spirit_herb_dispute',
    category: 'exploration',
    title: '灵药之争',
    text: '你与一名叫陈羽的散修同时发现一株成熟灵药。',
    weight: 2,
    once: true,
    conditions: [{ type: 'realm', realm: 'qi' }],
    choices: [
      {
        id: 'yield',
        text: '让出灵药',
        effects: [
          { type: 'setFlag', key: 'chen_yu_feud_avoided', value: true },
          { type: 'addStat', stat: 'mentality', amount: 1 },
        ],
      },
      {
        id: 'contest',
        text: '争下灵药',
        effects: [
          { type: 'setFlag', key: 'enemy_chen_yu', value: true },
          { type: 'addRelationship', id: 'chen_yu', amount: -30 },
          { type: 'addSpiritStones', amount: 5 },
        ],
      },
    ],
  },
  {
    id: 'encounter_secret_market',
    category: 'exploration',
    title: '夜半鬼市',
    text: '山谷深处竟有一场只在夜里出现的小型鬼市，摊主们都不问来历。',
    weight: 1,
    once: true,
    conditions: [{ type: 'statMin', stat: 'luck', value: 6 }],
    choices: [
      {
        id: 'buy_fragment',
        text: '花十枚灵石买下无名残页',
        conditions: [{ type: 'resourceMin', resource: 'spiritStones', value: 10 }],
        effects: [
          { type: 'addSpiritStones', amount: -10 },
          { type: 'addCultivation', amount: 70 },
          { type: 'addTag', tag: 'ghost_market_fragment' },
        ],
      },
      {
        id: 'observe',
        text: '只看不买',
        effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }],
      },
    ],
  },
  {
    id: 'encounter_dao_dream',
    category: 'cultivation',
    title: '一梦问道',
    text: '入定之中，你梦见自己独坐云海，面前只有一条看不到尽头的石阶。',
    weight: 1,
    once: true,
    conditions: [{ type: 'statMin', stat: 'mentality', value: 6 }],
    choices: [
      {
        id: 'climb',
        text: '沿石阶向上',
        effects: [{ type: 'addStat', stat: 'comprehension', amount: 1 }],
      },
      {
        id: 'sit',
        text: '原地观云',
        effects: [{ type: 'addStat', stat: 'spiritSense', amount: 1 }],
      },
    ],
  },
  {
    id: 'encounter_old_temple',
    category: 'exploration',
    title: '无名古殿',
    text: '一座没有匾额的古殿藏在山腹中，殿内没有宝物，只有满墙已经模糊的修行刻痕。',
    weight: 1,
    once: true,
    conditions: [{ type: 'statMin', stat: 'mentality', value: 6 }],
    choices: [
      {
        id: 'meditate',
        text: '在殿中静坐一夜',
        effects: [
          { type: 'addCultivation', amount: 30 },
          { type: 'addTag', tag: 'old_temple_memory' },
        ],
      },
    ],
  },
  {
    id: 'encounter_wandering_alchemist',
    category: 'mortal',
    title: '游方丹师',
    text: '一名脾气古怪的丹师在坊市停留半日，手里恰好有一枚炼体余丹。',
    weight: 1,
    once: true,
    conditions: [{ type: 'faction', faction: 'loose' }],
    choices: [
      {
        id: 'buy',
        text: '花五枚灵石买下',
        conditions: [{ type: 'resourceMin', resource: 'spiritStones', value: 5 }],
        effects: [
          { type: 'addSpiritStones', amount: -5 },
          { type: 'addStat', stat: 'constitution', amount: 1 },
        ],
      },
      { id: 'decline', text: '囊中灵石另有用处', effects: [] },
    ],
  },
]
