import type { GameEvent } from '../../types/event'
import { BREAKTHROUGH_EVENTS } from './breakthroughEvents'
import { CHAIN_EVENTS } from './chainEvents'
import { CULTIVATION_EVENTS } from './cultivationEvents'
import { ENCOUNTER_EVENTS } from './encounterEvents'
import { EXPLORATION_EVENTS } from './explorationEvents'
import { MORTAL_EVENTS } from './mortalEvents'
import { SECT_EVENTS } from './sectEvents'

const V11_SLICE_EVENTS: readonly GameEvent[] = [
  {
    id: 'v11_mortal_herb_haggle', category: 'mortal', title: '药材议价', text: '你替山民把一篓药材送到镇上。药铺愿意给现钱，也愿意用修士常用的下品灵石结一部分账。', weight: 7, cooldown: 8, maxOccurrences: 3, choices: [
      { id: 'stones', text: '要两枚下品灵石', effects: [{ type: 'addSpiritStones', amount: 2 }], resultText: '你没有拿更多凡俗银钱，而是把两枚真正能在修士坊市流通的下品灵石收进袖中。' },
      { id: 'knowledge', text: '少拿报酬，问清药材来处', effects: [{ type: 'setFlag', key: 'v11_knows_herb_valley', value: true }], resultText: '你记住了采药人反复提到的一条山谷。眼前没有赚到灵石，但那里可能值得亲自去一趟。', consequenceText: '你掌握了一处灵草山谷的线索。' },
    ],
  },
  {
    id: 'v11_mortal_old_ferryman', category: 'mortal', title: '老艄公的见闻', text: '渡口老艄公说，几十年前也有一个没有背景的年轻人天天问仙，后来真成了修士。', weight: 4, once: true, importance: 'notable', choices: [
      { id: 'ask_path', text: '追问他当年去了哪里', effects: [{ type: 'setFlag', key: 'v11_old_cultivator_route', value: true }], resultText: '老艄公想了很久，只记得那人最后去了青霞镇北边。你把这个模糊方向记下。', consequenceText: '一条陈年仙缘的方向被你记录下来。' },
      { id: 'ask_failure', text: '问他那些没成仙的人后来怎样', effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }], resultText: '老艄公讲的不是传奇，而是一群人耗尽半生后回到渡口的故事。你第一次认真想过“求仙失败”意味着什么。' },
    ],
  },
  {
    id: 'v11_loose_debt', category: 'mortal', title: '散修欠契', text: '一个落魄散修想借三枚下品灵石周转，愿意写下欠契，也愿意用一段山中情报抵押。', weight: 4, cooldown: 10, maxOccurrences: 2, conditions: [{ type: 'faction', faction: 'loose' }, { type: 'resourceMin', resource: 'spiritStones', value: 3 }], choices: [
      { id: 'lend', text: '借他三枚下品灵石', effects: [{ type: 'addSpiritStones', amount: -3 }, { type: 'setFlag', key: 'v11_loose_debt_kindness', value: true }], resultText: '你把三枚灵石推过去，只收下一张薄薄的欠契。值不值，要很多年后才知道。', consequenceText: '你在散修圈里结下一笔尚未兑现的人情。' },
      { id: 'buy_info', text: '不借钱，只花一枚灵石买情报', effects: [{ type: 'addSpiritStones', amount: -1 }, { type: 'setFlag', key: 'v11_blackwind_cache', value: true }], resultText: '他收下一枚灵石，告诉你黑风山一处废弃矿洞的位置。情报真假，得亲自验证。' },
      { id: 'decline', text: '不碰陌生人的债', effects: [], resultText: '你把钱袋收好。散修世界里，谨慎本身也是一种生存本事。' },
    ],
  },
  {
    id: 'v11_loose_shared_fire', category: 'mortal', title: '驿站同火', text: '夜宿驿站时，三个陌生散修凑在同一堆火边。有人谈功法，有人谈仇家，也有人只听不说。', weight: 6, cooldown: 8, maxOccurrences: 3, conditions: [{ type: 'faction', faction: 'loose' }], choices: [
      { id: 'talk_practice', text: '交流最基础的吐纳心得', effects: [{ type: 'addCultivation', amount: 12 }], resultText: '几句最朴素的经验反而替你省掉不少弯路。你回去后重新调整了一处行气节奏。' },
      { id: 'listen_people', text: '少谈自己，多记住这些人的名字', effects: [{ type: 'setFlag', key: 'v11_loose_contacts', value: true }], resultText: '你没有暴露多少底细，却记住了三个散修的名字和常去的地方。', consequenceText: '你在散修圈里拥有了可追溯的人脉。' },
    ],
  },
  {
    id: 'v11_cultivation_breath_choice', category: 'cultivation', title: '一口浊气', text: '这一轮周天结束得并不顺。你能感觉到体内还有一处灵气滞涩，是停下来梳理，还是趁势再冲一次？', weight: 9, cooldown: 7, maxOccurrences: 4, choices: [
      { id: 'steady', text: '收功梳理，不贪这一时', effects: [{ type: 'addCultivation', amount: 8 }], resultText: '你没有追求漂亮的进境，只把滞涩一点点理顺。修为涨得不多，却没有留下新的麻烦。' },
      { id: 'push', text: '再冲一轮，抢这一段进境', effects: [{ type: 'addCultivation', amount: 18 }, { type: 'advanceTime', months: 1 }], resultText: '你硬是多运转了数个周天，修为确实更进一步，也为此多耗了一个月才彻底平复经脉。' },
    ],
  },
  {
    id: 'v11_cultivation_stone_cycle', category: 'cultivation', title: '灵石辅修', text: '你可以直接抽取灵石中的灵气辅助周天。三枚下品灵石足以让这一轮修炼明显加快。', weight: 7, cooldown: 8, maxOccurrences: 4, choices: [
      { id: 'spend', text: '消耗三枚下品灵石', conditions: [{ type: 'resourceMin', resource: 'spiritStones', value: 3 }], effects: [{ type: 'addSpiritStones', amount: -3 }, { type: 'addCultivation', amount: 32 }], resultText: '灵石一枚枚暗下去，灵气却实打实地进入经脉。资源就是这样被换成修为的。' },
      { id: 'save', text: '不用灵石，按自己的节奏来', effects: [{ type: 'addCultivation', amount: 6 }], resultText: '你把灵石留在袋中，只靠天地灵气慢慢打磨这一轮周天。' },
    ],
  },
  {
    id: 'v11_cultivation_dao_note', category: 'cultivation', title: '功法旁注', text: '你忽然意识到，以前抄在页边的一句话其实可以有两种解释：一种求快，一种求稳。', weight: 4, once: true, importance: 'notable', conditions: [{ type: 'statMin', stat: 'comprehension', value: 6 }], choices: [
      { id: 'fast', text: '按求快的解释重走周天', effects: [{ type: 'addCultivation', amount: 45 }], resultText: '这条解释确实锋利。你用一次大胆尝试换来了一截明显进境。' },
      { id: 'deep', text: '反复推演，先把道理想透', effects: [{ type: 'addStat', stat: 'comprehension', amount: 1 }], resultText: '你没有立刻获得多少修为，却终于理解这段口诀为什么这样写。以后再看相似问题，思路会更清楚。' },
    ],
  },
  {
    id: 'v11_cultivation_spirit_pool', category: 'cultivation', title: '神识沉潭', text: '入定深处，你感觉神识像落入一池黑水。继续向下探，会更清楚地触到自己的边界。', weight: 3, once: true, importance: 'notable', conditions: [{ type: 'realm', realm: 'qi' }, { type: 'stageMin', stage: 4 }], choices: [
      { id: 'probe', text: '顺着感知继续下探', effects: [{ type: 'addStat', stat: 'spiritSense', amount: 1 }], resultText: '你第一次不是“想象”神识，而是真正触到它的边界。那一刻之后，感知世界的方式细了一层。' },
      { id: 'return', text: '不冒进，把心神收回来', effects: [{ type: 'addStat', stat: 'mentality', amount: 1 }], resultText: '你在最想继续的时候停住了。能收得回来，本身也是修行。' },
    ],
  },
  {
    id: 'v11_sect_task_choice', category: 'sect', title: '外门任务榜', text: '任务榜上同时挂着两桩差事：药园轮值报酬稳定，山门外巡报酬更高，但要多跑一趟山路。', weight: 10, cooldown: 6, maxOccurrences: 5, conditions: [{ type: 'faction', faction: 'qingyun' }], choices: [
      { id: 'garden', text: '药园轮值，领取三枚下品灵石', effects: [{ type: 'addSpiritStones', amount: 3 }, { type: 'addRelationship', id: 'elder', amount: 1 }], resultText: '差事琐碎，却做得干净。管事当场结清三枚下品灵石，也记住了你办事不拖。' },
      { id: 'patrol', text: '接山外巡查，领取六枚下品灵石', effects: [{ type: 'addSpiritStones', amount: 6 }, { type: 'advanceTime', months: 1 }, { type: 'addRelationship', id: 'elder', amount: 2 }], resultText: '山路来回折腾了整整一个月，但你把巡查记录做得完整。多拿的三枚灵石，确实是拿时间换来的。' },
    ],
  },
  {
    id: 'v11_sect_liqing_meal', category: 'sect', title: '与李青同席', text: '李青端着饭碗坐到你对面，问你最近修炼是不是又卡住了。他没什么高深见解，却很愿意听。', weight: 4, cooldown: 10, maxOccurrences: 3, importance: 'notable', conditions: [{ type: 'faction', faction: 'qingyun' }, { type: 'relationshipMin', id: 'li_qing', value: 10 }], choices: [
      { id: 'talk', text: '把最近的烦恼如实说给他听', effects: [{ type: 'addRelationship', id: 'li_qing', amount: 5 }, { type: 'addStat', stat: 'mentality', amount: 1 }], resultText: '李青没有替你解决瓶颈，只陪你把那些说不出口的焦躁说完。散席时，你心里反而轻了些。', chronicleText: undefined },
      { id: 'practice', text: '不谈烦恼，约他明日一起切磋', effects: [{ type: 'addRelationship', id: 'li_qing', amount: 3 }, { type: 'addCultivation', amount: 15 }], resultText: '第二天你们在演武场拆了几十招。彼此都不算高手，却都比一个人闷头练多看见了一些东西。' },
    ],
    chronicleText: '与同门李青渐渐熟络',
  },
  {
    id: 'v11_sect_scripture_choice', category: 'sect', title: '藏经阁空座', text: '整理完书架后还剩半日。你可以继续抄录基础法诀，也可以去翻那些没人愿意看的前人修炼札记。', weight: 6, cooldown: 9, maxOccurrences: 3, conditions: [{ type: 'faction', faction: 'qingyun' }], choices: [
      { id: 'formula', text: '抄基础法诀，稳稳补足修为', effects: [{ type: 'addCultivation', amount: 18 }], resultText: '没有奇遇，没有顿悟。你只是把最基础的东西重新做扎实，修为也因此向前挪了一小步。' },
      { id: 'notes', text: '读前人失败札记', effects: [{ type: 'setFlag', key: 'v11_read_failure_notes', value: true }], resultText: '那些札记几乎都写着失败：冲关失败、走岔经脉、误信丹药。你第一次从别人的代价里看到修行的另一面。', consequenceText: '你记住了前人失败留下的经验。' },
    ],
  },
  {
    id: 'v11_sect_elder_errand', category: 'sect', title: '执事私差', text: '外门执事临时要人送一封信。公事报酬只有两枚灵石，但如果做得快，也许能留下更深的印象。', weight: 5, cooldown: 9, maxOccurrences: 2, conditions: [{ type: 'faction', faction: 'qingyun' }], choices: [
      { id: 'normal', text: '按规矩送到，拿两枚下品灵石', effects: [{ type: 'addSpiritStones', amount: 2 }, { type: 'addRelationship', id: 'elder', amount: 1 }], resultText: '你按规矩把信送到，没有多问。事情很小，但办得没有任何纰漏。' },
      { id: 'fast', text: '连夜赶路，不要报酬只求记住名字', effects: [{ type: 'addRelationship', id: 'elder', amount: 6 }, { type: 'advanceTime', months: 1 }], resultText: '你连夜赶完这一趟，没拿灵石。几天后再见执事时，他第一次直接叫出了你的名字。', consequenceText: '外门执事开始真正注意到你。' },
    ],
  },
  {
    id: 'v11_explore_spirit_bees', category: 'exploration', title: '石壁灵蜂', text: '断壁上结着一窝吸食灵花的野蜂。蜂蜜能卖灵石，但硬取会惊动整窝。', weight: 8, cooldown: 8, maxOccurrences: 4, choices: [
      { id: 'smoke', text: '慢慢熏散蜂群，取一小块蜂蜜', effects: [{ type: 'addSpiritStones', amount: 3 }], resultText: '你没有贪多，只割下一小块灵蜜。回到坊市后，它换成了三枚下品灵石。' },
      { id: 'leave', text: '记下位置，不为几枚灵石冒险', effects: [{ type: 'setFlag', key: 'v11_spirit_bee_nest', value: true }], resultText: '你没有动蜂巢，只把石壁的位置记了下来。也许以后修为更高时，这里还会有别的价值。' },
    ],
  },
  {
    id: 'v11_explore_mist_ravine', category: 'exploration', title: '雾谷回声', text: '山谷忽然起雾。雾里偶尔传来石块滚落的回声，像是有人，也像只是风。', weight: 7, cooldown: 9, maxOccurrences: 3, choices: [
      { id: 'retreat', text: '沿原路退出雾谷', effects: [], resultText: '你没有得到任何东西，也没有把自己交给一场看不清的风险。半个时辰后，你安全退回山脊。' },
      { id: 'probe', text: '放慢脚步，循回声深入', conditions: [{ type: 'statMin', stat: 'spiritSense', value: 7 }], effects: [{ type: 'addSpiritStones', amount: 5 }, { type: 'setFlag', key: 'v11_mist_ravine_marker', value: true }], resultText: '你靠感知绕开两处断崖，在谷底找到一个废弃储物袋。里面只剩五枚下品灵石和一块刻着记号的木牌。', consequenceText: '雾谷深处的木牌记号被你带了出来。' },
    ],
  },
  {
    id: 'v11_explore_broken_bridge', category: 'exploration', title: '断桥对岸', text: '旧索桥只剩一半，对岸石台上却摆着一个明显不是凡人留下的木匣。', weight: 5, once: true, importance: 'notable', choices: [
      { id: 'risk', text: '沿残索过去取木匣', effects: [{ type: 'addSpiritStones', amount: 8 }, { type: 'advanceTime', months: 1 }], resultText: '你花了整整一个月养好手臂的拉伤，但木匣里八枚下品灵石证明这次冒险并非全无价值。' },
      { id: 'mark', text: '现在不冒险，把位置画下来', effects: [{ type: 'setFlag', key: 'v11_broken_bridge_cache', value: true }], resultText: '你没有被眼前的木匣牵着走，而是把地形仔细画下。等实力更强再来，也许才是更好的选择。', consequenceText: '你留下了一处尚未开启的断桥机缘。' },
    ],
  },
  {
    id: 'v11_explore_thunder_ridge', category: 'exploration', title: '雷击山脊', text: '暴雨后，一株老松被雷劈开。焦黑木心里隐约有灵光闪动，附近却还残留着细碎雷意。', weight: 5, cooldown: 10, maxOccurrences: 2, importance: 'notable', choices: [
      { id: 'take', text: '等雷意散去，取走焦木灵芯', effects: [{ type: 'addSpiritStones', amount: 6 }], resultText: '你耐心等到雷意散尽才动手。那截灵芯回到坊市后卖出六枚下品灵石。' },
      { id: 'sense', text: '不取灵芯，只感受残留雷意', conditions: [{ type: 'statMin', stat: 'spiritSense', value: 8 }], effects: [{ type: 'addStat', stat: 'spiritSense', amount: 1 }], resultText: '你放弃了能立刻换钱的灵芯，把注意力留在雷意如何消散上。那一夜之后，你的感知明显更细了一层。' },
    ],
  },
]

export const ORDINARY_EVENTS = [
  ...MORTAL_EVENTS,
  ...CULTIVATION_EVENTS,
  ...SECT_EVENTS,
  ...EXPLORATION_EVENTS,
  ...V11_SLICE_EVENTS,
] as const

export const FORMAL_EVENTS = [
  ...ENCOUNTER_EVENTS,
  ...ORDINARY_EVENTS,
  ...CHAIN_EVENTS,
  ...BREAKTHROUGH_EVENTS,
] as const
