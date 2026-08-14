import type { GameEvent } from '../../types/event'

/**
 * V2 migration boundary: these are V1.2 authored fate chains kept as legacy
 * content material. Do not add new global "life routes" here for V2. Existing
 * events may later be split into NPC, location, rare encounter, or world-story
 * content once those context systems exist.
 */
export const CHAIN_EVENTS: readonly GameEvent[] = [
  {
    id: 'chain_no_root_dream',
    category: 'mortal',
    title: '旧梦葫芦',
    text: '多年后你又梦见那只裂口葫芦，梦中老人只说了一句：“山崖下的东西，本就不挑主人。”',
    weight: 2,
    once: true,
    conditions: [
      { type: 'realm', realm: 'mortal' },
      { type: 'flagEquals', key: 'no_root_fate_seed', value: true },
      { type: 'flagMissing', key: 'no_root_dream_seen' },
    ],
    choices: [
      {
        id: 'remember',
        text: '记住梦中所指的方向',
        effects: [
          { type: 'setFlag', key: 'no_root_dream_seen', value: true },
          { type: 'addStat', stat: 'mentality', amount: 1 },
        ],
      },
    ],
  },
  {
    id: 'chain_no_root_cliff_pill',
    category: 'exploration',
    title: '崖底石髓',
    text: '你在崖底找到一团被石壳包裹的乳白灵髓。它不像传说中的洗灵丹，却可能真的改变什么。',
    weight: 1,
    once: true,
    conditions: [
      { type: 'realm', realm: 'mortal' },
      { type: 'flagEquals', key: 'no_root_dream_seen', value: true },
      { type: 'hasTag', tag: 'no_spirit_root' },
    ],
    choices: [
      {
        id: 'swallow',
        text: '吞下石髓，赌一次仙途',
        effects: [
          { type: 'removeTag', tag: 'no_spirit_root' },
          { type: 'removeTag', tag: 'spirit_root:none' },
          { type: 'addTag', tag: 'has_spirit_root' },
          { type: 'addTag', tag: 'spirit_root:reformed' },
          { type: 'setFlag', key: 'reformed_spirit_root_multiplier', value: 0.7 },
          { type: 'setFlag', key: 'has_cultivation_method', value: true },
          { type: 'changeFaction', faction: 'loose' },
          { type: 'addStat', stat: 'constitution', amount: -1 },
        ],
      },
      {
        id: 'leave',
        text: '不拿性命赌未知之物',
        effects: [{ type: 'setFlag', key: 'no_root_fate_refused', value: true }],
      },
    ],
  },
  {
    id: 'chain_li_qing_discussion',
    category: 'sect',
    title: '同门论道',
    text: '伤愈后的李青常来与你讨论修炼。他记得当初是谁在所有人都忙着赶路时停了下来。',
    weight: 2,
    once: true,
    conditions: [
      { type: 'flagEquals', key: 'saved_li_qing', value: true },
      { type: 'relationshipMin', id: 'li_qing', value: 20 },
      { type: 'flagMissing', key: 'li_qing_discussion' },
    ],
    choices: [
      {
        id: 'discuss',
        text: '交换各自修炼心得',
        effects: [
          { type: 'setFlag', key: 'li_qing_discussion', value: true },
          { type: 'addRelationship', id: 'li_qing', amount: 10 },
          { type: 'addStat', stat: 'comprehension', amount: 1 },
        ],
      },
    ],
  },
  {
    id: 'chain_li_qing_return_favor',
    category: 'exploration',
    title: '旧日善缘',
    text: '一次远行中你的补给几乎耗尽，恰好遇见已经独当一面的李青。他什么也没问，只把储物袋丢了过来。',
    weight: 1,
    once: true,
    conditions: [
      { type: 'ageMin', years: 30 },
      { type: 'flagEquals', key: 'li_qing_discussion', value: true },
      { type: 'relationshipMin', id: 'li_qing', value: 25 },
    ],
    choices: [
      {
        id: 'accept',
        text: '收下这份旧情',
        effects: [
          { type: 'addSpiritStones', amount: 8 },
          { type: 'addRelationship', id: 'li_qing', amount: 10 },
          { type: 'addTag', tag: 'li_qing_ally' },
        ],
      },
    ],
  },
  {
    id: 'chain_master_guidance',
    category: 'cultivation',
    title: '师门点拨',
    text: '师父没有替你运功，只在你最困惑的地方问了三个问题。你闭关数日后才明白其中用意。',
    weight: 2,
    once: true,
    conditions: [
      { type: 'realm', realm: 'qi' },
      { type: 'flagEquals', key: 'master_disciple', value: true },
      { type: 'flagMissing', key: 'master_guidance_received' },
    ],
    choices: [
      {
        id: 'understand',
        text: '将点拨融入自己的修行',
        effects: [
          { type: 'setFlag', key: 'master_guidance_received', value: true },
          { type: 'addCultivation', amount: 40 },
          { type: 'addStat', stat: 'comprehension', amount: 1 },
        ],
      },
    ],
  },
  {
    id: 'chain_master_legacy',
    category: 'sect',
    title: '师门旧匣',
    text: '踏入筑基后，师父将一只旧木匣交给你：“现在给你，才不算害你。”',
    weight: 1,
    once: true,
    conditions: [
      { type: 'realm', realm: 'foundation' },
      { type: 'flagEquals', key: 'master_guidance_received', value: true },
    ],
    choices: [
      {
        id: 'receive',
        text: '接过木匣',
        effects: [
          { type: 'setFlag', key: 'master_legacy_received', value: true },
          { type: 'addSpiritStones', amount: 20 },
          { type: 'addStat', stat: 'mentality', amount: 1 },
        ],
      },
    ],
  },
  {
    id: 'chain_ancient_inscription',
    category: 'cultivation',
    title: '石门残纹',
    text: '闭关时你忽然把断崖石门上的纹路与功法中的一段古注联系了起来。',
    weight: 1,
    once: true,
    conditions: [
      { type: 'flagEquals', key: 'ancient_cave_clue', value: true },
      { type: 'statMin', stat: 'comprehension', value: 6 },
    ],
    choices: [
      {
        id: 'decode',
        text: '推演石门开启之法',
        effects: [{ type: 'setFlag', key: 'ancient_cave_decoded', value: true }],
      },
    ],
  },
  {
    id: 'chain_ancient_cave_return',
    category: 'exploration',
    title: '再入断崖',
    text: '你依照推演重新来到断崖。石门真的在灵力触及特定纹路时缓缓开启。',
    weight: 1,
    once: true,
    conditions: [{ type: 'flagEquals', key: 'ancient_cave_decoded', value: true }],
    choices: [
      {
        id: 'enter',
        text: '谨慎进入遗府',
        effects: [
          { type: 'addCultivation', amount: 80 },
          { type: 'addSpiritStones', amount: 10 },
          { type: 'addTag', tag: 'ancient_cave_legacy' },
        ],
      },
    ],
  },
  {
    id: 'chain_chen_yu_ambush',
    category: 'exploration',
    title: '林中伏击',
    text: '陈羽没有忘记当初那株灵药。你刚进入密林，四周的灵气流向便有些不对。',
    weight: 2,
    once: true,
    conditions: [{ type: 'flagEquals', key: 'enemy_chen_yu', value: true }],
    choices: [
      {
        id: 'detect',
        text: '【神识敏锐】提前发现埋伏',
        conditions: [{ type: 'statMin', stat: 'spiritSense', value: 7 }],
        effects: [
          { type: 'setFlag', key: 'survived_chen_yu_ambush', value: true },
          { type: 'addStat', stat: 'mentality', amount: 1 },
        ],
      },
      {
        id: 'fight',
        text: '硬闯出去',
        effects: [
          { type: 'setFlag', key: 'survived_chen_yu_ambush', value: true },
          { type: 'addStat', stat: 'constitution', amount: -1 },
          { type: 'addRelationship', id: 'chen_yu', amount: -10 },
        ],
      },
    ],
  },
  {
    id: 'chain_chen_yu_settlement',
    category: 'exploration',
    title: '旧怨了结',
    text: '数次纠缠后，你与陈羽终于在一处山口正面相遇。这一次谁都没有旁人可借势。',
    weight: 1,
    once: true,
    conditions: [{ type: 'flagEquals', key: 'survived_chen_yu_ambush', value: true }],
    choices: [
      {
        id: 'reconcile',
        text: '到此为止',
        effects: [
          { type: 'setFlag', key: 'chen_yu_feud_settled', value: true },
          { type: 'addRelationship', id: 'chen_yu', amount: 40 },
        ],
      },
      {
        id: 'pursue',
        text: '彻底压下这桩旧怨',
        effects: [
          { type: 'setFlag', key: 'chen_yu_defeated', value: true },
          { type: 'addSpiritStones', amount: 8 },
          { type: 'addStat', stat: 'constitution', amount: -1 },
        ],
      },
    ],
  },
]
