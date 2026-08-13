# Restarting Life V1.1：修仙人生体验重构策划与技术规格

> 文档性质：V1.1 单一功能基线（Single Source of Truth）  
> 适用仓库：`baileykv75-netizen/Restarting-life`  
> 前置版本：V1 已完成技术闭环、GitHub Pages 部署、Seeded RNG、存档与重放、53 个正式事件  
> V1.1 核心目标：**不扩境界上限，不引入复杂战斗/装备/炼丹系统，优先把“问卷式随机事件”重构成“能记住的一名修士的一生”。**

---

# 0. 文档使用规则

1. 本文是 V1.1 的唯一玩法与技术基线。V1.1 开发前先修改本文，再修改代码。
2. Codex/LLM 不得自行发明本文未定义的新核心系统、数值尺度或状态字段。
3. 每一阶段必须独立提交、独立 CI、独立体验验收；未通过不得进入下一阶段。
4. V1 已验证可用的技术基础必须保留：Seeded RNG、纯前端、localStorage、可重放、UI 不直接修改 GameState、完整事务后再存档。
5. V1.1 的完成标准不再只是“测试全绿”，还必须满足事件多样性、选择反馈、角色成长感、NPC 记忆度和传记可读性指标。
6. 禁止一次性生成 100～200 个事件。正式内容必须在事件引擎 V2 和第一条纵向切片验证好玩后再扩充。

---

# 1. V1.1 产品目标

## 1.1 核心体验

玩家每一世都应形成可复述的人生：

> 我是谁 → 我主动选择怎样活 → 世界回应我 → 我因此获得/失去具体东西 → 人和关系发生变化 → 旧选择在多年后回来 → 境界改变我的能力和世界位置 → 死亡或结丹 → 带着知识进入下一世。

V1.1 必须从下列旧循环：

```text
点击行动 → 随机抽事件 → 点一个按钮 → 页面立即跳走 → 再点行动
```

升级为：

```text
选择人生方向
→ 选择具体行动/地点/策略
→ 发生与当前身份和历史相关的事件
→ 做出有代价的选择
→ 看到明确结果
→ 数值、关系、状态和因果改变
→ 重大事件写入传记
→ 后续事件读取这些历史继续发展
```

## 1.2 V1.1 明确不做

- 元婴及以上境界；
- 回合制战斗系统；
- 装备栏、复杂法宝；
- 完整炼丹/炼器/阵法/符箓系统；
- NPC 自由文本对话；
- LLM API；
- 开放世界自由移动；
- 多宗门政治模拟；
- 服务器、登录、云存档。

V1.1 的复杂度主要来自：

**行动策略 × 地点 × 境界 × NPC × 属性 × 资源 × 历史事件 × 前世知识。**

---

# 2. V1 当前问题与 V1.1 验收指标

## 2.1 当前主要问题

1. 同一环境事件高频重复，几十乃至上百次选择后仍反复出现相同标题。
2. 大量事件只有一个按钮，属于“伪选择”。
3. 选择后无结果页，玩家不知道实际得到/失去什么。
4. 灵石等资源叙事与数值尺度脱节。
5. 根骨、悟性、神识、心性、气运长期几乎不体现境界成长。
6. “历练/修炼/任务”是抽事件按钮，而不是玩家主动安排修士生活。
7. NPC 只像事件素材，没有持续人生。
8. “此世纪年”记录大量重复事件标题，不像修士传记。
9. 前世档案主要是结果记录，没有进入下一世的玩法。

## 2.2 V1.1 体验硬指标

在最终验收阶段，使用至少 20 个固定 Seed 自动模拟，并人工试玩至少 3 世：

- 前 30 次事件中，**不同事件 ID 占比 ≥ 75%**；
- 同一非行为型事件一世默认最多出现 1 次；
- 可重复环境事件在最近 12 次事件内不得再次出现同一 variant；
- 任意 20 次事件窗口内，同一标题不得出现超过 2 次；
- 关键选择 100% 有结果叙事和量化变化；
- 关键决策事件原则上 ≥ 2 个可选项；
- 一世至少形成 5 个“重大传记节点”或在早死情况下按年龄比例降低；
- 一世至少有 2 个核心 NPC 产生二次以上后续互动；
- 炼气一层、炼气九层、筑基三个阶段的有效神识必须有明显差距；
- 玩家看到任何灵石变化时必须是明确整数；
- 第二世开始至少能出现一类由前世知识解锁的特殊选项。

---

# 3. 技术总体原则

V1.1 继续使用：

- React
- TypeScript
- Vite
- Vitest
- localStorage
- Seeded RNG
- GitHub Actions
- GitHub Pages

继续禁止：

- 核心规则中使用 `Math.random()`；
- UI 直接写 `GameState`；
- 事件数据包含任意可执行函数；
- 随意内联复杂业务逻辑；
- 在文字叙事中写一个数值、在 effect 中执行另一个数值。

新增核心原则：

> **所有可显示的数值反馈由“实际状态差值”计算，而不是手写重复一份结果数字。**

事件作者只写结果叙事和 effect；系统根据执行前后状态生成 `StateChange[]`，避免“文案说 +5 灵石、代码实际 +3”的双重数据源。

---

# 4. GameState V2 数据模型

V1.1 将存档 schema 升级到 `schemaVersion: 2`。

建议结构：

```ts
interface GameStateV2 {
  schemaVersion: 2
  runId: string
  runSeed: string
  rngState: number

  status: 'playing' | 'dead' | 'won'
  timeMonths: number

  identity: {
    name: string
    backgroundId: string
    spiritRootId: string
    talentIds: string[]
    faction: 'mortal' | 'qingyun' | 'loose'
    rankId: string | null
    masterNpcId: string | null
  }

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

  conditions: StatusCondition[]
  tags: string[]
  flags: Record<string, boolean | number | string>

  npcs: Record<string, NpcRuntimeState>

  activity: {
    counters: Record<string, number>
  }

  events: {
    currentEventId: string | null
    queue: string[]
    history: string[]
    occurrences: Record<string, EventOccurrence>
  }

  interaction: {
    pendingResult: ResolvedOutcome | null
  }

  chronicle: ChronicleEntry[]

  endReason: string | null
}
```

## 4.1 不再直接存储最终属性值

V1 的 `stats` 改为：

- `base`：出生与先天天赋确定；
- `permanentGrowth`：后天永久成长；
- 境界加成：运行时推导；
- 状态/经历临时加成：运行时推导。

统一接口：

```ts
getStatBreakdown(state, stat): StatBreakdown
getEffectiveStat(state, stat): number
```

```ts
interface StatBreakdown {
  base: number
  permanentGrowth: number
  realmGrowth: number
  conditionModifier: number
  total: number
}
```

这样 UI 可展示：

```text
神识 17
先天 4
境界 +9
后天修炼 +4
```

而不会重复存储 `17`。

---

# 5. 五属性技术与数值规则

## 5.1 根骨 Constitution

定位：**先天修炼资质/肉身承载潜力**。

- 正常修炼和小境界提升不自动增加；
- 出生通常 1～10；
- V1.1 普通人生中永久变化总量建议控制在 -2～+3；
- 只有洗髓、重塑灵根、重大伤损等明确事件允许变化；
- 普通受伤不得直接减根骨，改用 `conditions` 表示。

## 5.2 悟性 Comprehension

定位：**理解、参悟、学习能力**。

- 出生为主；
- 可通过参悟功法、师父指点、重大顿悟缓慢增加；
- 普通事件禁止频繁 `悟性 +1`；
- 一世后天成长建议通常不超过 +5。

## 5.3 神识 Spirit Sense

定位：**必须随修为层次成长的核心修仙能力**。

V1.1 初始境界推导表：

| 境界 | 境界神识加成 |
|---|---:|
| 凡人 | +0 |
| 炼气1层 | +1 |
| 炼气2层 | +2 |
| 炼气3层 | +3 |
| 炼气4层 | +4 |
| 炼气5层 | +5 |
| 炼气6层 | +6 |
| 炼气7层 | +7 |
| 炼气8层 | +8 |
| 炼气9层 | +9 |
| 筑基初期 | +14 |
| 筑基中期 | +18 |
| 筑基后期 | +22 |
| 金丹 | +30（结局展示） |

此外“温养神识”等专门行动可增加 `permanentGrowth.spiritSense`。

## 5.4 心性 Mentality

定位：**承受闭关、失败、杀伐、心魔与长期选择的能力**。

- 不随每层境界自动增长；
- 长期修炼、失败后坚持、重大失去、杀戮等改变；
- 同一类日常事件不得反复刷心性；
- 心性可正向也可负向变化。

## 5.5 气运 Luck

定位：**命格型稀缺属性**。

- 出生为主；
- 普通事件禁止频繁增加；
- 奇遇权重可读取气运；
- 临时好运/厄运优先通过 Flag 或 condition 表示，而不是永久改气运；
- 一世永久变化通常控制在 -2～+2。

---

# 6. 境界成长与修炼系统 V2

## 6.1 保留境界

```text
凡人
→ 炼气1～9层
→ 筑基初期
→ 筑基中期
→ 筑基后期
→ 金丹（V1.1 结局）
```

## 6.2 修炼不再只有一个按钮

顶层仍保留“修炼”，进入二级策略：

### A. 吐纳修炼 `qi_breathing`

- 时间：6 个月；
- 无灵石成本；
- 稳定获得修为；
- 小概率进入修炼类事件；
- 适合资源不足时。

### B. 长期闭关 `seclusion`

- 时间：12 个月；
- 修为收益高于两次普通吐纳约 5～10%；
- 更容易出现瓶颈、顿悟、心境事件；
- 不能在严重伤势状态使用。

### C. 参悟功法 `comprehend`

- 时间：6 个月；
- 修为收益约普通吐纳的 40～60%；
- 主要读取悟性；
- 有机会增加悟性、心性或得到修炼效率 Flag；
- 不保证每次成长。

### D. 温养神识 `nurture_spirit`

- 时间：6 个月；
- 修为收益约普通吐纳的 30～50%；
- 累积神识修炼计数；
- 达到阈值后永久神识 +1；
- 同一境界设置成长上限，禁止无限刷。

### E. 租用灵气静室 `spirit_chamber`

- 时间：6 个月；
- 成本：下品灵石 6；
- 修为收益：普通吐纳 ×1.4；
- 资源不足时选项不显示或禁用并明确原因。

## 6.3 修为公式

沿用 V1 的“基础收益 × 属性 × 灵根 × 境界”思路，但 V1.1 统一以 6 个月为基础周期：

```text
baseGain6m = 28
attributeFactor = 1 + (根骨 + 悟性 - 10) × 0.03
rootFactor = 灵根倍率
realmFactor = 境界修炼倍率
modeFactor = 修炼策略倍率
最终修为 = round(baseGain6m × attributeFactor × rootFactor × realmFactor × modeFactor)
```

不得把神识、心性、气运全部塞进基础修炼公式，避免所有属性同质化。

---

# 7. 资源与经济系统

## 7.1 货币只保留“下品灵石”

V1.1 UI 与文案统一称：

**下品灵石**

底层字段继续可用 `spiritStones: number`。

禁止以下没有量化含义的资源文案：

- 一些灵石
- 少量灵石
- 若干灵石
- 碎灵石（除非明确写“折算为下品灵石 +1”，否则不使用）

## 7.2 初始经济尺度

| 行为/资源 | V1.1 初始数值 |
|---|---:|
| 低风险外门杂务 | +2～4 灵石 |
| 普通宗门巡查 | +4～6 灵石 |
| 有风险宗门任务 | +6～10 灵石 |
| 普通散修委托 | +3～7 灵石 |
| 高风险护送/采药 | +6～12 灵石 |
| 灵气静室半年 | -6 灵石 |
| 一次普通信息/小机缘购买 | -2～5 灵石 |
| 较强修炼帮助 | -8～15 灵石 |
| 重大机缘门槛 | 20～50 灵石级别 |

以上是 V1.1 初始平衡基线，后续只能通过模拟和试玩整体调整，不允许单事件任意创造数量级。

## 7.3 不新增复杂背包

V1.1 仍不做完整物品栏。

丹药、灵草、功法等优先采用：

- 立即消费；
- Flag；
- Tag；
- 单一计数器；

而不是引入通用 Inventory 系统。

---

# 8. 行动系统 V2

顶层行动从“抽卡按钮”升级为“人生方向入口”。

## 8.1 修炼

见第 6 节。

## 8.2 历练

点击“外出历练”后必须先选地点。

V1.1 第一批地点：

### 青云宗周边

- 风险低；
- 同门/NPC/宗门生活事件多；
- 适合炼气初期。

### 黑风山

- 风险中高；
- 妖兽、采药、古洞、陈宇线、李青线；
- 炼气阶段主要历练区。

### 青霞坊市

- 风险低；
- 灵石交易、散修、人情、消息、委托；
- 资源和关系事件多。

### 古修秘境

- 默认锁定；
- 必须由事件/Flag 解锁；
- 进入前明确风险；
- V1.1 只做一座秘境，不扩开放地图。

## 8.3 生计/任务

根据身份提供二级选项。

### 凡人

- 谋生：推进时间，不产生灵石；
- 打听仙闻：低收益、高求仙事件权重；
- 山中采集：有小风险，可触发仙缘。

### 青云宗弟子

- 外门杂务：2个月，+2～4灵石，低风险；
- 宗门巡查：3个月，+4～6灵石，中风险；
- 山中任务：3个月，+6～10灵石，高风险；
- 师门事务：满足师父关系后开放，收益不一定是灵石。

### 散修

- 坊市委托：2～3个月，+3～7灵石；
- 护送：3个月，+6～10灵石；
- 采药：2～3个月，收益波动较大；
- 打听消息：消耗少量灵石，提升特定地点/奇遇权重。

## 8.4 突破

保留“突破”为独立顶层行动，但突破事件升级为：

```text
突破准备
→ 是否投入资源/寻求帮助
→ 尝试突破
→ 结果页
→ 成功/失败后的后续状态
```

筑基、结丹必须至少提供两种准备路径：

- 直接突破；
- 消耗灵石/关系/特殊 Flag 提高稳定性。

---

# 9. Event V2 数据契约

## 9.1 事件类型

```ts
type EventKind =
  | 'ambient'
  | 'resource'
  | 'cultivation'
  | 'npc'
  | 'identity'
  | 'location'
  | 'chain'
  | 'milestone'
  | 'legacy'
```

## 9.2 GameEventV2

```ts
interface GameEventV2 {
  id: string
  title: string
  kind: EventKind
  text: string

  importance: 'filler' | 'normal' | 'major' | 'legendary'
  weight: number

  trigger: {
    actions?: ActionId[]
    locations?: LocationId[]
    realms?: Realm[]
    factions?: Faction[]
  }

  conditions?: Condition[]

  repeat: {
    mode: 'once' | 'repeatable'
    cooldownEvents?: number
    cooldownMonths?: number
    maxOccurrences?: number
    variantGroup?: string
  }

  chronicle?: {
    mode: 'none' | 'onResolve' | 'majorOnly'
  }

  npcIds?: string[]
  choices: EventChoiceV2[]
}
```

## 9.3 EventChoiceV2

```ts
interface EventChoiceV2 {
  id: string
  text: string
  conditions?: Condition[]
  effects: Effect[]

  result: {
    text: string
    consequenceHint?: string
  }

  nextEventId?: string
}
```

## 9.4 伪选择禁令

事件分为两类：

### `decision`

必须至少有 2 个实际可用选择，除非第二选项因为明确条件未满足而隐藏。

### `resolution/continuation`

如果剧情只有一个合理结果，不展示“假按钮”。直接作为结果页或叙事节点，唯一按钮固定为“继续”。

不得出现：

```text
事件：下雨了
选项：躲雨
```

这种内容应直接作为环境叙事/结果，不作为决策事件。

---

# 10. 选择结果反馈系统

## 10.1 新交互状态

所有 action/choice 执行后都可以进入：

```ts
interaction.pendingResult: ResolvedOutcome | null
```

```ts
interface ResolvedOutcome {
  sourceType: 'action' | 'event' | 'breakthrough'
  sourceId: string
  title: string
  narrative: string
  changes: StateChange[]
  consequenceHints: string[]
  nextEventId: string | null
}
```

## 10.2 StateChange 自动生成

```ts
type StateChange =
  | { type: 'spiritStones'; delta: number }
  | { type: 'cultivation'; delta: number }
  | { type: 'time'; months: number }
  | { type: 'stat'; stat: StatKey; delta: number }
  | { type: 'realm'; from: RealmStage; to: RealmStage }
  | { type: 'relationship'; npcId: string; delta: number }
  | { type: 'condition'; action: 'add' | 'remove'; conditionId: string }
  | { type: 'unlock'; label: string }
```

由 `diffGameState(before, after)` 生成。

## 10.3 隐藏因果

并非所有 Flag 都显示给玩家。

Effect 增加可选展示级别：

```ts
visibility?: 'public' | 'hint' | 'hidden'
```

- `public`：明确显示数值/关系变化；
- `hint`：只显示“这段因果似乎尚未结束”；
- `hidden`：不显示。

## 10.4 新命令

SessionCommand 增加：

```ts
{ type: 'continue' }
```

规则：

- 有 `pendingResult` 时，action/choice 全部锁定；
- 玩家点击“继续”后清除结果；
- 若有 queued event，再激活下一事件；
- 页面刷新后结果页仍必须存在，不能丢失。

---

# 11. 防重复与事件调度系统

## 11.1 EventOccurrence

```ts
interface EventOccurrence {
  count: number
  lastEventSeq: number
  lastTimeMonths: number
}
```

## 11.2 默认重复策略

### 重大剧情/NPC链

```text
mode = once
```

### 普通环境事件

```text
mode = repeatable
cooldownEvents = 12
maxOccurrences = 2～3
```

### 行为型事件

允许重复，但必须通过 `variantGroup` 管理变体。

例如：

```text
black_wind_rain_early
black_wind_rain_companion
black_wind_rain_spirit_trace
black_wind_rain_foundation_insight
```

共享：

```text
variantGroup = black_wind_rain
```

同组默认最近 6 次地点事件内不得再次出现。

## 11.3 抽取权重修正

最终权重：

```text
finalWeight = baseWeight
× luckModifier
× historyModifier
× npcModifier
× locationModifier
```

不得让气运直接“必出奇遇”，只能影响权重。

## 11.4 无事件保护

若当前上下文没有合格事件：

- 不得重复强行抽最近出现事件；
- 返回标准化“平稳度过”结果；
- 平稳结果不进入正式 eventHistory；
- 记录 activity counter 即可。

---

# 12. NPC 人生系统

V1.1 第一批核心 NPC 控制在 8～12 人。

## 12.1 NpcDefinition 静态数据

```ts
interface NpcDefinition {
  id: string
  name: string
  role: string
  personalityTags: string[]
  initialRealm: RealmStage
  ageAtPlayer16Months: number
  goals: string[]
}
```

## 12.2 NpcRuntimeState

```ts
interface NpcRuntimeState {
  relationship: number
  status: 'alive' | 'dead' | 'missing' | 'left'
  realm: Realm
  stage: number
  flags: Record<string, boolean | number | string>
  lastInteractionMonth: number | null
}
```

NPC 年龄不单独每月更新，采用：

```text
当前年龄 = ageAtPlayer16Months + (playerTimeMonths - 16岁月数)
```

## 12.3 NPC 境界推进

V1.1 不做全自动 NPC AI。

NPC 境界和人生节点由：

- 时间条件；
- 玩家历史；
- NPC 长期事件链；

驱动更新。

## 12.4 关系数值范围

统一：

```text
-100 ～ +100
```

关系语义：

| 数值 | 含义 |
|---|---|
| -100~-60 | 死敌 |
| -59~-20 | 敌视 |
| -19~19 | 普通/陌生 |
| 20~49 | 熟识 |
| 50~79 | 亲近 |
| 80~100 | 生死之交/极深关系 |

一次普通选择建议变化 3～10；重大救命/背叛可 15～40。

## 12.5 第一批核心 NPC

至少包含：

- 李青：同门/朋友长期线；
- 师父：师承/指导/传承线；
- 陈宇：竞争/敌对长期线；
- 坊市散修陈玄：散修人脉线；
- 青云宗执事：身份/任务线；
- 黑风山药农或采药人：地点线；
- 秘境相关前辈/残魂：古修线；
- 一名与玩家出身有关的凡人关系角色。

不得让 NPC 仅出现一次。

---

# 13. 第一批长期事件链规格

V1.1 第一批先做 4 条纵向切片，每条 5～7 节。

## 13.1 李青友情线

节点示例：

1. 炼气初期相识；
2. 共同任务；
3. 李青受伤/是否帮助；
4. 筑基前的分歧；
5. 黑风山重大事件；
6. 回报、死亡或疏远结局。

至少 3 种结局：

- 生死之交；
- 普通同门；
- 死亡/关系断裂。

## 13.2 师父传承线

1. 被注意；
2. 指点；
3. 是否承担师门事务；
4. 筑基帮助；
5. 师父晚年/失踪；
6. 传承或错失。

## 13.3 陈宇恩怨线

不得写成“固定反派”。

玩家可：

- 退让；
- 竞争；
- 结仇；
- 互相认可；
- 彻底解决。

## 13.4 古修洞府线

必须同时服务：

- 地点记忆；
- 神识/悟性检查；
- 前世记忆；
- 高风险高收益。

第一世可以因错误选择死亡；第二世可出现前世知识选项。

---

# 14. “此世纪年”重构为 Chronicle

## 14.1 ChronicleEntry

```ts
interface ChronicleEntry {
  id: string
  timeMonths: number
  importance: 'minor' | 'major' | 'legendary'
  title: string
  text: string
  relatedNpcIds?: string[]
  relatedLocationId?: string
  sourceEventId?: string
}
```

## 14.2 哪些内容进入传记

自动进入：

- 得遇仙缘；
- 入宗/成为散修；
- 引气入体；
- 炼气关键层级（建议 1、4、7、9）；
- 筑基；
- 金丹；
- 拜师；
- 核心 NPC 生死/重大关系变化；
- 长期事件链关键节点；
- 秘境、重大伤亡、重大机缘。

禁止直接进入：

- 普通暴雨；
- 山泉歇脚；
- 重复巡山；
- 普通吐纳；
- 普通坊市委托。

## 14.3 日常活动折叠

使用 `activity.counters` 记录：

```text
black_wind_explore = 7
sect_patrol = 4
qi_breathing = 12
```

终局总结可以生成：

> 你曾七入黑风山，四次为宗门巡查山道。

但不在右侧时间线刷 11 行。

---

# 15. 前世知识系统

## 15.1 核心原则

**前世继承信息，不直接继承大量属性。**

## 15.2 PersistentGame V2

```ts
interface PersistentGameV2 {
  schemaVersion: 2
  currentSession: GameSessionV2 | null
  archives: LifeRecordV2[]
  meta: {
    totalRuns: number
    knowledgeFlags: string[]
    discoveredSecrets: string[]
  }
}
```

## 15.3 运行时快照

为了保证重放确定性，新一世创建时把当时的前世知识复制进 Session：

```ts
session.legacySnapshot = {
  knowledgeFlags: [...persistent.meta.knowledgeFlags]
}
```

本世事件条件只读取 snapshot，不读取会在本世结束后继续变化的外部 meta。

## 15.4 前世知识示例

第一世：

```text
古洞左侧石碑禁制爆发 → 死亡
```

归档后写入：

```text
knowledge:ancient_cave_left_stele_danger
```

下一世对应事件增加：

```text
【似曾相识】不要靠近左侧石碑
```

该选项可以避免死亡或进入新分支。

---

# 16. 内容规模与写作规范

## 16.1 开发阶段内容规模

### 第一轮纵向切片

只写约 35～45 个高质量事件节点：

- 青云宗生活；
- 黑风山；
- 青霞坊市；
- 李青；
- 师父；
- 陈宇；
- 古修洞府。

通过试玩后才扩充。

### V1.1 最终目标

- 日常/环境/生活：70～90 节点；
- 修炼/宗门/坊市：50～60 节点；
- NPC 人生：40～60 节点；
- 长期事件链：约 12 条，每条 4～8 节；
- 特殊突破/秘境/改命/前世：独立计数。

最终约 180～220 个节点，但不得将“达到 200 个”作为单独成功指标。

## 16.2 事件质量检查

每个 decision event 必须回答：

1. 为什么此时会发生？
2. 玩家为什么需要做选择？
3. 两个选项的代价是否不同？
4. 是否读取了当前身份/地点/属性/NPC/历史中的至少一项？
5. 选择后玩家能否看到明确反馈？
6. 是否有后续影响，或至少有明确即时意义？
7. 重复发生是否合理？

若 4～6 全部回答“否”，事件应删除或降级为 ambient narrative。

## 16.3 文案长度

- 普通事件正文：50～140 中文字；
- 关键事件正文：100～250 中文字；
- 结果正文：40～160 中文字；
- 单个选项：8～30 中文字；
- 不追求小说长段落，优先保证可快速阅读和做决定。

---

# 17. 存档迁移策略

V1 `schemaVersion: 1` 与 V1.1 `schemaVersion: 2` 不直接混用。

## 17.1 迁移目标

保留：

- totalRuns；
- 旧前世档案的基本展示信息；

不保证继续：

- V1 正在进行中的 currentSession。

原因：V1.1 属性、事件发生记录、NPC、结果页和 interaction 状态都发生结构变化，强行迁移正在进行的一世风险高于收益。

## 17.2 推荐行为

检测到 V1 存档时：

```text
“检测到 V1 存档。V1.1 将保留旧前世档案，但当前这一世需要重新开始。”
```

执行一次显式 migration：

```ts
migrateV1ToV2(oldPersistentGame): PersistentGameV2
```

迁移必须有单元测试和 fixture。

---

# 18. 测试体系 V2

## 18.1 原有测试全部保留

继续验证：

- Seeded RNG；
- 同 Seed 可重放；
- 时间与寿元；
- 境界推进；
- 事件引用完整性；
- 存档完整性；
- Build/Typecheck。

## 18.2 新增结果反馈测试

必须验证：

- choice 后进入 pendingResult；
- pendingResult 的数值变化等于真实 before/after 差；
- `continue` 后才能进入下一事件；
- 页面刷新后 pendingResult 可恢复；
- hidden effect 不出现在 public changes。

## 18.3 新增防重复测试

固定 Seed 下连续抽取：

- once 事件不重复；
- cooldown 未结束不得重复；
- variantGroup 遵守组冷却；
- 没有合格事件时返回平稳结果而不是破坏规则。

## 18.4 新增内容静态检查

CI 自动检查：

- 所有 event id 唯一；
- 所有 nextEventId 存在；
- decision 类型默认至少 2 个 choice；
- 所有 choice 必须有 result.text；
- 正数/负数 effect 数值必须有限；
- 禁止叙事中出现“一些灵石/少量灵石/若干灵石/碎灵石”等模糊资源词；
- chronicle major 事件必须有 title/text；
- NPC 引用必须存在。

## 18.5 Headless Simulation

新增脚本：

```bash
npm run simulate -- --runs 1000
```

固定算法自动跑大量 Seed，输出：

```text
median decisions per run
unique event ratio first 30 decisions
max repeated event count
realm distribution at death
median spirit stones by realm
median age at qi/foundation/win
major chronicle entries per run
core NPC interactions per run
```

模拟脚本只做平衡检测，不替代人工试玩。

---

# 19. UI V1.1 信息架构

桌面继续使用三栏，但职责重新定义。

## 左栏：角色

展示：

```text
年龄 / 寿元
境界
身份 / 宗门
根骨
悟性
神识
心性
气运
下品灵石
修为进度
师父
主要关系
当前状态（受伤等）
```

属性支持展开 breakdown。

## 中栏：当前人生

只能处于四种页面之一：

1. Action Menu；
2. Event；
3. Result；
4. End Summary。

禁止 Event 和 Result 同屏导致反馈被淹没。

## 右栏：此世传

只显示 Chronicle，不显示 debugLog，不显示所有 eventHistory。

Debug Log 只保留开发模式或折叠调试入口。

---

# 20. 代码目录建议

V1.1 不必推翻现有目录，建议新增/调整：

```text
src/
├─ core/
│  ├─ attributeEngine.ts
│  ├─ outcomeEngine.ts
│  ├─ eventScheduler.ts
│  ├─ chronicleEngine.ts
│  ├─ npcEngine.ts
│  ├─ legacyEngine.ts
│  ├─ migrationEngine.ts
│  └─ simulationEngine.ts
├─ data/
│  ├─ locationsV11.ts
│  ├─ npcsV11.ts
│  ├─ economyV11.ts
│  └─ events-v11/
│     ├─ qingyun.ts
│     ├─ blackWindMountain.ts
│     ├─ qingxiaMarket.ts
│     ├─ cultivation.ts
│     ├─ npcLiQing.ts
│     ├─ npcMaster.ts
│     ├─ npcChenYu.ts
│     ├─ ancientCave.ts
│     └─ legacy.ts
├─ components/
│  ├─ ResultPanel.tsx
│  ├─ ActionModePanel.tsx
│  ├─ LocationPicker.tsx
│  ├─ ChroniclePanel.tsx
│  └─ StatBreakdown.tsx
└─ scripts/
   └─ simulate.ts
```

事件文件按“地点/人物/系统”拆分，不再只按大类堆一个几千行文件。

---

# 21. V1.1 分阶段实施计划

## 阶段 0：策划冻结

只修改文档，不修改业务代码。

完成：

- 五属性成长表；
- 灵石经济表；
- Event V2 契约；
- NPC 契约；
- Chronicle 契约；
- 前世知识契约；
- 存档迁移策略。

验收：本文成为唯一基线。

---

## 阶段 1：结果反馈基础设施

修改重点：

- `SessionCommand` 增加 `continue`；
- `GameState` 增加 `interaction.pendingResult`；
- 新增 `outcomeEngine`；
- Event Choice 支持 result 文案；
- 新增 `ResultPanel`；
- 暂不扩事件数量。

验收：连续 20 次操作，每次都能看到“发生了什么 + 精确数值变化”。

---

## 阶段 2：属性与境界成长

修改重点：

- `stats` → base/permanentGrowth；
- 新增 `getEffectiveStat`；
- 神识境界加成；
- 修炼策略 V2；
- root/comprehension/spiritSense/mentality/luck 职责分离。

验收：同一 Seed 从凡人→炼气1→炼气9→筑基，属性变化符合本文表格。

---

## 阶段 3：行动上下文与地点

修改重点：

- 修炼二级选项；
- 历练地点选择；
- 身份相关任务选择；
- EventContext；
- 地点与行动进入事件触发条件。

验收：玩家能主动决定“去哪里、做什么”，而不是所有按钮都直接抽牌。

---

## 阶段 4：Event Scheduler V2 + 防重复

修改重点：

- occurrences；
- cooldown；
- maxOccurrences；
- variantGroup；
- 无事件保护；
- 内容静态检查。

验收：固定 Seed 连续执行 100 次行为，不再出现截图式的连续“山中暴雨/妖兽足迹”刷屏。

---

## 阶段 5：NPC + Chronicle 基础设施

修改重点：

- NPC Definition/RuntimeState；
- relationship 迁移；
- chronicle；
- activity counters；
- 右侧“此世纪年”替换成“此世传”。

验收：日常行为不污染传记；NPC 可跨多年保留状态。

---

## 阶段 6：第一条高质量纵向切片

只制作约 35～45 个节点：

- 青云宗；
- 黑风山；
- 青霞坊市；
- 李青；
- 师父；
- 陈宇；
- 古修洞府。

**此阶段结束必须停下来人工试玩，不得直接扩 200 事件。**

体验验收：

- 能复述一世经历；
- 能记住至少 2 个 NPC；
- 没有明显高频换皮事件；
- 不再有“问卷感”。

失败则回到阶段 0～4 调整设计。

---

## 阶段 7：正式扩大内容生态

只有阶段 6 通过后进入。

扩充到最终 180～220 节点目标，并补齐约 12 条长期链。

每批最多新增 20～30 个节点，独立 CI + 试玩。

---

## 阶段 8：前世知识

修改重点：

- PersistentGame V2 meta knowledge；
- Session legacySnapshot；
- legacy condition；
- 第一批 5～10 个前世知识分支。

验收：第二世至少能出现一条“上一世知道，所以这世可以不同选择”的完整链。

---

## 阶段 9：存档迁移、UI 收口与平衡

完成：

- V1→V2 migration；
- 旧档案展示兼容；
- 1000 Seed simulation；
- 手机/桌面 UI；
- 删除低质量事件；
- 调整灵石/修炼/突破平衡；
- 最终 Pages 部署。

---

# 22. V1.1 最终验收

技术条件：

- Typecheck ✅
- Unit Tests ✅
- Integration Tests ✅
- Replay Tests ✅
- Migration Tests ✅
- Build ✅
- GitHub Pages ✅
- 1000 Seed Simulation 无严重异常 ✅

体验条件：

1. 一世结束后能用 3～6 句话复述这名修士的人生；
2. 玩家记得至少 2 个 NPC，而不是只记得事件标题；
3. 灵石、修为、关系变化都有明确数字；
4. 关键选择后都有结果叙事；
5. 重复事件明显减少；
6. 炼气和筑基存在真实生命层次差异；
7. “此世传”像传记，不像操作日志；
8. 第二世开始出现知识继承而非单纯属性继承；
9. 死亡后的主要心理应是“下一世想换一种活法”，而不是“终于结束了”。

只有技术条件和体验条件同时通过，才允许标记：

> **Restarting Life V1.1 完成。**
