# Restarting Life V1.2 技术规格

> 文档性质：V1.2 技术契约。  
> 玩法真源：`V1_2_GAME_DESIGN.md`。  
> 开发原则：**先满足本文的数据边界和确定性，再实现内容。**

---

# 0. 技术总原则

1. 核心状态只由 Core Engine 修改，React UI 只提交命令并读取 Player View。
2. 所有随机性必须来自现有 Seeded RNG；Core 中禁止 `Math.random()`。
3. 世界只有一个时间源：`worldDay`。
4. 所有推进世界时间的行为最终只能经过 `advanceWorldTime()`。
5. UI 不得直接读取隐藏 FateGraph Runtime 或 World Schedule。
6. 玩家可见数据必须由 selector / presenter 明确投影。
7. Chronicle 运行时不调用 LLM；使用结构化数据 + 作者预写文本。
8. NPC 使用里程碑模拟，不进行逐日行为模拟。
9. 失败、错过、过期均是合法业务结果，不得作为异常抛出。
10. Save V1 → V2 必须显式迁移；不得静默把 V1 进行中的人生解释成 V1.2 新语义。
11. V1.2 新人生必须继续支持同 Seed + 同初态 + 同命令序列 = 同结果。

---

# 1. Schema Version

V1.2 正式使用：

```ts
schemaVersion: 2
```

适用于：

- `GameStateV2`；
- `PersistentGameV2`；
- V2 save envelope。

旧 V1/V1.1 实际存档结构继续视为 `schemaVersion: 1`。

---

# 2. 世界时间契约

## 2.1 唯一时间源

```ts
type WorldDay = number
```

要求：

- 非负安全整数；
- 1 年 = 360 日；
- 1 月 = 30 日；
- 12 月 = 1 年；
- 不使用 `Date` 存储规则时间。

```ts
export const DAYS_PER_MONTH = 30
export const MONTHS_PER_YEAR = 12
export const DAYS_PER_YEAR = 360
```

## 2.2 推荐 API

```ts
interface CalendarDate {
  year: number
  month: number // 1..12
  day: number   // 1..30
}

interface AgeParts {
  years: number
  months: number
  days: number
}

function advanceWorldTime(
  state: GameStateV2,
  days: number,
): WorldAdvanceResult

function getCalendarDate(worldDay: WorldDay): CalendarDate
function getAgeParts(birthDay: WorldDay, worldDay: WorldDay): AgeParts
function getSeason(worldDay: WorldDay): 'spring' | 'summer' | 'autumn' | 'winter'
function formatDuration(days: number): string
function formatAge(birthDay: WorldDay, worldDay: WorldDay): string
```

禁止：

```ts
state.worldDay += days
```

出现在业务模块中。

只有 Time/World Engine 内部可以直接构造新的 `worldDay`。

---

# 3. Duration 契约

V1.2 第一版只支持：

```ts
export type Duration =
  | {
      type: 'fixed'
      days: number
    }
  | {
      type: 'range'
      minDays: number
      maxDays: number
    }
```

约束：

- days 必须为非负安全整数；
- `range.minDays <= range.maxDays`；
- 范围值使用 Seeded RNG 解析一次；
- 解析后的实际耗时写入结果/调试日志；
- 暂不实现 `untilCondition`、`untilBreakthrough` 等无限条件时长。

```ts
function resolveDuration(
  duration: Duration,
  rngState: number,
): {
  days: number
  nextRngState: number
}
```

---

# 4. GameStateV2

建议正式结构：

```ts
interface GameStateV2 {
  schemaVersion: 2

  runId: string
  runSeed: string
  rngState: number

  status: 'playing' | 'dead' | 'won'
  worldDay: WorldDay

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

  knowledge: {
    futureEvents: KnownFutureEvent[]
    clues: KnownClue[]
  }

  npcs: Record<string, NpcRuntimeState>

  world: {
    schedule: WorldScheduledEvent[]
  }

  fate: FateRuntimeState

  activity: {
    active: ActiveActivity | null
    locks: ActivityLock[]
    routine: RoutineAccumulator[]
  }

  events: {
    currentEventId: string | null
    queue: string[]
    history: string[]
    occurrences: Record<string, EventOccurrence>
  }

  chronicle: ChronicleEntry[]

  endReason: string | null
}
```

说明：

- `world.schedule` 与 `fate` 是隐藏 Core State；
- `knowledge` 是角色已经知道的世界信息；
- UI 不得直接消费整个 `GameStateV2`；
- `attributes.base + permanentGrowth + derived modifiers` 计算有效属性。

---

# 5. PlayerIdentityV2

```ts
type Gender = 'male' | 'female'

interface PlayerIdentityV2 {
  name: string
  gender: Gender
  birthDay: WorldDay

  archetypeId: string
  birthPlaceId: string
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

首版不强制把完整家庭成员都塞入 `identity`；家庭成员如需参与世界，可作为 NPC 定义存在。

---

# 6. 属性派生

沿用 V1.1 的“不要重复存总值”原则。

```ts
interface StatBreakdown {
  base: number
  permanentGrowth: number
  realmGrowth: number
  conditionModifier: number
  moodModifier: number
  situationalModifier: number
  total: number
}

function getStatBreakdown(
  state: GameStateV2,
  stat: StatKey,
  context?: CheckContext,
): StatBreakdown

function getEffectiveStat(
  state: GameStateV2,
  stat: StatKey,
  context?: CheckContext,
): number
```

`spiritSense` 的境界成长由单一规则表生成，不得在 UI 重复实现。

---

# 7. KnownFutureEvent

## 7.1 数据结构

```ts
type KnowledgeConfidence =
  | 'certain'
  | 'credible'
  | 'rumor'
  | 'vague'

type KnownFutureStatus =
  | 'upcoming'
  | 'passed'
  | 'resolved'
  | 'invalidated'

interface KnownFutureEvent {
  id: string
  title: string
  description: string

  exactDay?: WorldDay
  earliestDay?: WorldDay
  latestDay?: WorldDay

  sourceText: string
  confidence: KnowledgeConfidence
  status: KnownFutureStatus

  learnedAtDay: WorldDay
}
```

约束：

- `exactDay` 与范围形式不能同时使用；
- 若使用范围，则 `earliestDay <= latestDay`；
- false rumor 可以只存在于 `knowledge.futureEvents`，不要求绑定真实 schedule；
- 后续更可靠情报可以 invalidated/replace 旧记录。

## 7.2 玩家排序

```ts
function selectKnownFutureEvents(state: GameStateV2): KnownFutureEventView[]
```

排序键：

1. `exactDay`；
2. 否则 `earliestDay`；
3. 同日按 learnedAtDay/id 稳定排序。

只返回角色已知且当前仍有展示意义的信息。

---

# 8. 隐藏 World Schedule

```ts
type WorldEventMode = 'deadline' | 'background' | 'interrupt'

interface WorldScheduledEvent {
  id: string
  eventDay: WorldDay
  mode: WorldEventMode
  resolverId: string
  status: 'scheduled' | 'resolved' | 'expired' | 'cancelled'
  tags?: string[]
}
```

注意：

- schedule 是世界真相；
- KnownFutureEvent 是角色认知；
- 二者不能在 UI 层混用；
- schedule 可以有玩家完全不知道的条目。

---

# 9. Player View 边界

UI 只允许读取显式投影。

推荐：

```ts
interface PlayerViewModel {
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
  currentInteraction: InteractionView
  chronicle: ChronicleEntryView[]
}

function selectPlayerView(state: GameStateV2): PlayerViewModel
```

`PlayerViewModel` 禁止包含：

- `world.schedule`；
- FateGraph 定义；
- 未触发 FateNode；
- 隐藏 NPC milestone；
- 未知关系或隐藏数值；
- 未被角色发现的地点/线索。

React 组件原则上消费 `PlayerViewModel` 或更窄 selector，不直接读取隐藏 Core State。

---

# 10. Location / Activity

## 10.1 LocationDefinition

```ts
interface LocationDefinition {
  id: string
  name: string
  description: string
  regionId: string
  danger: 'safe' | 'low' | 'medium' | 'high' | 'extreme'
  conditions?: Condition[]
  activityIds: string[]
}
```

首版不存坐标。

## 10.2 ActivityDefinition

```ts
interface ActivityDefinition {
  id: string
  name: string
  description: string
  locationIds: string[]

  duration: Duration
  knownCost?: ResourceCost[]
  knownRisk: 'safe' | 'low' | 'medium' | 'high' | 'extreme'

  conditions?: Condition[]
  outcomeResolverId: string

  interactionPolicy?:
    | 'repeatable'
    | 'oncePerVisit'
    | 'cooldown'
}
```

Activity 不是事件本身。

执行流程：

```text
choose activity
→ validate
→ resolve duration
→ create/execute activity
→ advanceWorldTime
→ resolve activity outcome
→ possibly activate event/fate node
```

具体先后顺序在阶段 3/6 的实现测试中冻结，但任何随机和时间都必须可重放。

---

# 11. ActiveActivity 与长行动

为阶段 11 的极少数 interrupt 预留结构：

```ts
interface ActiveActivity {
  id: string
  activityId: string
  startedAtDay: WorldDay
  plannedEndDay: WorldDay
  remainingDays: number
  payload?: Record<string, string | number | boolean>
}
```

阶段 3～10 可以让绝大多数活动一次性结算完整耗时。

阶段 11 引入 `interrupt` 时，只有真正命中 interrupt 才需要保留/恢复 `remainingDays`。

禁止在早期阶段提前实现通用协程/任务调度框架。

---

# 12. CheckEngine

## 12.1 类型

```ts
type CheckTier =
  | 'criticalSuccess'
  | 'success'
  | 'partialSuccess'
  | 'failure'
  | 'criticalFailure'

interface CheckModifier {
  id: string
  label: string
  value: number
  visibility: 'visible' | 'hidden'
}

interface CheckDefinition {
  id: string
  primaryStat: StatKey
  target: number
  modifiers: CheckModifierRule[]
  rngBand: number
}

interface CheckResult {
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

## 12.2 玩家透明范围

玩家应看到：

- 主属性当前值；
- 目标/推荐值；
- 可见修正；
- 风险描述。

玩家默认不看：

- 精确 RNG roll；
- 隐藏 Fate modifier；
- 未知环境真相。

Debug Log 可以保存完整 roll。

## 12.3 唯一随机入口

```ts
function resolveCheck(
  state: GameStateV2,
  definition: CheckDefinition,
  context: CheckContext,
): {
  result: CheckResult
  nextRngState: number
}
```

任何检定不得在 UI 或内容文件里自行调用随机函数。

---

# 13. FateGraph

## 13.1 定义

```ts
interface FateGraphDefinition {
  id: string
  archetypeIds: string[]
  nodes: FateNodeDefinition[]
}

interface FateNodeDefinition {
  id: string
  eventId: string
  conditions: FateCondition[]
  once: boolean
  priority: number
  intensity: 0 | 1 | 2 | 3 | 4
}
```

## 13.2 首版 FateCondition

首版只允许数据化白名单：

```ts
type FateCondition =
  | { type: 'worldDayMin'; day: number }
  | { type: 'worldDayMax'; day: number }
  | { type: 'ageMinDays'; days: number }
  | { type: 'ageMaxDays'; days: number }
  | { type: 'location'; locationId: string }
  | { type: 'realm'; realm: Realm }
  | { type: 'stageMin'; stage: number }
  | { type: 'statMin'; stat: StatKey; value: number }
  | { type: 'statMax'; stat: StatKey; value: number }
  | { type: 'resourceMin'; resource: 'spiritStones' | 'cultivation'; value: number }
  | { type: 'relationshipMin'; npcId: string; value: number }
  | { type: 'hasTag'; tag: string }
  | { type: 'notTag'; tag: string }
  | { type: 'flagEquals'; key: string; value: boolean | number | string }
  | { type: 'flagMissing'; key: string }
  | { type: 'eventOccurred'; eventId: string }
  | { type: 'elapsedSinceEvent'; eventId: string; days: number }
  | { type: 'knowsClue'; clueId: string }
  | { type: 'npcStatus'; npcId: string; status: NpcStatus }
```

禁止内容数据包含任意函数。

## 13.3 Runtime

```ts
interface FateRuntimeState {
  triggeredNodeIds: string[]
  completedNodeIds: string[]
  blockedNodeIds: string[]
}
```

Fate Runtime 仅 Core 可见。

---

# 14. NPC Milestone

## 14.1 Runtime

```ts
type NpcStatus =
  | 'alive'
  | 'injured'
  | 'missing'
  | 'departed'
  | 'dead'

interface NpcRuntimeState {
  id: string
  birthDay: WorldDay
  status: NpcStatus

  realm: Realm
  stage: number

  relationship: number

  flags: Record<string, boolean | number | string>

  nextMilestoneId: string | null
  nextMilestoneDay: WorldDay | null
}
```

## 14.2 Definition

```ts
interface NpcMilestoneDefinition {
  id: string
  npcId: string
  conditions?: FateCondition[]
  resolverId: string
  mode: 'background' | 'interrupt'
}
```

NPC 不执行逐日修炼。

到 milestone 时一次性根据：

- NPC 固有条件；
- 玩家过去影响；
- 当前世界状态；
- Seeded RNG；

结算里程碑。

---

# 15. Mood / StatusCondition

## 15.1 Mood

```ts
type MoodType =
  | 'calm'
  | 'joyful'
  | 'hopeful'
  | 'inspired'
  | 'anxious'
  | 'low'
  | 'grieving'
  | 'afraid'
  | 'obsessed'

interface MoodState {
  type: MoodType
  intensity: 1 | 2 | 3
  expiresAtDay: WorldDay | null
}
```

首版同一时刻只保存一个主心境，不建立多维情绪模拟。

## 15.2 StatusCondition

```ts
interface StatusCondition {
  id: string
  type: string
  intensity: 1 | 2 | 3
  startedAtDay: WorldDay
  expiresAtDay: WorldDay | null
  sourceId: string
}
```

条件效果通过白名单 resolver/definition 获取，不把任意业务函数塞进 save。

---

# 16. Chronicle V2

```ts
interface ChronicleEntry {
  id: string

  startDay: WorldDay
  endDay?: WorldDay

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

`StateChange[]` 继续由实际前后状态差构造，不让作者重复手写数值真相。

## 16.1 RoutineAccumulator

```ts
interface RoutineAccumulator {
  key: string
  activityId: string
  locationId: string

  startedAtDay: WorldDay
  lastAtDay: WorldDay

  occurrenceCount: number
  totalDays: number

  baseline: OutcomeSnapshotV2
  latestNarrativeVariantId?: string
}
```

Flush 条件至少支持：

- 地点变化；
- 身份变化；
- 重大 Fate/Event；
- 累计时间超过内容定义阈值；
- 人生结束。

---

# 17. World Advance

推荐结果：

```ts
interface WorldAdvanceResult {
  state: GameStateV2
  elapsedDays: number
  processedWorldEventIds: string[]
  processedNpcMilestoneIds: string[]
  expiredKnowledgeIds: string[]
  interrupt: WorldInterrupt | null
}
```

阶段 3 初版可先只处理：

- 日期；
- 寿元；
- condition/mood expiry。

后续阶段依次把：

- KnownFuture expiry；
- NPC milestone；
- World schedule；
- Fate refresh；

接入同一入口。

不允许后续模块各自重新实现一套时间推进。

---

# 18. Command 模型

V1.2 最终建议命令族：

```ts
type SessionCommandV2 =
  | { type: 'chooseActivity'; activityId: string }
  | { type: 'chooseEventOption'; choiceId: string }
  | { type: 'continueResult' }
  | { type: 'chooseTravel'; locationId: string }
  | { type: 'resumeActivity' }
```

注意：

- 不是所有命令在阶段 1 就实现；
- 命令只能表达玩家意图；
- 真实耗时、检定、结果由 Core 决定；
- UI 不把结果数值作为命令参数传回 Core。

---

# 19. Debug Log V2

```ts
interface DebugLogEntryV2 {
  seq: number
  command: SessionCommandV2

  worldDayBefore: WorldDay
  worldDayAfter: WorldDay

  eventIdBefore: string | null
  eventIdAfter: string | null

  rngBefore: number
  rngAfter: number

  effectTypes: string[]
  checkResults?: CheckResult[]
  processedWorldEventIds?: string[]
  processedNpcMilestoneIds?: string[]

  stateDigestBefore: string
  stateDigestAfter: string
}
```

旧 V1 DebugLog 不要求在 V2 引擎重新得到同一 digest。

---

# 20. Save V2 与迁移策略

## 20.1 Save Key

建议使用：

```text
restarting-life:v2
```

迁移成功后可以保留 V1 key 一段时间用于安全回退；不得在迁移事务完成前删除 V1 数据。

## 20.2 PersistentGameV2

```ts
interface PersistentGameV2 {
  schemaVersion: 2
  currentSession: GameSessionV2 | null
  archives: Array<LifeRecordV2 | LegacyLifeRecord>
  meta: {
    totalRuns: number
  }
}
```

## 20.3 V1 → V2 数据处理

确定性转换：

```text
old timeMonths × 30 → worldDay
```

历史 archive：

- 保留原 identity/stats/resources/cultivation/eventHistory/summary/debugLog；
- 包装为 `LegacyLifeRecord`；
- 原始字段尽量原样保留用于查看。

V1 正在进行的人生：

- **不静默继续套用 V1.2 新命运语义**；
- 保存为 `LegacyLifeRecord`，标记 `migrationReason: 'v2_schema_upgrade'`；
- `currentSession` 置空；
- 玩家进入 V1.2 后开始一个真正的新 V2 人生。

这样避免为了兼容旧随机事件人生而永久维护两套核心循环。

## 20.4 Legacy Replay

V1 DebugLog：

- 可查看；
- 可导出/保留；
- 标记 legacy；
- 不要求由 V2 引擎重新执行。

V2 新人生：

- 必须继续完整可重放。

---

# 21. 内容数据完整性检查

V1.2 需要静态验证：

- ID 唯一；
- Location 引用存在；
- Activity 引用存在；
- FateNode eventId 存在；
- NPC milestone 引用存在；
- Known clue/source 引用存在；
- Duration 合法；
- World schedule 日期合法；
- Check target 合法；
- Chronicle 作者文本存在；
- decision event 必须存在真正选择；
- routine 节点不得伪装成单按钮重大选择；
- 所有数值 effect 使用统一单位；
- 核心中无 `Math.random()`。

---

# 22. 自动测试最低要求

每阶段均需保留旧回归并新增对应测试。

最终至少覆盖：

## Time

- 360 日 = 1 年；
- 30 日 = 1 月；
- age/date/season 边界；
- worldDay 非法输入；
- 寿元临界日。

## Duration

- fixed；
- range 同 seed 可复现；
- range 边界。

## Save

- V1 正常档迁移；
- V1 进行中档转 Legacy；
- V1 archive 保留；
- V2 save/load checksum；
- 损坏档拒绝。

## Knowledge

- 未知 schedule 不可进入 Player View；
- KnownFuture 按日期排序；
- rumor 范围展示；
- invalidated 不显示为有效未来事项。

## Fate

- 条件满足才触发；
- once 不重复；
- elapsedSinceEvent 正确；
- UI 投影不泄露未触发 node。

## Check

- 同 seed 同结果；
- modifier 生效；
- 五档映射正确；
- hidden modifier 不泄露给 Player View。

## NPC

- worldDay 越过 milestone 时结算；
- 玩家未互动 NPC 仍变化；
- NPC 隐藏 milestone 不泄露。

## Chronicle

- 选择/检定/StateDelta 正确写入；
- routine 合并；
- end-of-life flush。

---

# 23. 性能边界

V1.2 仍是单机纯前端小型模拟，不需要为了“未来可能很大”提前引入数据库或复杂 ECS。

首版目标数据规模：

- 核心 NPC：4～6；
- 地点：≤ 8；
- FateNode：第一人物 20～40；
- World Schedule 同时活跃：几十条以内；
- Chronicle：单人生数十至数百条结构化记录；
- KnownFuture：通常个位数至十几条。

在这个规模下，直接 TypeScript 数据结构和数组筛选足够。

禁止提前优化成：

- 图数据库；
- Redux/复杂全局状态框架；
- Worker 多线程模拟；
- 服务端调度器；
- 可视化剧情编辑器。

---

# 24. 阶段边界

V1.2 技术实现顺序固定为：

```text
Stage 0 规格冻结
Stage 1 Save Schema V2
Stage 2 worldDay 时间迁移
Stage 3 Duration + advanceWorldTime
Stage 4 Chronicle V2
Stage 5 KnownFutureEvent
Stage 6 Location + Activity
Stage 7 CheckEngine
Stage 8 FateGraph
Stage 9 NPC Milestone
Stage 10 Mood + StatusCondition
Stage 11 World Schedule modes
Stage 12 Narrative Director Lite
Stage 13 顾长安16～25岁
Stage 14 强制试玩修正
Stage 15 顾长安完整人生
Stage 16 第二人物
Stage 17+ 扩内容
```

任何阶段不得为了“顺手”提前实现下两个阶段的系统。

---

# 25. 最终不可违反的技术红线

1. 不允许固定“所有行动 +6个月”。
2. 不允许业务代码直接写 `worldDay`。
3. 不允许 UI 读取 `world.schedule` 或 Fate Runtime。
4. 不允许 `Math.random()` 进入 Core。
5. 不允许 NPC 逐日 AI 模拟进入 V1.2 第一版。
6. 不允许运行时依赖 LLM 生成 Chronicle。
7. 不允许把失败当错误状态吞掉。
8. 不允许为了兼容 V1 replay 永久保留两套主循环。
9. 不允许活动定义同时重复手写真实数值结果和 effect 数值。
10. 不允许没有阶段验收就大规模扩剧情。
