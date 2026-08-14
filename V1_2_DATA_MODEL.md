# Restarting Life V1.2 核心数据模型

> 文档性质：V1.2 数据契约补充。  
> 玩法真源：`V1_2_GAME_DESIGN.md`。  
> 技术真源：`V1_2_TECH_SPEC.md`。  
> 开发顺序：`V1_2_DEV_ROADMAP.md`。  
> 本文目的：在进入 Stage 1 之前冻结核心状态的职责边界，避免后续边开发边重命名、边新增重复状态。

---

# 0. 数据建模原则

1. **世界真相与角色认知分离。** 后台可以知道未来会发生什么，玩家只能看到角色已经知道的部分。
2. **单一时间源。** V1.2 新人生只保存 `worldDay`，业务层不得同时维护月份、年份等第二套规则时间。
3. **单一数值真相。** 灵石、属性、关系、时间等结果由状态差值生成，叙事不重复保存一套“假数字”。
4. **静态定义与运行态分离。** 地点、活动、NPC模板、FateNode、CheckDefinition 等静态内容不写入存档；存档只保留必要运行状态和稳定 ID。
5. **隐藏状态不直接进入 UI。** React 不允许直接消费完整 `GameStateV2`，必须经过 Player View selector。
6. **失败是业务状态。** `failure`、`criticalFailure`、`missed`、`expired`、`invalidated` 都是正常结果，不是异常。
7. **确定性优先。** 所有随机结果、范围耗时、检定、NPC里程碑都使用 Seeded RNG，并将消耗顺序纳入测试。
8. **不为未来过度设计。** Stage 0 只冻结 V1.2 第一实现所需字段；装备、炼丹、开放地图、逐日 NPC AI 等不提前占位。

---

# 1. 核心状态分层

V1.2 将运行数据分为四层：

```text
Static Definitions
    │
    ├── Character Archetypes
    ├── Locations / Activities
    ├── Event Definitions
    ├── FateGraph Definitions
    ├── NPC Definitions / Milestones
    └── Check Definitions

GameStateV2（世界真相）
    │
    ├── 玩家真实状态
    ├── 世界时间
    ├── 隐藏世界日程
    ├── 隐藏命运运行态
    ├── NPC真实运行态
    └── 角色已经知道的信息

Player View（玩家可见投影）
    │
    ├── 玩家人物状态
    ├── 当前地点与可做之事
    ├── 当前透明检定信息
    ├── 已知人物
    ├── “近日所知”
    └── 《此世传》

Persistence
    └── GameStateV2 + Session/Debug/Archive 所需稳定状态
```

任何 UI 新需求如果需要读取隐藏层，必须先判断它是否实际上应该成为“角色认知”；不能为了方便展示直接暴露隐藏 Core State。

---

# 2. GameStateV2 冻结结构

Stage 1～12 以如下职责边界为基准。字段允许在对应阶段补充必要子字段，但不得改变顶层语义。

```ts
export interface GameStateV2 {
  schemaVersion: 2

  runId: string
  runSeed: string
  rngState: number

  status: 'playing' | 'dead' | 'won'
  endReason: string | null

  worldDay: number

  identity: PlayerIdentityV2

  attributes: {
    base: Record<StatKey, number>
    permanentGrowth: Record<StatKey, number>
  }

  resources: {
    spiritStones: number
    cultivation: number
  }

  cultivation: {
    realm: Realm
    stage: number
  }

  location: {
    currentLocationId: string
  }

  mood: MoodState
  conditions: StatusCondition[]

  tags: string[]
  flags: Record<string, boolean | number | string>
  relationships: Record<string, number>

  knowledge: PlayerKnowledgeState

  npcs: Record<string, NpcRuntimeState>

  world: {
    schedule: WorldScheduledEvent[]
  }

  fate: FateRuntimeState

  activity: ActivityRuntimeState

  events: EventRuntimeState

  chronicle: ChronicleEntry[]
}
```

## 2.1 不进入 GameStateV2 的内容

以下属于静态定义，不应整份写入存档：

- 地点说明全文；
- 活动定义全文；
- NPC人物模板全文；
- FateGraph完整定义；
- CheckDefinition；
- 事件定义全文；
- 世界事件 resolver 函数；
- UI 展示模型。

存档只保存稳定 ID、运行状态与已经发生的结果。

---

# 3. 人物身份 PlayerIdentityV2

```ts
export interface PlayerIdentityV2 {
  name: string
  gender: 'male' | 'female'

  birthDay: number
  birthPlaceId: string

  archetypeId: string
  familyTemplateId: string
  backgroundId: string

  spiritRootId: string
  talentIds: string[]

  personalityTags: string[]
  formativeExperienceIds: string[]
  currentDesireId: string | null

  faction: Faction
  rankId: string | null
  masterNpcId: string | null
}
```

## 3.1 `archetypeId` 的含义

`archetypeId` 不是公开职业，也不是强制剧情线；它是内容层用于选择适合该人物的背景、FateGraph 与人生冲突的内部索引。

第一人物原型目标：

```text
gu_changan_no_root
```

第二人物必须使用结构明显不同的原型，不能只是更换名字和属性。

## 3.2 人物愿望不是任务进度

`currentDesireId` 只表达人物目前在意什么，例如“仍想寻找仙路”。

UI 可以把它写成自然语言人物状态，但不得出现：

```text
主线目标 2/5
命途完成度 40%
```

---

# 4. 时间模型

## 4.1 唯一规则时间

```ts
export type WorldDay = number
```

固定：

```text
1月 = 30日
1年 = 12月 = 360日
```

年龄由：

```ts
worldDay - identity.birthDay
```

派生，不在人物状态中额外维护 `age`。

## 4.2 Duration

Stage 3 首版冻结为：

```ts
export type Duration =
  | { type: 'fixed'; days: number }
  | { type: 'range'; minDays: number; maxDays: number }
```

暂不实现：

- `untilCondition`；
- `untilBreakthrough`；
- 每日 tick 模拟；
- 通用协程式长任务。

范围耗时解析一次后，真实天数进入调试日志/结果，不在后续重复抽取。

## 4.3 时间推进唯一入口

业务模块不得直接：

```ts
state.worldDay += days
```

统一走：

```ts
advanceWorldTime(state, days)
```

Stage 3 先承担日期、寿元、状态过期等职责；Stage 9～11 再按路线图逐步加入 NPC milestone 与 schedule 结算。禁止在 Stage 3 提前写完整世界调度器。

---

# 5. 属性模型

五维仍为：

```ts
type StatKey =
  | 'constitution'
  | 'comprehension'
  | 'spiritSense'
  | 'mentality'
  | 'luck'
```

状态只存：

```ts
attributes.base
attributes.permanentGrowth
```

有效值运行时派生：

```text
base
+ permanentGrowth
+ realmGrowth
+ statusConditionModifier
+ moodModifier
+ situationalModifier
= effectiveStat
```

## 5.1 固定职责

- 根骨：肉身承载、炼体、危险灵物、伤势、生存；
- 悟性：功法、阵法、传承、理解、顿悟；
- 神识：探查、隐藏、埋伏、遗迹、精细控制；
- 心性：恐惧、诱惑、心魔、悲痛、执念与长期压力；
- 气运：稀少机缘与意外转机，不作为高频万能属性。

属性职责长期保持一致，让玩家能通过多世不同人物积累对世界规则的经验。

---

# 6. 玩家知识 PlayerKnowledgeState

```ts
export interface PlayerKnowledgeState {
  futureEvents: KnownFutureEvent[]
  clues: KnownClue[]
}
```

## 6.1 KnownFutureEvent

```ts
export interface KnownFutureEvent {
  id: string
  title: string
  description: string

  exactDay?: number
  earliestDay?: number
  latestDay?: number

  sourceText: string
  confidence: 'certain' | 'credible' | 'rumor' | 'vague'
  status: 'upcoming' | 'passed' | 'resolved' | 'invalidated'

  learnedAtDay: number
}
```

规则：

1. `exactDay` 与时间范围互斥。
2. 已知事项按最早可能发生时间排序。
3. 角色不知道的未来事件绝不进入这里。
4. 假传闻可以存在，不要求后台真的有对应 schedule。
5. 更可靠消息可以更新/替换旧消息。
6. “近日所知”是情报面板，不是任务栏。

## 6.2 KnownClue

首版保持最小：

```ts
export interface KnownClue {
  id: string
  learnedAtDay: number
  sourceText: string
}
```

若某条线索需要更多显示文本，优先从静态 ClueDefinition 读取，不把重复文案写进每个存档。

---

# 7. 世界日程 WorldScheduledEvent

```ts
export type WorldEventMode = 'deadline' | 'background' | 'interrupt'

export interface WorldScheduledEvent {
  id: string
  eventDay: number
  mode: WorldEventMode
  resolverId: string
  status: 'scheduled' | 'resolved' | 'expired' | 'cancelled'
  tags?: string[]
}
```

## 7.1 三类事件职责

### deadline

例如宗门开山、坊市大集。玩家在别处度过该时间即可错过，不自动中断活动。

### background

例如 NPC 筑基。世界后台自动结算；玩家是否得知是另一件事。

### interrupt

仅保留给真正重大、合理打断当前长期行为的事件。Stage 11 之前不实现通用 interrupt 恢复机制。

## 7.2 世界真相与认知不绑定

```text
WorldScheduledEvent ≠ KnownFutureEvent
```

一个 schedule 可以永远不被玩家提前知道；一个 rumor 也可以没有真实 schedule。

---

# 8. FateGraph 数据边界

技术名称固定为 `FateGraph`，不是严格树结构。

```ts
export interface FateGraphDefinition {
  id: string
  archetypeIds: string[]
  nodes: FateNodeDefinition[]
}

export interface FateNodeDefinition {
  id: string
  eventId: string
  conditions: FateCondition[]
  once: boolean
  priority: number
  intensity: 0 | 1 | 2 | 3 | 4
}
```

运行态：

```ts
export interface FateRuntimeState {
  triggeredNodeIds: string[]
  completedNodeIds: string[]
  blockedNodeIds: string[]
}
```

## 8.1 FateGraph 不做什么

它不负责：

- 每天的普通生活；
- 玩家可见任务进度；
- 自动生成剧情；
- NPC每日决策；
- 可视化路线树；
- 任意脚本执行。

它只负责：

> 根据人物经历与当前状态，让真正会改变人生结构的节点在合适时机成为可能。

---

# 9. 透明检定 CheckEngine

```ts
export type CheckTier =
  | 'criticalSuccess'
  | 'success'
  | 'partialSuccess'
  | 'failure'
  | 'criticalFailure'
```

核心结果至少保留：

```ts
export interface CheckResult {
  id: string
  primaryStat: StatKey
  effectiveStat: number
  target: number
  visibleModifiers: CheckModifier[]
  hiddenModifierTotal: number
  roll: number
  score: number
  tier: CheckTier
}
```

## 9.1 透明与隐藏边界

玩家看到：

- 主属性当前值；
- 推荐/目标值；
- 已知正负修正；
- 资源/关系要求；
- 风险描述。

玩家默认不看到：

- RNG 精确 roll；
- 隐藏 Fate modifier；
- 未知环境真相。

Debug Log 可以记录完整计算。

## 9.2 检定失败不锁死人生

内容设计必须优先提供：

```text
失败 → 另一后果/代价/支线
```

而不是：

```text
属性不够 → 什么都不发生
```

只有真正不可能执行的动作才应直接禁用。

---

# 10. NPC Runtime

首版 NPC 使用里程碑模拟。

```ts
export type NpcStatus =
  | 'alive'
  | 'injured'
  | 'missing'
  | 'departed'
  | 'dead'

export interface NpcRuntimeState {
  id: string
  birthDay: number
  status: NpcStatus

  realm: Realm
  stage: number
  relationship: number

  flags: Record<string, boolean | number | string>

  nextMilestoneId: string | null
  nextMilestoneDay: number | null
}
```

NPC不会逐日修炼或逐日决策。

当里程碑到来时，系统一次性根据：

```text
NPC固定条件
+ 世界状态
+ 玩家历史影响
+ Seeded RNG
```

结算下一状态。

关系真值只存一个来源。若未来从 `state.relationships` 迁移到 `NpcRuntimeState.relationship`，必须单独设计迁移，不允许两个字段同时成为权威值。

---

# 11. Mood 与 StatusCondition

```ts
export interface MoodState {
  type:
    | 'calm'
    | 'joyful'
    | 'hopeful'
    | 'inspired'
    | 'anxious'
    | 'low'
    | 'grieving'
    | 'afraid'
    | 'obsessed'
  intensity: 1 | 2 | 3
  expiresAtDay: number | null
}
```

同一时刻只保存一个主心境。

```ts
export interface StatusCondition {
  id: string
  type: string
  intensity: 1 | 2 | 3
  startedAtDay: number
  expiresAtDay: number | null
  sourceId: string
}
```

首版不做多维连续心理模型，也不做复杂身体部位系统。

---

# 12. Activity Runtime

```ts
export interface ActivityRuntimeState {
  active: ActiveActivity | null
  locks: ActivityLock[]
  routine: RoutineAccumulator[]
}
```

Stage 3～10 大多数活动一次性结算。

```ts
export interface ActiveActivity {
  id: string
  activityId: string
  startedAtDay: number
  plannedEndDay: number
  remainingDays: number
  payload?: Record<string, string | number | boolean>
}
```

`ActiveActivity` 主要为 Stage 11 的极少数 `interrupt` 预留，不代表早期阶段要做复杂中断/恢复框架。

0 日互动必须有 lock/cooldown/once 限制，防止无限刷。

---

# 13. Event Runtime

V1.2 不要求立刻废弃现有事件引擎，但最终运行态至少需要：

```ts
export interface EventRuntimeState {
  currentEventId: string | null
  queue: string[]
  history: string[]
  occurrences: Record<string, EventOccurrence>
}
```

普通 Event 与 FateGraph 的关系：

- Event 是叙事/交互载体；
- FateNode 决定某些重大 Event 何时有资格进入人生；
- Activity 可以触发普通 Event；
- World Schedule/NPC Milestone 也可以产生 Event；
- FateGraph 不等于 EventEngine 的替代品。

---

# 14. Chronicle V2

```ts
export interface ChronicleEntry {
  id: string
  startDay: number
  endDay?: number

  title: string
  locationId?: string

  narrative: string
  choiceText?: string
  check?: ChronicleCheckSummary

  changes: StateChange[]

  moodBefore?: MoodType
  moodAfter?: MoodType

  importance: 'routine' | 'notable' | 'major'
  sourceType: 'event' | 'activity' | 'npc' | 'world' | 'fate' | 'lifeStage'
  sourceId: string
}
```

## 14.1 Chronicle 只保存已经经历的人生

Chronicle 不允许保存：

- 未触发的未来命运；
- 玩家不知道的世界事件；
- FateGraph路径提示。

## 14.2 StateChange 为数值真源

数值变化由状态前后差异生成。

Chronicle narrative 可以写：

> 你花了一笔钱。

但不能独立硬编码：

> 灵石 -8

并让 effect 另存一份数值。

## 14.3 RoutineAccumulator

平淡重复活动先累计，再在合理节点 flush 成一条跨度传记。

示例：

```text
二十一至二十三岁 · 青石镇

三年间，你一直在仁和堂做事。从跑腿伙计，到后来已经能辨认常见灵草。

下品灵石 +21
悟性 +1
```

而不是记录几十条“谋生”。

---

# 15. Player View

建议最外层：

```ts
export interface PlayerViewModel {
  identity: PlayerIdentityView
  attributes: PlayerAttributeView
  resources: PlayerResourceView
  cultivation: PlayerCultivationView
  location: LocationView

  mood: MoodView
  conditions: ConditionView[]

  knownFutureEvents: KnownFutureEventView[]
  knownClues: KnownClueView[]
  npcViews: PlayerKnownNpcView[]

  availableActivities: ActivityView[]
  currentInteraction: InteractionView
  chronicle: ChronicleEntryView[]
}
```

明确禁止包含：

```text
world.schedule
FateGraph definition
未触发 FateNode
NPC隐藏 milestone
未知地点
未知线索
隐藏检定修正
```

原则：**如果某条数据没有进入 Player View，它就不能因为 UI 开发方便而被组件直接访问。**

---

# 16. Persistence 边界

## 16.1 V1 → V2

Stage 1 明确实现版本迁移。

旧 V1/V1.1：

```text
schemaVersion: 1
timeMonths
```

新 V2：

```text
schemaVersion: 2
worldDay
```

但 Stage 1 本身暂不把 active V1 人生转换成 V1.2 新人生语义。

规则：

- V1 archives 保留为 LegacyLifeRecord；
- V1 active run 封存为 LegacyLifeRecord，再清空 V2 currentSession；
- V1 debug log 保留为 legacy replay 数据；
- 不要求 V1 digest 在 V2 引擎重新计算后相等；
- V2 新人生继续完整确定性重放。

## 16.2 新存档 key

```text
restarting-life:v2
```

迁移成功前不得删除旧：

```text
restarting-life:v1
```

Stage 1 要求 migration 可安全重复尝试。

---

# 17. Session / Command 边界

V1.2 仍坚持 UI 发命令、Core 执行。

阶段开发过程中命令会逐渐从旧：

```ts
{ type: 'action'; action: 'explore' | 'livelihood' | 'cultivate' | 'breakthrough' }
```

过渡到更具体的：

```ts
{ type: 'activity'; activityId: string }
{ type: 'choice'; choiceId: string }
{ type: 'continue' }
```

最终不要让 UI 直接发送：

```text
加5灵石
推进3天
设置某Flag
```

这些都是 Core 解析 activity/event 后产生的 effect。

---

# 18. Stage 0 冻结的不变量

以下规则在 Stage 1 开始后视为冻结，若需改变必须先修改设计与技术文档：

1. 每次重开默认是不同的人，而不是同一角色常规轮回强化。
2. FateGraph 完整结构不对玩家公开。
3. 当前能力、资源、关系与风险判定对玩家透明到足以建立经验。
4. V1.2 世界时间唯一真源为 `worldDay`。
5. 固定半年行动制永久废弃。
6. Duration 首版只有 fixed/range。
7. 世界 schedule 与角色 knowledge 分离。
8. 只有角色知道的未来事项进入“近日所知”，并按时间排序。
9. NPC 首版只做里程碑，不做逐日模拟。
10. 大多数长活动一次性结算；只有 Stage 11 以后极少数 interrupt 可中断。
11. Chronicle 只记录已经经历的人生，不泄露未来命运。
12. Chronicle 数值变化来自实际 StateDelta。
13. 失败与错过是故事的一部分。
14. UI 不能直接读取隐藏世界真相。
15. 所有随机性保持 Seeded RNG 确定性。
16. V1 active run 不静默转换成 V1.2 新人生。
17. 第一条正式玩法验证只做“顾长安 · 无根问仙”，未通过试玩前不扩第二人物。

---

# 19. Stage 1 开工门槛

进入 Stage 1 前必须同时满足：

- `V1_2_GAME_DESIGN.md` 已冻结玩法边界；
- `V1_2_TECH_SPEC.md` 已冻结技术边界；
- `V1_2_DEV_ROADMAP.md` 已定义阶段顺序；
- 本文已冻结核心数据职责；
- 当前分支没有玩法代码修改；
- 后续严格按一阶段一分支/PR执行。

满足后，下一阶段只允许实现：

> **Stage 1：Save Schema V2 与 V1 Legacy 迁移。**

不得顺手开始 `worldDay`、Duration、FateGraph 或新剧情。