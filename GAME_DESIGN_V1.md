# Restarting Life V1.0：修仙人生重开模拟器

> 文档性质：V1 第一版策划 + 技术规格 + 验收基线  
> 项目定位：纯前端、纯文字、规则驱动、不接入大模型 API 的修仙人生 Roguelike  
> 核心原则：先把一个可重放、可排错、可完整通关的闭环做稳，再扩世界与内容。

---

## 0. 文档使用规则

本文件是 V1 开发阶段的唯一功能基线（Single Source of Truth）。后续开发时：

1. 任何新增玩法若不在本文范围内，先修改策划，再写代码。
2. 代码不得自行发明新规则；数值、状态、触发顺序以本文为准。
3. 每个开发阶段必须有独立验收标准，未通过不得进入下一阶段。
4. 出现 Bug 时，先判断属于：状态数据 / 随机系统 / 时间系统 / 事件系统 / 数值计算 / 存档 / UI 六类中的哪一类，再定位。
5. 同一 `runSeed + saveState + 操作序列` 必须得到相同结果，用于稳定复现 Bug。

---

# 1. 游戏定位

## 1.1 一句话定义

玩家随机出生于一个修仙世界，在有限寿元内通过修炼、历练与事件选择寻找仙缘、进入修仙体系，并尝试从凡人一路修炼至金丹；死亡或结丹后生成本世总结并进入下一世。

## 1.2 V1 的核心体验

V1 只验证四件事：

- 每一世开局不同，但规则可理解；
- 玩家选择会通过属性、标签和 Flag 产生后续影响；
- 修炼始终受到时间、寿元、资源和风险约束；
- 死亡后愿意立刻重开一世。

## 1.3 V1 明确不做

以下内容全部不进入第一版：

- 大模型 API / 自由文本输入；
- NPC 自由对话；
- 开放世界地图移动；
- 真正的回合制战斗；
- 装备栏与复杂法宝系统；
- 炼器、阵法、符箓；
- 宠物 / 灵兽养成；
- 洞府经营；
- 多宗门政治系统；
- 元婴及以上境界；
- 联机、登录、服务器数据库。

V1 的自由度只来自：**属性 × 标签 × 事件条件 × 分支选择 × 随机权重 × 长期 Flag**。

---

# 2. 技术方案

## 2.1 技术栈

- Vite
- React
- TypeScript
- Zustand（或等价轻量状态管理；若未引入则 React 状态也可，但最终必须集中管理 GameState）
- Vitest
- localStorage

不需要：

- Node 后端
- SQL 数据库
- 云服务
- API Key

## 2.2 建议目录

```text
Restarting-life/
├─ src/
│  ├─ core/
│  │  ├─ gameEngine.ts
│  │  ├─ actionEngine.ts
│  │  ├─ eventEngine.ts
│  │  ├─ cultivationEngine.ts
│  │  ├─ conditionEngine.ts
│  │  ├─ effectEngine.ts
│  │  ├─ rng.ts
│  │  ├─ saveEngine.ts
│  │  └─ settlementEngine.ts
│  ├─ data/
│  │  ├─ backgrounds.ts
│  │  ├─ spiritRoots.ts
│  │  ├─ talents.ts
│  │  ├─ realms.ts
│  │  ├─ locations.ts
│  │  ├─ npcs.ts
│  │  └─ events/
│  │     ├─ mortal.ts
│  │     ├─ qiRefining.ts
│  │     ├─ sect.ts
│  │     ├─ exploration.ts
│  │     ├─ breakthrough.ts
│  │     └─ chains.ts
│  ├─ store/
│  │  └─ gameStore.ts
│  ├─ types/
│  │  ├─ game.ts
│  │  ├─ event.ts
│  │  └─ content.ts
│  ├─ components/
│  │  ├─ GameScreen.tsx
│  │  ├─ CharacterPanel.tsx
│  │  ├─ ActionPanel.tsx
│  │  ├─ EventCard.tsx
│  │  ├─ Timeline.tsx
│  │  └─ SummaryScreen.tsx
│  └─ App.tsx
└─ tests/
```

原则：**UI 不直接改数值；所有状态变化必须经过 core engine。**

---

# 3. 游戏状态模型

## 3.1 唯一主状态 GameState

建议结构：

```ts
interface GameState {
  schemaVersion: 1;
  runId: string;
  runSeed: string;
  rngState: number;

  status: 'playing' | 'event' | 'dead' | 'won';

  timeMonths: number;

  identity: {
    name: string;
    backgroundId: string;
    spiritRootId: string;
    talentIds: string[];
    faction: 'mortal' | 'qingyun' | 'loose';
  };

  stats: {
    constitution: number;
    comprehension: number;
    spiritSense: number;
    mentality: number;
    luck: number;
  };

  resources: {
    spiritStones: number;
    cultivation: number;
  };

  cultivation: {
    realm: 'mortal' | 'qi' | 'foundation' | 'golden_core';
    stage: number;
  };

  tags: string[];
  flags: Record<string, boolean | number | string>;
  relationships: Record<string, number>;

  currentEventId: string | null;
  eventQueue: string[];
  eventHistory: EventLogEntry[];

  endReason: string | null;
}
```

## 3.2 禁止双重数据源

以下值不得单独存储：

- 年龄：由 `timeMonths` 推导；
- 剩余寿元：由 `maxLifespanMonths - timeMonths` 推导；
- 当前境界名称：由 realm + stage 推导；
- 事件可选项状态：每次由条件引擎实时计算。

目的：避免“年龄 42，但剩余寿元仍按 38 岁计算”一类同步 Bug。

---

# 4. 时间与寿元

## 4.1 时间统一用月

V1 内部所有时间使用整数月：

- 6 个月 = 6
- 1 年 = 12
- 3 年 = 36

UI 再格式化显示为“24岁6个月”。

禁止使用 `0.5 年` 之类浮点数直接累加。

## 4.2 基础寿元

V1 初始规则：

| 境界 | 最大寿元 |
|---|---:|
| 凡人 | 80 年 |
| 炼气 | 120 年 |
| 筑基 | 220 年 |
| 金丹 | 达成后本局通关 |

寿元通过当前最高已达境界计算，不因跌落状态降低。

## 4.3 死亡判定

每次时间推进后立即执行：

1. 若 `timeMonths >= maxLifespanMonths` → 寿终；
2. 若事件效果明确造成死亡 → 对应死因；
3. 若没有死亡 → 才继续后续事件和突破检查。

死亡后不得继续抽取事件。

---

# 5. 核心属性

V1 固定五项基础属性，初始正常范围 1~10：

| 属性 | 作用 |
|---|---|
| 根骨 constitution | 修炼效率、突破肉身判定、危险事件生存 |
| 悟性 comprehension | 修炼效率、功法理解、突破成功率 |
| 神识 spiritSense | 探索、识破陷阱、部分隐藏选项 |
| 心性 mentality | 心魔、闭关稳定性、风险事件 |
| 气运 luck | 奇遇权重与少量随机修正 |

属性允许超过 10，但 V1 内容设计通常不超过 15。

灵石与修为属于资源，不属于基础属性。

---

# 6. 出身、灵根、天赋

## 6.1 出身：5 个

V1 固定：

1. 山村猎户之子
2. 小镇商贾之家
3. 没落书香门第
4. 修仙家族旁系
5. 无依孤儿

每个出身只允许定义：

- 初始属性修正；
- 初始灵石；
- 初始 Tag；
- 对特定事件池的权重修正。

禁止直接写特殊逻辑函数。

## 6.2 灵根：6 类

V1 固定：

1. 无灵根
2. 五灵根
3. 三灵根
4. 双灵根
5. 单灵根
6. 特殊灵根

灵根只提供：

- 修炼效率系数；
- 宗门入门权重；
- 少量事件条件。

建议初版系数：

| 灵根 | 修炼倍率 |
|---|---:|
| 无灵根 | 0（正常无法修仙） |
| 五灵根 | 0.70 |
| 三灵根 | 0.90 |
| 双灵根 | 1.05 |
| 单灵根 | 1.20 |
| 特殊灵根 | 1.25 |

无灵根不能通过普通修炼进入炼气，但可以通过极少数预设奇遇获得改变命运的 Flag；V1 只需要 1 条此类事件链。

## 6.3 天赋：10 个

每局随机获得 2 个天赋，允许出现稀有度权重，但不允许玩家无限刷开局。

天赋效果必须落到已有系统：

- 属性加成；
- 修炼倍率；
- 事件权重；
- 条件选项；
- 资源变化。

禁止天赋引入独立子系统。

---

# 7. 境界与修炼

## 7.1 境界范围

V1：

```text
凡人
→ 炼气 1~9 层
→ 筑基 前期 / 中期 / 后期
→ 金丹（通关）
```

金丹不继续游玩，进入本世结算。

## 7.2 修为阈值

所有境界进度统一使用 `resources.cultivation`，进入下一阶段时扣除对应阈值，避免多个进度条。

建议 V1 阈值：

- 炼气每层：100 修为
- 筑基前→中：300 修为
- 筑基中→后：400 修为
- 筑基后→金丹：500 修为 + 主动突破

具体数值后续可以调，但数据必须集中在 `realms.ts`，不可散落在组件中。

## 7.3 修炼行动

基础“闭关修炼”固定消耗 12 个月。

基础修为收益：

```text
base = 55
attributeFactor = 1 + (根骨 + 悟性 - 10) × 0.03
rootFactor = 灵根倍率
realmFactor = 当前境界修炼效率
finalGain = round(base × attributeFactor × rootFactor × realmFactor)
```

V1 初版 `realmFactor`：

- 凡人：0
- 炼气：1.00
- 筑基：0.75

最终收益最低为 0。

## 7.4 小境界提升

炼气 1~9 层与筑基前中后属于确定性进度提升：达到阈值自动晋级，不做概率判定。

原因：避免基础成长完全受 RNG 摆布。

## 7.5 大境界突破

凡人→炼气、炼气九层→筑基、筑基后期→金丹需要独立突破事件。

突破必须由玩家主动选择，不能达到修为后自动成功。

突破成功率只由引擎计算，UI 只展示结果或允许展示估算范围。

建议基础公式：

```text
chance = baseChance
       + (根骨 - 5) × 0.03
       + (悟性 - 5) × 0.03
       + (心性 - 5) × 0.02
       + 标签/道具修正
```

最终 clamp 到 5%~95%。

建议基础值：

- 引气入体：0.60
- 筑基：0.35
- 金丹：0.25

失败结果由对应突破事件定义，不允许统一“失败=死亡”。

---

# 8. 玩家可执行行动

非事件状态下，玩家固定看到 4 类行动：

## 8.1 修炼

- 消耗 12 个月；
- 增加修为；
- 可触发修炼类随机事件。

## 8.2 历练

- 消耗 6 个月；
- 从当前境界适用的探索事件池抽取事件；
- 可能得到灵石、Tag、Flag，也可能受伤或死亡。

## 8.3 宗门 / 生计

根据身份显示不同文字：

- 青云宗弟子：宗门任务；
- 散修：谋生 / 接取委托；
- 凡人：谋生 / 寻找仙缘。

统一消耗 6 个月，并进入对应事件池。

## 8.4 突破

只有满足修为阈值、境界条件时出现。

点击后进入对应突破事件，不直接计算结局。

V1 不提供“自由行动输入框”。

---

# 9. 事件系统——V1 最核心系统

## 9.1 Event 必须数据驱动

建议结构：

```ts
interface GameEvent {
  id: string;
  category: 'mortal' | 'cultivation' | 'sect' | 'exploration' | 'breakthrough' | 'chain';
  title: string;
  text: string;
  weight: number;
  once?: boolean;
  conditions?: Condition[];
  choices: EventChoice[];
}

interface EventChoice {
  id: string;
  text: string;
  conditions?: Condition[];
  effects: Effect[];
  nextEventId?: string;
}
```

事件文件只允许描述数据，不得直接调用 `setState()`。

## 9.2 Condition 使用白名单

V1 只允许以下条件：

- ageMin / ageMax
- realm
- stageMin / stageMax
- statMin / statMax
- hasTag / notTag
- flagEquals / flagMissing
- faction
- relationshipMin
- resourceMin

所有条件统一由 `conditionEngine.ts` 判断。

## 9.3 Effect 使用白名单

V1 只允许：

- addStat
- addSpiritStones
- addCultivation
- addTag / removeTag
- setFlag
- addRelationship
- advanceTime
- queueEvent
- killPlayer
- changeFaction
- setRealm（只允许突破专用逻辑调用）

任何新 Effect 类型必须先修改本文和类型定义。

## 9.4 事件抽取

候选事件产生流程：

1. 获取当前行为对应事件池；
2. Condition 过滤不可触发事件；
3. 排除 once=true 且已发生事件；
4. 应用 Tag / 灵根 / 气运带来的权重修正；
5. 使用当前 `rngState` 做加权抽取；
6. 写入 eventHistory。

严禁 `Math.random()` 直接参与核心游戏逻辑。

## 9.5 事件链与长期因果

“因果”在 V1 底层就是 Flag / Tag / Relationship。

示例：

```text
saved_li_qing = true
```

多年后事件条件：

```text
flagEquals(saved_li_qing, true)
```

这样可以实现“几十年前的选择在后面回收”，无需 AI。

V1 计划 5 条事件链，每条 3~5 个节点。

---

# 10. 随机系统与可重放性

这是 V1 的强制工程要求。

## 10.1 每一世生成 runSeed

新游戏创建：

```text
runId
runSeed
rngState
```

所有随机行为必须经 `rng.ts`：

- 出身；
- 灵根；
- 天赋；
- 事件抽取；
- 突破判定；
- 风险事件结果。

## 10.2 禁止核心逻辑使用 Math.random

如发现核心逻辑存在 `Math.random()`，视为验收失败。

## 10.3 调试记录

每一次状态变化记录：

```ts
{
  seq,
  timeMonths,
  sourceType,
  sourceId,
  choiceId,
  rngBefore,
  rngAfter,
  effects,
  stateDigest
}
```

生产 UI 不必全部展示，但开发模式必须可导出。

目标：用户报告“第 37 岁点历练后异常死亡”时，可以靠 runSeed + 日志复现。

---

# 11. 世界与内容规模

V1 世界保持极小。

## 11.1 地点：5 个

1. 青石镇
2. 黑风山
3. 青云宗
4. 青霞坊市
5. 古修秘境

V1 不做可点击地图。地点只作为事件条件和叙事背景存在。

## 11.2 势力

- 凡俗世界
- 青云宗
- 散修

第一版只有一个完整宗门：青云宗。

## 11.3 核心 NPC：4 个

建议：

- 引路人 / 外门执事
- 师父
- 同门李青
- 潜在敌对修士

NPC 只保存关系值和关键 Flag，不做日程模拟。

关系值建议范围 -100~100。

---

# 12. 战斗处理

V1 不做真正战斗系统。

战斗是事件中的一次数值判定。

建议统一生成 `powerScore`：

```text
power = 境界基础战力
      + 根骨 × 2
      + 悟性
      + 神识
      + 标签修正
      + seededRng(-10, +10)
```

敌人有固定 `enemyPower`。

事件根据差值进入：

- 大胜
- 险胜
- 败退
- 重伤 / 死亡

第一版不出现攻击力、法力、技能冷却等战斗专属属性。

---

# 13. 存档

## 13.1 存档内容

localStorage 至少保存：

- 当前 GameState；
- schemaVersion；
- 当前 runSeed / rngState；
- 本世日志；
- 前世档案；
- 全局解锁记录。

## 13.2 自动存档时机

只在完整事务结束后存档：

- 创建新角色后；
- 完成一次行动后；
- 完成一次事件选择及全部后续 Effect 后；
- 死亡 / 通关结算后。

禁止在一个事件效果执行到一半时保存。

## 13.3 存档版本

固定 `schemaVersion`。

后续修改数据结构时必须迁移，不允许默默读取旧结构。

V1 如果检测到无法迁移的存档，应明确提示“旧版本存档不兼容”，不能白屏。

---

# 14. 前世与重开

## 14.1 本世结算

死亡或结丹后至少展示：

- 第几世
- 享年
- 最终境界
- 身份
- 核心属性
- 灵石峰值或最终灵石
- 关键 Tag
- 重要事件 3~5 条
- 死因 / 通关原因
- 人生评价

## 14.2 前世档案

每世保存一条只读摘要，避免完整旧 GameState 无限膨胀。

## 14.3 V1 元成长

V1 不做复杂轮回商店。

只实现：

- 前世档案；
- 累计轮回次数；
- 成就式解锁少量新天赋 / 事件。

不提供永久属性加点，避免越玩越简单导致平衡崩坏。

---

# 15. UI 结构

V1 只需要 5 个主要界面状态。

## 15.1 首页

- 游戏标题
- 开始新一世
- 继续当前存档
- 前世档案

## 15.2 出生页

展示：

- 出身
- 灵根
- 两个天赋
- 初始属性

玩家确认进入本世。

V1 默认不允许无限刷新随机结果。

## 15.3 主游戏页

固定三区：

左/顶部：角色信息

- 年龄
- 境界
- 寿元
- 五项属性
- 灵石
- 修为

中部：当前人生记录 / 事件文本

底部：4 类行动按钮

## 15.4 事件页

- 标题
- 正文
- 2~4 个选项
- 不满足条件的隐藏选项默认不显示，不做灰色剧透

## 15.5 结算页

展示本世总结并提供“再入轮回”。

---

# 16. V1 内容数量冻结

第一版目标内容量：

| 内容 | 数量 |
|---|---:|
| 出身 | 5 |
| 灵根类别 | 6 |
| 天赋 | 10 |
| 地点 | 5 |
| 核心 NPC | 4 |
| 普通独立事件 | 30 左右 |
| 奇遇事件 | 8~10 |
| 事件链 | 5 条 |
| 每条事件链 | 3~5 节点 |
| 大境界突破事件 | 3 条 |
| 宗门 | 1 |
| 结局评价 | 8~10 |

达到数量不代表完成；必须先保证规则一致与可重放。

---

# 17. 引擎执行顺序

这是后续排错最重要的约定之一。

## 17.1 玩家点击普通行动

严格顺序：

```text
1. validateAction
2. 记录 rngBefore
3. 计算行动基础收益
4. advanceTime
5. 应用行动收益
6. recalculateDerivedState
7. checkDeath
8. 若死亡 → settlement，停止
9. resolveQueuedEvent
10. 若无队列 → selectEligibleRandomEvent
11. 写 eventHistory / debugLog
12. save
13. UI render
```

## 17.2 玩家点击事件选项

```text
1. validateChoice
2. 记录 rngBefore
3. applyEffects（按数组顺序）
4. advanceTime（若该选项包含）
5. recalculateDerivedState
6. checkDeath
7. 若死亡 → settlement，停止
8. 若 nextEventId 存在 → queue 到最高优先级
9. 处理 forced / queued event
10. 写日志
11. save
12. UI render
```

任何组件不得绕过此顺序直接改 GameState。

---

# 18. 防 Bug 约束

V1 必须建立以下硬规则：

1. 所有 ID 唯一：eventId / choiceId / tagId / talentId / npcId。
2. Event 数据加载时做启动校验：重复 ID、不存在 nextEventId、未知 Effect 类型直接报错。
3. 所有数值修改后统一 clamp：关系值 -100~100；灵石与修为不得小于 0。
4. 时间只能单向增加。
5. 已死亡 / 已通关状态禁止执行任何行动。
6. `once` 事件不得重复触发。
7. 同一次事务内同一路径只保存一次。
8. `setRealm` 不能被普通内容事件随意调用。
9. UI 不拥有业务规则。
10. 内容数据不得含匿名函数或直接 State mutation。
11. 所有随机必须经过 Seeded RNG。
12. 测试环境至少保留一组固定 Seed 的完整人生流程。

---

# 19. 测试要求

## 19.1 单元测试

至少覆盖：

- seeded RNG 同 Seed 同序列；
- Condition 判断；
- Effect 执行；
- 时间推进；
- 寿元死亡；
- 修炼收益；
- 境界晋级；
- 突破概率 clamp；
- once 事件过滤；
- eventQueue 优先级；
- 存档序列化 / 反序列化。

## 19.2 集成测试

至少建立 3 条固定脚本：

### Case A：正常修仙

有灵根 → 进入炼气 → 加入青云宗 → 筑基。

### Case B：凡人寿终

无灵根 → 未获得特殊机缘 → 寿元耗尽 → 正常结算。

### Case C：死亡事件

历练 → 高危事件 → 明确死亡 → 不得继续触发下一事件。

## 19.3 重放测试

固定：

- runSeed
- 初始存档
- 操作序列

连续执行 10 次，最终 stateDigest 必须一致。

---

# 20. 开发阶段

## 阶段 0：项目骨架

目标：项目能启动、测试能运行、目录建立。

验收：

- `npm run dev` 正常；
- `npm test` 正常；
- 页面无业务内容也可。

## 阶段 1：纯引擎最小闭环

只做 GameState、Seeded RNG、时间、寿元、修炼、死亡。

暂时不做正式 UI 和大量事件。

验收：使用测试脚本可以从出生跑到寿终。

## 阶段 2：角色生成

加入出身、灵根、天赋、初始属性。

验收：同 Seed 角色完全一致。

## 阶段 3：事件引擎

实现 Condition / Effect / Queue / once / weighted random。

只放 5~8 个测试事件。

验收：事件链稳定、无非法状态。

## 阶段 4：修仙闭环

实现炼气、筑基、金丹突破；青云宗 / 散修身份；行动面板。

验收：至少可以人工完成一局“死亡”和一局“金丹通关”。

## 阶段 5：正式内容填充

再扩到本文冻结的事件数量。

规则不再新增，只填数据。

## 阶段 6：存档、重放与前世档案

实现 localStorage、schemaVersion、debugLog、人生结算。

验收：刷新恢复、重开、旧世档案均正常。

## 阶段 7：UI 与最终 QA

只优化文字体验、布局、动画、移动端适配，不新增玩法。

---

# 21. V1 完成定义（Definition of Done）

只有同时满足以下条件，才算 V1 完成：

- 玩家可从出生完整玩到死亡或金丹；
- 至少存在凡人、青云宗、散修三种人生状态；
- 出身 / 灵根 / 天赋能够影响后续事件；
- 至少 5 条跨时间事件链可完整回收；
- 年龄与寿元系统不存在不同步；
- 所有核心随机可通过 Seed 复现；
- 刷新网页不会丢失当前进度；
- 死亡后不会继续发生事件；
- 金丹后不会继续普通游戏循环；
- 前世档案可以查看；
- 固定 Seed 集成测试全部通过；
- 控制台无未处理异常；
- 不需要任何大模型 API 即可完整游玩。

---

# 22. 后续扩展接口，但 V1 不实现

V1 架构完成后，后续可按独立版本加入：

- V1.1：炼丹与简单物品；
- V1.2：第二、第三宗门；
- V1.3：更多 NPC 与道侣 / 师徒链；
- V1.4：元婴境界；
- V1.5：法宝与更丰富战斗判定；
- V2：大模型仅作为叙事层 / NPC 对话层接入。

即使未来接大模型，也坚持：

> **Game Logic 由确定性规则引擎负责；LLM 只负责 Narrative Layer。**

模型可以改写文字、生成对话、根据状态生成叙事，但不得自行决定玩家实际数值、境界、死亡与掉落。

---

# 23. 第一版核心闭环最终冻结

```text
随机出生
→ 生成出身 / 灵根 / 天赋
→ 凡人阶段寻找仙缘
→ 有机会踏入炼气
→ 加入青云宗或成为散修
→ 修炼 / 历练 / 宗门或生计行动
→ 时间与寿元持续推进
→ 属性 / Tag / Flag 改变事件分支
→ 尝试筑基
→ 继续积累修为与因果
→ 尝试结丹
→ 金丹通关 或 中途死亡 / 寿终
→ 生成人生总结
→ 保存前世档案
→ 再入轮回
```

**V1 的目标不是模拟一个无限自由的修仙世界，而是把一个有限、清晰、可复现、可持续扩展的修仙人生系统真正做完整。**
