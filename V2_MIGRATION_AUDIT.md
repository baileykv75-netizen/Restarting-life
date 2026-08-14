# 《此世问长生》V1.2 → V2.0 迁移审查表

> **审查对象**：GitHub 仓库 `baileykv75-netizen/Restarting-life` 当前 `main`  
> **审查目的**：判断 V1.2 现有设计、代码、数据、UI、存档哪些可以直接保留，哪些需要修改、暂存或删除，并决定 V2.0 是否需要在正式 R01 之前增加迁移阶段。  
> **结论**：**必须增加 R00，但不推倒重来。**  
> **推荐迁移策略**：保留底层可靠基础设施，先扩充统一状态与控制文档，再逐步替换旧“行动 → 抽随机事件”玩法；任何时点都保证线上版本可运行。

---

# 1. 一句话判断

当前仓库并不是“V1.2 做废了需要重写”，而是：

> **底层工程基础比玩法结构成熟，应该保留工程底座，重构玩法承重层。**

最值得保留的是：

- Seeded RNG；
- 单一 `worldDay`；
- Session / Command；
- 状态摘要与 debug log；
- localStorage 单档存档；
- checksum；
- save migration；
- Chronicle 数据结构与记录机制；
- condition / effect / event 等通用规则工具；
- Vitest 测试体系；
- React + TypeScript + Vite 技术栈。

最需要替换的是：

> **“explore / livelihood / cultivate / breakthrough 四类行为 → 随机抽 Event → 结算”的主循环。**

V2.0 的主循环必须逐步转为：

> **地点 → 可执行活动 → 玩家选择持续时间 → 探索 / 修炼 / 战斗 / 资源 / 世界后果 → Chronicle**

---

# 2. 为什么必须增加 R00

原路线直接从：

> R01｜统一 GameState

开始。

但现有仓库已经存在：

- `GameState`；
- `PersistentGame`；
- `GameSession`；
- `birthEngine`；
- `actionEngine`；
- `eventEngine`；
- `sessionEngine`；
- 存档 schemaVersion 2；
- 大量 V1.2 tests。

因此如果 Codex 直接按照新的 R01 再“建立 GameState”，最容易发生：

```text
旧 GameState
+
新 GameState
+
旧 Session
+
新系统内部状态
=
两套甚至三套状态真源
```

这正是后续项目失控的最大风险。

所以必须先做：

> **R00｜V2 迁移护栏**

让 Codex 明确：

1. 哪些现有文件继续作为基础；
2. 哪些只是临时兼容层；
3. 哪些旧玩法不得继续扩展；
4. 新 V2 字段应该加到哪里；
5. 什么时候才允许删除旧逻辑。

---

# 3. 当前架构与 V2.0 的核心差异

## 3.1 当前实际 GameState 仍然很小

现有实际代码核心状态主要包含：

- identity；
- stats；
- spiritStones；
- cultivation；
- tags / flags；
- relationships；
- event queue / history；
- chronicle；
- worldDay。

但 V2.0 真正需要逐步增加：

- 当前地点；
- 地点知识；
- 世界骨架 / 随机子地点运行态；
- inventory；
- equipment；
- lifespan / used longevity items；
- conditions / injuries；
- techniques；
- sect state；
- matters / 当前事务；
- beasts；
- unique entity state；
- world event state；
- Fate / causality state；
- player meta compendium。

因此：

> **现有 GameState 可以作为骨架，但不能继续原样使用。**

结论：**重度修改，不重建第二套。**

---

## 3.2 V1.2 文档比当前代码走得更远

V1.2 数据模型文档已经提出：

- location；
- knowledge；
- NPC runtime；
- world schedule；
- Fate runtime；
- activity runtime；
- mood / conditions；
- Player View。

但这些字段并未完整进入当前实际 `src/types/game.ts` 和 `src/core/gameState.ts`。

这其实是好事：

> **说明迁移不需要先拆掉一堆已经高度耦合的开放世界系统。**

V2 可以继续沿用“单一状态真源、静态定义与运行态分离、角色认知与世界真相分离”的思想，但根据 V2.0 总纲重新选择真正需要的字段。

---

# 4. 模块级迁移总表

| 模块 | 当前状态 | V2 处理 | 原因 |
|---|---|---|---|
| React + TS + Vite | 稳定 | **保留** | 完全满足网页游戏 |
| Vitest | 已建立 | **保留** | GitHub 分轮迭代关键护栏 |
| Seeded RNG | 已使用 | **保留** | 可复现、可测试 |
| `worldDay` | 已存在 | **保留** | 与 V2 完全一致 |
| Session / Command | 已存在 | **保留并扩展** | 适合统一动作入口 |
| Debug Log / Digest | 已存在 | **保留** | 防状态漂移非常有价值 |
| localStorage | 已存在 | **保留** | V2 首版无需后端 |
| checksum | 已存在 | **保留** | 防存档损坏 |
| save migration | 已存在 | **保留并升级** | 后续 schema 变化需要 |
| Chronicle | 已存在 | **保留并重构聚合规则** | V2 核心系统 |
| Event Engine | 已成熟 | **保留为事件工具** | 不能再当整个世界主驱动 |
| Condition Engine | 已存在 | **保留扩展** | 地点、物品、功法等都需要 |
| Effect Engine | 已存在 | **保留扩展** | 统一状态变化有价值 |
| Birth Engine | 已存在 | **重写** | 当前只生成单角色、纯数值背景 |
| Backgrounds | 5 个 | **重写内容结构** | V2 出身必须改变世界入口 |
| Talents | 10 个 | **重写大部分内容** | 当前几乎全部是属性加点 |
| Spirit Roots | 已有 | **保留结构并扩展** | V2 需要更明确类型与品质 |
| Realms | 已有 | **修改** | 与 V2 显示 / 寿元 / 小境界统一 |
| Action Engine | 旧主循环 | **逐步淘汰旧职责** | 目前仍是四行为随机事件 |
| Formal Event Pool | 大量内容 | **暂存、筛选复用** | 不能继续作为主玩法 |
| Chain Events | 有固定链 | **大部分暂存** | 避免固定人生路线 |
| Exploration Events | 抽事件式 | **内容可拆解复用** | V2 要挂到地点 / 探索 |
| Sect Events | 事件化宗门 | **暂存素材** | V2 要先有真实宗门状态 |
| Mortal Events | 事件化凡人 | **少量保留素材** | V2 凡人阶段很轻 |
| Breakthrough Engine | 已有 | **保留思路重构规则** | V2 要概率透明 + 分级失败 |
| Cultivation Engine | 已有 | **保留思路重构输入** | V2 要地点、功法、时长参与 |
| App.tsx | 单页面事件流 | **逐轮改造** | 不应一次重写 |
| ActionPanel | 核心操作 UI | **最终替换** | V2 由地点 / 场景驱动 |
| EventPanel | 可用 | **保留为事件展示组件** | 事件仍存在但不主导世界 |
| CharacterPanel | 可用 | **修改** | 需要寿元、功法、状态等 |
| ChroniclePanel | 可用 | **保留并优化** | 与 V2 高度一致 |
| ArchivePanel | 可用 | **保留** | 跨人生档案仍需要 |
| EndPanel | 可用 | **修改** | V2 死亡因果、《此世传》更重要 |
| V1 / V1.1 文档 | 历史设计 | **归档** | 不允许继续成为实现依据 |
| V1.2 设计文档 | 旧设计 | **保留为历史参考** | V2 之后不再是设计真源 |
| V1.2 roadmap | 旧开发计划 | **停止执行** | 由 V2 GitHub 路线取代 |

---

# 5. 逐文件审查：根目录文档

## `README.md`

**处理：修改。**

保留：

- 项目介绍；
- 启动方式；
- 技术栈。

修改：

- 当前版本说明；
- V2 设计真源；
- 当前开发轮次；
- GitHub-native 迭代规则。

不要把 README 做成完整设计文档。

---

## `GAME_DESIGN_V1.md`

**处理：归档，不删除。**

建议未来移动到：

```text
docs/archive/GAME_DESIGN_V1.md
```

原因：

> 历史价值存在，但不能再让 Codex误认为它与 V2 同权。

---

## `V1_1_GAME_DESIGN.md`

**处理：归档。**

同上。

---

## `V1_2_GAME_DESIGN.md`

**处理：归档为历史设计参考。**

不立即删除。

V2 开始后，任何冲突以：

```text
V2_GAME_DESIGN.md
```

为准。

---

## `V1_2_DATA_MODEL.md`

**处理：保留参考，但停止作为技术真源。**

其中值得继承的原则：

- 世界真相 / 角色认知分离；
- 单一时间源；
- 静态定义 / 运行态分离；
- seeded RNG；
- 失败作为正常业务状态；
- 不为未来过度设计。

但旧字段和旧 Archetype / Fate 设计不能原样继承。

---

## `V1_2_TECH_SPEC.md`

**处理：暂存参考。**

后续建议重新形成：

```text
V2_TECH_SPEC.md
```

不要在 V1.2 Tech Spec 上打大量补丁。

---

## `V1_2_DEV_ROADMAP.md`

**处理：停止执行、归档。**

由：

```text
V2_GITHUB_ROADMAP.md
```

完全替代。

---

## `V1_2_STAGE_0_FREEZE.md`

**处理：归档。**

只用于理解历史决策，不再约束 V2。

---

# 6. 必须新增的根目录文件

V2 开始开发前必须增加：

```text
V2_GAME_DESIGN.md
V2_GITHUB_ROADMAP.md
V2_MIGRATION_AUDIT.md
AGENTS.md
CURRENT_TASK.md
HANDOFF.md
```

职责：

## `V2_GAME_DESIGN.md`

唯一玩法真源。

---

## `V2_GITHUB_ROADMAP.md`

总施工顺序。

---

## `V2_MIGRATION_AUDIT.md`

就是本审查表。

告诉 Codex：

> 什么能动、什么不能动、什么只是旧兼容层。

---

## `AGENTS.md`

长期施工纪律。

---

## `CURRENT_TASK.md`

唯一当前施工范围。

---

## `HANDOFF.md`

当前已经做到什么、下一轮从哪里接。

---

# 7. `src/types/game.ts`

## 当前评价

**有价值，但明显不足以承载 V2。**

优点：

- 单一 GameState；
- worldDay；
- runSeed / rngState；
- identity；
- stats；
- cultivation；
- flags；
- relationships；
- chronicle。

问题：

当前缺少 V2 最关键的世界型状态。

---

## 处理

**重度修改，禁止创建 `gameV2.ts` 与旧 GameState 长期并行。**

推荐逐步扩充：

```ts
GameState {
  ...
  location
  knowledge
  inventory
  equipment
  techniques
  lifespan
  conditions
  sect
  matters
  beasts
  world
  fate
}
```

不是 R00 一次把所有字段全部实现。

R00 只需要：

> 冻结扩展方向 + 先加入 R01/R02 真正需要的结构。

---

# 8. schemaVersion 与存档策略

## 推荐

**V2 游戏数据升级为 `schemaVersion: 3`。**

原因：

当前 `schemaVersion: 2` 已经代表 V1.2 的存档语义。

V2.0 会改变：

- birth；
- location；
- knowledge；
- inventory；
- action；
- event ownership；
- world；
- Chronicle 聚合；
- archive meta。

继续叫 schema 2 会让迁移越来越难判断。

---

## V2 存档 Key

推荐：

```text
restarting-life:v3
```

旧：

```text
restarting-life:v2
```

暂时保留，不主动删除。

---

## 旧当前人生怎么处理

**不推荐把正在进行的 V1.2 人生强行迁移成 V2 世界。**

原因：

它没有：

- 当前地点；
- 地点知识；
- 物品背包；
- 世界节点状态；
- V2 出生数据；
- V2 童年经历。

硬补默认值会制造大量假历史。

最稳方案：

> V2 第一次启用时开启新人生。

如果要保存历史，可以在后续单独将 V1.2 archives 导入“旧版人生档案”，但不属于首批迁移任务。

---

# 9. `src/core/gameState.ts`

## 当前评价

**保留文件，重构初始化。**

不要创建第二套初始化器。

现有：

```ts
createInitialGameState()
```

应该继续作为唯一基础入口。

之后出生候选不是直接覆盖它，而是：

```text
createInitialGameState
→ createBirthCandidates
→ chooseBirthCandidate
→ applyBirthChoice
→ childhood
```

---

# 10. `src/core/birthEngine.ts`

## 当前问题

目前：

> 生成一次随机基础属性 → 抽一个背景 → 抽灵根 → 抽两个天赋 → 直接生成 16 岁角色。

与 V2 冲突：

- V2 是三出生候选；
- 不可刷新；
- 候选展示完整；
- 童年要有关键节点；
- 出身应改变已知地点、关系、资源和入道方式；
- 体质需要独立系统；
- 天赋不能主要是数值包。

---

## 处理

**重写，但沿用：**

- seeded RNG；
- weightedPick；
- name generator；
- 数据驱动结构。

---

# 11. `src/data/backgrounds.ts`

## 当前问题

现有背景本质仍然主要是：

```text
description
+ statModifiers
+ spiritStones
+ tags
```

例如猎户：

> 根骨 +2、心性 +1、悟性 -1。

这正是此前试玩中“出身没什么用”的根本原因。

---

## 处理

**数据结构重写，文字素材可部分复用。**

V2 背景至少应允许定义：

```ts
knownLocationIds
initialItems
initialSpiritStones
relationshipSeeds
factionSeed
childhoodPoolIds
adultEntryType
tags
lightStatModifiers
```

属性修正只能是其中一小部分。

---

# 12. `src/data/talents.ts`

## 当前问题

当前几乎所有天赋都是：

> 属性 +1 / +2 或灵石。

文字比机制丰富。

例如：

- 过目不忘；
- 神魂敏锐；
- 悟道种子；
- 察微知著；

从描述看应该改变玩法，但当前只改变属性。

---

## 处理

**大部分机制重写。**

允许：

```ts
statModifiers
ruleModifiers
eventTags
unlockTags
cultivationModifiers
explorationModifiers
combatModifiers
professionModifiers
```

不是所有 Talent 都必须有全部字段。

---

# 13. `src/data/spiritRoots.ts`

## 处理

**结构保留，扩展。**

需要支持 V2：

- 五行；
- 多灵根；
- 异灵根；
- 品质 / 资质；
- 功法契合；
- 修炼速度修正。

不需要重做一套随机词条系统。

---

# 14. `src/data/realms.ts`

## 处理

**修改。**

首版只需：

```text
凡人
炼气
筑基
金丹
```

但需要明确：

- 小境界；
- 修为上限；
- 基础寿元；
- realm power；
- 世界风险认知修正等。

---

# 15. `src/core/actionEngine.ts`

## 当前问题：V2 最大冲突点之一

现有核心：

```text
getAvailableActions
→ explore / livelihood / cultivate / breakthrough
→ resolveDuration
→ drawEvent(category)
```

也就是说：

> **地点不存在，探索实际上只是“花一段时间后抽 exploration event”。**

这与 V2 的地点驱动核心冲突最大。

---

## 处理

**逐步退役旧主驱动职责。**

最终不应该由 ActionEngine 决定：

```text
玩家现在只能 explore / livelihood / cultivate
```

而应该由：

```text
Current Location
+ Character State
+ Known Content
+ Context
```

生成当前可执行活动。

---

## 不立即删除原因

现有 UI 和 Session 仍依赖它。

所以迁移顺序：

```text
R00 标记 legacy
→ 地点系统上线
→ Location Action 接管
→ 旧 explore/livelihood 退役
```

---

# 16. `src/core/eventEngine.ts`

## 当前评价

**值得保留。**

已有能力：

- event catalog；
- conditions；
- weight；
- once；
- cooldown；
- max occurrences；
- choice；
- queue；
- next event；
- effects。

这些仍然非常有用。

---

## V2 定位变化

V1.2：

> EventEngine ≈ 世界主要内容驱动器。

V2：

> EventEngine = 世界中的一种结果 / 剧情机制。

例如：

```text
探索万兽岭
→ exploration engine
→ 发现洞府
→ location state 改变
→ 进入洞府
→ 某节点触发 EventEngine
```

而不是：

```text
点探索
→ 随机抽一个“发现洞府”的事件
→ 结束
```

---

# 17. `conditionEngine.ts`

**处理：保留并扩展。**

未来增加条件：

- currentLocation；
- knownLocation；
- hasItem；
- itemQuality；
- technique；
- realm；
- injury；
- sectRank；
- beast；
- worldFlag；
- uniqueEntityAlive。

这是非常合适的通用基础设施。

---

# 18. `effectEngine.ts`

**处理：保留并扩展。**

但增加 V2 effect 时必须避免：

> 每出现一个新事件就写一个特殊 hardcode effect。

优先通用 effect：

- item add / remove；
- location discover；
- condition add / remove；
- relationship change；
- flag；
- matter；
- technique learn；
- sect contribution；
- beast state。

---

# 19. `src/core/sessionEngine.ts`

## 当前评价

**结构值得保留，但职责过重。**

现有优点：

- command 统一入口；
- snapshot；
- result；
- Chronicle；
- debug log；
- digest。

这些都非常适合 GitHub 分轮开发。

---

## 当前问题

它同时知道：

- 李青；
- 陈羽；
- relationship labels；
- 境界显示；
- effective stat；
- action narrative；
- V1.2 事件目录。

这些具体内容不应该长期硬编码在 Session Engine。

---

## 处理

**保留 Session Command 架构，逐步抽离内容知识。**

最终 Session Engine 应更像：

```text
receive command
→ dispatch resolver
→ receive state delta
→ create result
→ append debug
→ save
```

而不是“知道这个世界有哪些人”。

---

# 20. `src/core/chronicleEngine.ts`

## 当前评价

**强烈保留。**

它已经具备：

- routine / notable / major；
- startDay / endDay；
- action entry；
- event entry；
- consequence；
- changes。

与 V2《此世传》非常接近。

---

## V2 需要补

最重要的是：

> **Routine Accumulator / 聚合器**

例如：

连续闭关 6 次不应该留下 6 条。

需要最终聚合成：

> 23～31 岁长期闭关修行……

因此未来新增：

```text
chronicleAccumulator
chronicleCompression
lifeRecordBuilder
```

而不是推翻现有 Chronicle。

---

# 21. `lifeSummary.ts`

**处理：修改。**

当前 summary 字段类似：

- largestOpportunity；
- regret。

V2 不需要强迫每世都有“最大机缘 / 最大遗憾”。

应该转为：

- final realm；
- age；
- death cause；
- key identities；
- major milestones；
- Chronicle based summary。

避免为了模板完整度硬给人生找主题。

---

# 22. `persistentGameEngine.ts`

## 当前评价

**保留。**

当前结构：

```text
currentSession
archives
meta.totalRuns
```

非常适合“一世一局”。

---

## V2 扩展

未来 `meta` 可增加：

```ts
compendium
```

但不要增加永久角色属性。

---

# 23. `browserGameStore.ts`

**处理：保留。**

这正是“不本地开发、GitHub 网页版”方案需要的简单存档入口。

V2 首版不需要数据库。

---

# 24. `saveRepository.ts`

## 当前评价

**强烈保留。**

已有：

- envelope；
- checksum；
- schema；
- normalization；
- legacy migration；
- corrupt save error。

这是目前仓库质量很高的一部分。

---

## V2 修改

新增 schema 3：

```text
restarting-life:v3
```

不要覆盖旧 v2。

---

# 25. `saveMigration.ts`

**处理：保留并新增 V3 迁移职责。**

但首版不要求把旧当前人生完整转换为新世界。

---

# 26. `src/data/events/*`

总体原则：

> **不删除内容，但暂时取消“全部正式事件直接参与当前主循环”的地位。**

建议未来建立：

```text
docs/archive/content-v1/
```

或继续放 data 下但标注 legacy，直到完成筛选。

---

## `formalEvents.ts`

**处理：逐步拆除“大总池”职责。**

当前它把多个 Event Pool 汇总到一个正式目录。

V2 以后应该按上下文调用：

```text
location events
sect events
world events
technique events
childhood events
beast events
```

而不是所有类别共同构成“行动后抽一个”。

---

## `chainEvents.ts`

**处理：大部分暂存。**

原因：

固定链很容易再次把游戏拖回：

> 顾长安 / 某条预制人生路线。

但事件结构和文本片段可以以后拆成：

- 特殊世界剧情；
- NPC chain；
- rare encounter。

---

## `explorationEvents.ts`

**处理：结构重做，素材筛选。**

可以将旧事件转换为：

```text
location exploration outcome
```

必须挂到：

- 地点；
- 探索阶段；
- 环境；
- 已知信息；

而不是全世界随机抽。

---

## `cultivationEvents.ts`

**处理：少量保留。**

修炼中的真正特殊事件可以保留。

但普通闭关不应该每次都强制随机弹事件。

---

## `sectEvents.ts`

**处理：素材保留，运行方式重做。**

必须等待：

> sect state + rank + contribution + tasks

建立以后再接。

---

## `mortalEvents.ts`

**处理：仅留少量童年 / 入道素材。**

V2 不做深凡人人生。

---

## `breakthroughEvents.ts`

**处理：保留框架但交由 Breakthrough Engine 主导。**

不能把突破当普通 Event Choice。

---

# 27. App 与现有 UI

## `src/App.tsx`

当前主流程：

```text
无存档
→ 开始人生
→ 直接生成 16 岁
→ CharacterPanel
→ Event / Result / ActionPanel
→ Chronicle
```

---

## V2 目标流程

```text
Landing
→ BirthChoice
→ Childhood
→ Adult Entry
→ World Shell
   ├ Map / Location
   ├ Character
   ├ Inventory
   ├ Techniques
   ├ Matters
   └ Chronicle
→ Combat / Event / Secret Realm overlays
→ Death
→ Life Chronicle
→ New Life
```

---

## 处理原则

**不要 R00 一次重写 App。**

逐步加入 phase：

```ts
'birth-selection'
'childhood'
'world'
'ended'
```

等新 World Shell 稳定后，再删除旧 ActionPanel 主入口。

---

# 28. Components 处理

## `CharacterPanel.tsx`

**保留并扩展。**

后续显示：

- 年龄 / 寿元；
- 境界；
- 主修；
- 核心属性；
- 伤势；
- 身份。

---

## `ChroniclePanel.tsx`

**保留。**

---

## `ArchivePanel.tsx`

**保留。**

---

## `EventPanel.tsx`

**保留。**

事件仍然存在。

---

## `EndPanel.tsx`

**修改。**

强化：

- 死亡原因；
- 关键因果；
- 《此世传》；
- 重开。

---

## `ActionPanel.tsx`

**暂时保留，最终退役。**

它是 V1.2 主循环 UI，不符合 V2 地点驱动。

---

# 29. 当前最不应该做的事情

## 29.1 不要删除整个 `src/core`

错误：

> “V2 大改，重新建 core-v2。”

这会制造两套引擎。

---

## 29.2 不要一次把 V1.2 所有 Event 删除

旧内容仍可作为素材库。

先让新系统上线，再逐个迁移内容。

---

## 29.3 不要让 Codex 一次实现完整 V2 GameState

V2 总纲字段很多。

一次全占位会出现大量：

```ts
foo: {}
bar: []
baz: null
```

但没有任何真实玩法使用。

仍然按轮次按需增加。

---

## 29.4 不要继续扩充 V1.2 事件池

从 R00 开始：

> **冻结旧随机事件玩法的内容扩张。**

除修复外，不再给旧 `formalEvents` 新增内容。

---

## 29.5 不要迁移当前 V1.2 人生到 V2

没有价值，复杂度很高。

---

# 30. 推荐新增：R00｜V2 迁移护栏

原 32 轮路线修改为：

> **R00 → R01～R32**

R00 本身再拆成 3 个小轮。

---

# R00.1｜设计与施工真源落库

## 唯一目标

让仓库明确进入 V2 开发状态，不改玩法。

## 新增

```text
V2_GAME_DESIGN.md
V2_GITHUB_ROADMAP.md
V2_MIGRATION_AUDIT.md
AGENTS.md
CURRENT_TASK.md
HANDOFF.md
```

## 修改

`README.md`

明确：

> 当前开发版本 V2.0。

## 不修改

`src/`。

## 验收

- 文档存在；
- 真源关系明确；
- Codex 不再读取旧 roadmap 作为施工依据；
- build 仍通过。

---

# R00.2｜冻结 V1.2 旧玩法边界

## 唯一目标

通过注释 / 文档 / 测试明确旧系统哪些只是兼容层。

## 明确标记

- `ActionPanel`：legacy gameplay shell；
- `actionEngine` 的 explore/livelihood 随机事件：legacy；
- `FORMAL_EVENTS` 全局池：legacy main-loop source；
- V1.2 固定 chain：禁止新增。

## 不删除功能

线上仍保持当前 V1.2 可玩。

## 验收

- 当前游戏行为不变；
- tests / build 全过；
- HANDOFF 记录 legacy 边界。

---

# R00.3｜存档 V3 与可扩展 GameState 入口

## 唯一目标

建立 V2 后续状态迁移入口。

## 实现

- `schemaVersion: 3`；
- `SAVE_KEY = restarting-life:v3`；
- 旧 v2 不删除；
- 新 GameState 使用新的 schema；
- 新人生走 V3；
- V1.2 active run 不强迁；
- 存档损坏仍有安全处理；
- 新增 V3 save tests。

## 注意

本轮仍不要一次加入 inventory / combat / sect 全部字段。

只加入：

> 下一轮真正需要的最小 V2 phase / birth 状态。

## 验收

- V3 新人生可保存 / 恢复；
- 旧 v2 不被破坏；
- build/test 通过；
- 无白屏。

---

# 31. R00 之后原路线怎么调整

原：

```text
R01 统一 GameState
R02 Action / Reducer
R03 自动存档
R04 V2 Shell
...
```

建议改为：

```text
R00.1 设计真源落库
R00.2 冻结 V1.2 边界
R00.3 Save V3 / migration entrance

R01 扩展现有统一 GameState
R02 扩展现有 SessionCommand / Action Dispatch
R03 V3 单档行为补全
R04 V2 Shell
...
```

重点：

> **R01 和 R02 都不是“新建”，而是“扩展现有”。**

---

# 32. 可复用度估计

从实现风险角度，不按代码行数，而按“能力”估算：

## 可直接保留 / 小改

约 **35%**

包括：

- 技术栈；
- RNG；
- time；
- digest；
- save；
- migration framework；
- session command；
- tests；
- Chronicle infrastructure；
- condition / effect foundations。

---

## 可以复用思路但要明显修改

约 **30%**

包括：

- cultivation；
- breakthrough；
- birth；
- event usage；
- UI panels；
- realms / roots。

---

## 内容素材可复用但运行逻辑要重做

约 **20%**

包括：

- exploration events；
- sect events；
- chain events；
- backgrounds；
- talents。

---

## 需要新增

约 **15% 的“基础类别”**，但这些将承担 V2 最大的新玩法量：

- locations；
- exploration runtime；
- inventory；
- equipment；
- combat；
- beasts；
- sect runtime；
- matters；
- world events；
- compendium。

说明：

> 这里不是估算最终代码量，只是用于判断是否应该“推倒重来”。

结论仍然是：

> **完全没有必要推倒重来。**

---

# 33. 最终迁移判定

## 保留

- React / TS / Vite；
- Vitest；
- Seeded RNG；
- worldDay；
- stateDigest；
- DebugLog；
- conditionEngine；
- effectEngine；
- eventEngine 基础；
- Chronicle 基础；
- Session / Command；
- PersistentGame；
- browser storage；
- checksum；
- save migration framework；
- Archive。

---

## 修改

- GameState；
- persistence schema；
- birthEngine；
- backgrounds；
- talents；
- spiritRoots；
- realms；
- cultivation；
- breakthrough；
- sessionEngine；
- App；
- CharacterPanel；
- EndPanel；
- Event usage。

---

## 暂存

- formalEvents 大池；
- explorationEvents；
- cultivationEvents；
- sectEvents；
- mortalEvents；
- chainEvents；
- V1.2 部分剧情素材。

---

## 最终退役

- `ActionPanel` 作为主世界交互入口；
- `actionEngine` 的“explore/livelihood → 随机抽事件”职责；
- V1.2 固定人生路线式内容驱动；
- 旧 roadmap。

---

## 新增

- V2 真源控制文件；
- location；
- knowledge；
- inventory；
- equipment；
- techniques；
- conditions；
- matters；
- combat；
- beasts；
- sect runtime；
- world runtime；
- Fate causality；
- compendium。

---

# 34. 最终建议

**不要重开新仓库。**

**不要创建 `src/v2/` 与旧游戏长期并行。**

**不要清空现有 core。**

最安全的方式是：

```text
现有 main 可玩版本
↓
R00 建立 V2 护栏
↓
保留底层基础设施
↓
按轮扩展现有 GameState / Session
↓
新地点系统逐渐接管旧 ActionPanel
↓
新探索系统接管 exploration event
↓
新战斗 / 修炼 / 宗门逐轮接入
↓
旧 V1.2 主循环最后删除
```

整个迁移过程中始终遵守：

> **新系统先上线，旧系统再退役。**

而不是：

> **先把旧系统删干净，再祈祷新系统一次做成。**

这最适合 GitHub + Codex 一轮轮迭代的开发方式。

---

# 35. 下一步唯一建议

下一轮不要进入 R01。

应该正式执行：

> **R00.1｜V2 设计与施工真源落库**

即只向仓库新增 / 更新文档：

```text
V2_GAME_DESIGN.md
V2_GITHUB_ROADMAP.md
V2_MIGRATION_AUDIT.md
AGENTS.md
CURRENT_TASK.md
HANDOFF.md
README.md
```

**不碰任何 `src/` 游戏代码。**

完成后再进入 R00.2。
