import type { GameEvent } from '../../types/event'

export const EXPLORATION_EVENTS: readonly GameEvent[] = [
  {
    id: 'exploration_spirit_herb',
    category: 'exploration',
    title: '山涧灵草',
    text: '你在山涧石缝中发现几株蕴含微弱灵气的药草。',
    weight: 12,
    choices: [
      {
        id: 'collect',
        text: '采下灵草',
        effects: [{ type: 'addSpiritStones', amount: 2 }],
      },
    ],
  },
  {
    id: 'exploration_beast_tracks',
    category: 'exploration',
    title: '妖兽足迹',
    text: '泥地里留下了尚未干透的爪印，附近可能有低阶妖兽活动。',
    weight: 8,
    choices: [
      { id: 'avoid', text: '绕开这片区域', effects: [] },
      {
        id: 'follow',
        text: '循迹寻找战利品',
        effects: [
          { type: 'addSpiritStones', amount: 3 },
          { type: 'addStat', stat: 'constitution', amount: -1 },
        ],
      },
    ],
  },
  {
    id: 'exploration_abandoned_camp',
    category: 'exploration',
    title: '废弃营地',
    text: '林间残留着一处荒废已久的修士营地，火塘早已冰冷。',
    weight: 5,
    once: true,
    choices: [
      {
        id: 'search',
        text: '翻找遗留物',
        effects: [
          { type: 'addSpiritStones', amount: 5 },
          { type: 'setFlag', key: 'found_old_map', value: true },
        ],
      },
    ],
  },
  {
    id: 'exploration_mountain_stream',
    category: 'exploration',
    title: '山泉歇脚',
    text: '清泉从岩缝中流出，你在附近找到几块被水冲出的碎灵石。',
    weight: 9,
    choices: [
      {
        id: 'collect',
        text: '收起碎灵石',
        effects: [{ type: 'addSpiritStones', amount: 1 }],
      },
    ],
  },
  {
    id: 'exploration_hidden_path',
    category: 'exploration',
    title: '隐蔽山径',
    text: '你从草木灵气的细微变化中察觉到一条几乎无人经过的小径。',
    weight: 4,
    once: true,
    conditions: [{ type: 'statMin', stat: 'spiritSense', value: 6 }],
    choices: [
      {
        id: 'follow',
        text: '沿小径深入',
        effects: [{ type: 'addSpiritStones', amount: 6 }],
      },
    ],
  },
  {
    id: 'exploration_bandit_road',
    category: 'exploration',
    title: '山道拦路',
    text: '几名亡命之徒堵住去路。对修士而言不算大敌，但纠缠总有代价。',
    weight: 7,
    choices: [
      { id: 'detour', text: '绕路而行', effects: [] },
      {
        id: 'force',
        text: '强行闯过去',
        effects: [
          { type: 'addSpiritStones', amount: 4 },
          { type: 'addStat', stat: 'constitution', amount: -1 },
        ],
      },
    ],
  },
  {
    id: 'exploration_ruined_shrine',
    category: 'exploration',
    title: '荒山古祠',
    text: '荒废的古祠里只剩一尊模糊石像，香火早断，却让人莫名安静下来。',
    weight: 5,
    once: true,
    conditions: [{ type: 'statMin', stat: 'mentality', value: 5 }],
    choices: [
      {
        id: 'sit',
        text: '静坐片刻',
        effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }],
      },
    ],
  },
  {
    id: 'exploration_mountain_storm',
    category: 'exploration',
    title: '山中暴雨',
    text: '乌云压山，暴雨来得比预想更快。',
    weight: 8,
    choices: [
      { id: 'shelter', text: '先找地方避雨', effects: [] },
      {
        id: 'push_on',
        text: '冒雨赶路',
        effects: [
          { type: 'addSpiritStones', amount: 3 },
          { type: 'addStat', stat: 'constitution', amount: -1 },
        ],
      },
    ],
  },
]
