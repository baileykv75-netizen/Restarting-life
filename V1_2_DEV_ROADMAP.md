# Restarting Life V1.2 分阶段开发路线图

> 本文把 `V1_2_GAME_DESIGN.md` 与 `V1_2_TECH_SPEC.md` 转成可执行开发阶段。  
> 原则：**一阶段一目标；每阶段独立提交、独立 CI、独立验收；未过关不进入下一阶段。**

---

# 总览

| 阶段 | 目标 | 玩家可见变化 | 风险 | 强制检查点 |
|---|---|---|---|---|
| 0 | 规格冻结 | 无 | 低 | 文档审查 |
| 1 | Save Schema V2 | 老档安全迁移 | 中 | 存档测试 |
| 2 | worldDay 时间引擎 | 年龄/日期可精确到日 | 中高 | 全局时间回归 |
| 3 | 自然 Duration | 取消固定半年 | 中 | 时间行为测试 |
| 4 | Chronicle V2 | 《此世传》像人生 | 中 | **体验检查 A** |
| 5 | KnownFutureEvent | “近日所知”按时间排序 | 低中 | 隐私/剧透测试 |
| 6 | Location + Activity | 去哪里、做什么可主动选择 | 中 | 取消万能历练按钮 |
| 7 | CheckEngine | 当前判定透明 | 中 | Seed 重放测试 |
| 8 | FateGraph | 多年前选择影响未来 | 中 | **体验检查 B** |
| 9 | NPC Milestone | NPC 不等玩家 | 中高 | 时间推进测试 |
| 10 | Mood + Conditions | 经历留下中期后果 | 中 | 状态过期测试 |
| 11 | World Schedule | deadline/background/interrupt | 高 | 长行动测试 |
| 12 | Narrative Director Lite | 人生有起伏 | 中 | 节奏模拟 |
| 13 | 顾长安 16～25 岁 | 第一段真正可玩人生 | 高（内容） | — |
| 14 | 强制试玩修正 | 只删改、不扩系统 | — | **体验检查 C** |
| 15 | 顾长安完整人生 | 约 16～35 岁、多结局 | 高（内容） | 完整人生验收 |
| 16 | 第二人物原型 | 验证“不同人的命” | 高（内容） | 差异性验收 |
| 17+ | 正式扩世界 | 人物/NPC/地点/命运网扩充 | 持续 | 分批验收 |
| 18 | V1.2 平衡与发布 | 正式版本 | 中 | 发布门禁 |

---

# Stage 0：规格冻结

## 目标

在任何 V1.2 代码修改前，把玩法、技术边界与开发顺序冻结。

## 本阶段产物

- `V1_2_GAME_DESIGN.md`
- `V1_2_TECH_SPEC.md`
- `V1_2_DEV_ROADMAP.md`

## 必须明确的规则

- 每次重开是不同人物，不做常规前世继承；
- FateGraph 后台隐藏；
- 当前检定透明；
- `worldDay` 为唯一时间源；
- 1 年 360 日、1 月 30 日；
- 固定半年行动制废弃；
- Duration 首版只做 fixed/range；
- KnownFuture 只显示角色已知事项；
- World Schedule 与 Player Knowledge 分离；
- NPC 里程碑模拟，不逐日模拟；
- Chronicle 使用结构化作者文本；
- V1 active run 不静默解释为 V1.2 人生。

## 禁止

- 修改玩法代码；
- 扩事件；
- 改经济数值；
- 顺手实现 Stage 1。

## 验收

- 三份文档互不矛盾；
- 与 V1.1 冲突处明确说明以 V1.2 为准；
- 技术不存在必须依赖后端/数据库/LLM 的部分；
- 每个后续阶段都有明确边界。

---

# Stage 1：Save Schema V2 与迁移

## 目标

先确保改底层之前不毁掉现有玩家数据。

## 预计修改

- `src/types/persistence.ts`
- `src/store/saveRepository.ts`
- 新增 `src/store/saveMigration.ts`
- 新增/更新 save tests

## 内容

1. 定义 `PersistentGameV2` / V2 envelope。
2. 新 key：`restarting-life:v2`。
3. 读取时优先 V2；若不存在则读取 V1 并迁移。
4. 迁移事务完成前不删除 V1 key。
5. V1 archives 包装为 `LegacyLifeRecord`。
6. V1 当前进行中的人生保存为 Legacy 记录，并清空 V2 currentSession。
7. V1 debug logs 保留但标记 legacy replay。
8. V2 新人生仍要求完整 replay。

## 明确不做

- 不改 `timeMonths`；
- 不改 Gameplay；
- 不做 FateGraph；
- 不做 Chronicle V2。

## 测试

- V1 空档迁移；
- V1 active run 迁移为 Legacy；
- V1 dead/won archive 保留；
- V2 round-trip；
- checksum；
- 非法 JSON；
- 非法 schema；
- 重复迁移幂等或安全。

## 验收

CI 全绿，且迁移逻辑独立于玩法。

---

# Stage 2：worldDay 时间引擎迁移

## 目标

把全项目的规则时间从月份切到天。

## 预计修改

- `src/types/game.ts`
- `src/types/persistence.ts`
- `src/core/timeEngine.ts`
- `src/core/gameEngine.ts`
- `src/core/lifespanEngine.ts`
- `src/core/birthEngine.ts`
- `src/core/sessionEngine.ts`
- `src/core/stateDigest.ts` 相关 tests
- UI formatters
- 相关 event condition/effect 类型

## 内容

1. `timeMonths` → `worldDay`。
2. 出生年龄以 `birthDay/worldDay` 计算。
3. 360 日年制。
4. Age/date/season formatter。
5. Debug Log 改成 `worldDayBefore/After`。
6. Lifespan 使用天。
7. V1 migration 中保留 `months * 30`。

## 明确不做

- 不改行动时长语义；旧行动暂时可以换算成 180 日维持行为一致。
- 不做新地点。
- 不做 NPC 时间线。

## 测试

- 30/360 边界；
- 年龄换算；
- 季节；
- 寿元临界；
- 出生 16 岁；
- debug digest/replay；
- 全局搜索 `timeMonths`，业务代码不得残留。

## 验收

旧玩法保持基本不退化，但内部已完全进入日制。

---

# Stage 3：Duration + 唯一 `advanceWorldTime()`

## 目标

正式拆掉“所有行动固定半年”。

## 预计新增/修改

- 新增 `src/types/time.ts`（如需要）
- `src/core/timeEngine.ts`
- 新增 `src/core/worldEngine.ts`
- `src/core/actionEngine.ts`
- event effect 的时间字段
- tests

## 内容

1. `Duration.fixed/range`。
2. `resolveDuration()` 只用 Seeded RNG。
3. 所有行为通过 `advanceWorldTime()`。
4. 0 日行为锁定机制。
5. 旧 explore/livelihood 不再写死 180 日；先替换为内容定义 duration。

## 暂不做

- `untilCondition`；
- 中途 interrupt；
- NPC milestone；
- World Schedule。

## 验收示例

系统能够同时存在：

- 谈话 0 日；
- 交易 1 日；
- 打听 3 日；
- 采药 8～15 日；
- 休养 45 日；
- 闭关 180 日。

同 Seed 的 range duration 完全一致。

---

# Stage 4：Chronicle V2

## 目标

先让玩家回望人生时不再看到“数据库事件标题列表”。

## 预计新增/修改

- `src/types/chronicle.ts`
- `src/core/chronicleEngine.ts`
- `src/core/sessionEngine.ts`
- `src/components/ChroniclePanel.tsx` 或现有右栏组件
- Chronicle styles
- tests

## 内容

1. ChronicleEntry V2。
2. 记录日期/年龄、地点、叙事、选择、检定摘要、量化变化、心境。
3. 现有 StateDelta 继续作为数值真源。
4. RoutineAccumulator。
5. 普通重复行为折叠成阶段叙事。
6. 此阶段可以先用现有事件作为数据源验证呈现。

## 暂不做

- 不写顾长安大量新剧情；
- 不接 FateGraph；
- 不接 NPC milestone。

## 体验检查 A

人工构造/游玩 10～15 个节点后检查：

- 右侧是否像人物传记；
- 是否能看出玩家当时做了什么；
- 是否能看出结果与数值变化；
- 普通生活是否被合理折叠；
- 是否还像 debug log。

未通过，不进入 Stage 5。

---

# Stage 5：KnownFutureEvent / “近日所知”

## 目标

让玩家能够基于角色已经掌握的信息规划时间，同时不获得系统级预知。

## 预计新增/修改

- `src/types/knowledge.ts`
- `src/core/knowledgeEngine.ts`
- player selectors
- UI 中央/侧栏“近日所知”区域
- tests

## 内容

1. exact date / date range。
2. certain/credible/rumor/vague。
3. 按时间稳定排序。
4. passed/resolved/invalidated。
5. 更可靠消息可替换旧 rumor。
6. UI 只能读 selector。

## 必须测试

后台 schedule 有“兽潮”，角色不知道：UI 不出现。

角色听说“九月大集”：UI 出现并排序。

这是本阶段最重要的防剧透测试。

---

# Stage 6：Location + Activity

## 目标

正式移除“外出历练/谋生 = 抽卡”的主循环。

## 第一批地点

- 青石镇；
- 青霞坊市；
- 黑风山外围；
- 黑风山深处；
- 青云宗（条件开放）。

## 第一批活动

按地点提供，例如：

青石镇：

- 谋生；
- 打听消息；
- 拜访；
- 交易；
- 休养。

黑风山：

- 采药；
- 普通探索；
- 追查线索。

## 预计新增/修改

- `src/data/locations.ts`
- `src/data/activities.ts`
- `src/types/location.ts`
- `src/types/activity.ts`
- `src/core/activityEngine.ts`
- `src/core/actionEngine.ts` 重构/逐步淘汰
- Action UI
- tests

## 验收

玩家做决定前能看到：

- 去哪里；
- 做什么；
- 预计耗时；
- 已知成本；
- 已知风险。

页面中不再以“外出历练 · 半年”“凡尘谋生 · 半年”作为核心按钮。

---

# Stage 7：CheckEngine

## 目标

让属性、资源、状态真正决定人物能不能做到某件事。

## 预计新增

- `src/types/check.ts`
- `src/core/checkEngine.ts`
- check result UI
- debug log 扩展
- tests

## 内容

1. 五档结果。
2. 主属性/目标值。
3. visible/hidden modifiers。
4. Seeded roll。
5. 风险文本。
6. State/Choice 可以读取 CheckResult 进入不同后续。

## 验收

玩家清楚看到：

> 根骨 3 / 推荐 5；绳索 +1；腿伤 -1；当前危险。

但看不到隐藏 FateGraph 或最终剧情奖励。

同 Seed 同状态同选择结果完全一致。

---

# Stage 8：FateGraph 最小引擎

## 目标

让人生首次真正拥有“旧事多年后回来”的结构。

## 预计新增

- `src/types/fate.ts`
- `src/core/fateEngine.ts`
- `src/data/fate/` 第一批测试图
- tests

## 首批能力

- age/worldDay；
- location；
- realm/stage；
- stat；
- resource；
- relationship；
- tag/flag；
- eventOccurred；
- elapsedSinceEvent；
- knowsClue；
- NPC status。

## 暂不做

- 可视剧情编辑器；
- 脚本语言；
- 任意函数条件；
- 自动生成命运图。

## 体验检查 B

做一条极小测试线：

```text
早年选择 A
→ 两年以上
→ 满足环境条件
→ 出现后续 B
```

玩家不能提前看到 B，但 B 出现时能从《此世传》理解它为什么与过去有关。

---

# Stage 9：NPC Milestone

## 目标

让 NPC 在玩家不参与时也继续人生。

## 第一批

只做 4 个核心 NPC。

## 预计新增

- `src/types/npc.ts`
- `src/core/npcEngine.ts`
- `src/data/npcs.ts`
- `src/data/npcMilestones.ts`
- tests

## 内容

- birthDay；
- realm/stage；
- status；
- relationship；
- next milestone；
- milestone seeded resolution。

## 验收

玩家闭关/跳时三年后：

- NPC 年龄正确变化；
- 到期 milestone 正常结算；
- 玩家从未互动 NPC 仍可变化；
- 未知 milestone 不泄露到 UI。

---

# Stage 10：Mood + StatusCondition

## 目标

让经历对人物产生中期影响。

## 内容

- 主心境 + intensity + expiresAtDay；
- 轻伤/重伤/腿伤/经脉受损/虚弱等离散状态；
- check/activity/cultivation modifier；
- 时间推进自动过期。

## 验收

例如：

> 李青死亡 → 悲恸 II，持续 180 日 → 修炼效率下降；几年后心性可能因剧情成长。

不实现复杂情绪模拟器。

---

# Stage 11：World Schedule

## 目标

让世界事件在长行动期间继续发生，但不开发过度复杂的通用中断系统。

## 三类

- `deadline`
- `background`
- `interrupt`

## 处理规则

### deadline

越过日期即可关闭/发生；不打断当前活动。

### background

越过日期后台结算；玩家可事后知晓。

### interrupt

只给极少数重大事件；允许暂停 ActiveActivity 并保存 remainingDays。

## 验收

玩家进行 100 日活动：

- 期间的 deadline 可错过；
- background 正常结算；
- 普通事件不会反复中断；
- 一条测试 interrupt 能正确暂停/恢复活动。

---

# Stage 12：Narrative Director Lite

## 目标

避免“连续暴雨”与“连续奇遇”两种极端。

## 内容

事件/节点 intensity 0～4。

只做轻量权重：

- 高潮后降低高强度内容；
- 过长平淡期提高转折概率；
- FateGraph 高优先级节点仍可覆盖软节奏。

## 验收

固定 Seed 模拟多段人生，检查：

- 不连续堆 3～4 级内容；
- 不长期只有 0～1 级内容；
- 不破坏 Fate 必要节点。

---

# Stage 13：顾长安 16～25 岁

## 目标

第一次真正写一段“可以玩的修仙小说人生”。

## 规模

- 8～12 主要节点；
- 10～15 生活段落；
- 5～7 关键选择；
- 5～8 检定；
- 4 核心 NPC；
- 3～4 隐藏路线；
- 至少 3 条失败路线。

## 必须包含

- 无灵根带来的现实影响；
- 凡俗生活；
- 仙闻/坊市/黑风山；
- 老乞或其他可延迟回响的人生选择；
- 至少一次“失败反而发现新信息”；
- 至少一次明显时间机会成本；
- 至少一个 NPC 自己发生的人生节点。

---

# Stage 14：强制试玩修正

## 规则

**STOP。禁止新增系统。**

只允许：

- 删除；
- 重写；
- 调整节奏；
- 修数值；
- 修死路；
- 修重复；
- 优化 UI 信息层级。

## 检查问题

1. 我知道顾长安是谁吗？
2. 我愿意继续看他的人生吗？
3. 我是否还觉得自己在抽事件？
4. 我是否会考虑耗时？
5. 我知道五维为什么有用吗？
6. 我是否记住至少两段故事？
7. 《此世传》是否值得读？
8. 失败有没有产生新的故事？
9. NPC 是否像活人？
10. 有没有为了数值而存在的空洞事件？

多数答案不满意则回 Stage 6～13 修，不进入 Stage 15。

---

# Stage 15：顾长安完整人生

## 目标

将通过验证的纵向结构扩展到约 35 岁。

## 目标规模

- 15～20 核心人生节点；
- 15～25 普通生活段落；
- 8～12 重大选择；
- 10～15 检定；
- 4～6 核心 NPC；
- ≥5 隐藏支路；
- ≥6 失败分支；
- 6～8 结局。

## 结局要求

不以“是否修仙成功”作为唯一胜负。

结局必须能从 Chronicle 与人物经历自然总结出来。

---

# Stage 16：第二人物原型

## 目标

验证架构是否真的支持“不同人的人生”。

第二人物必须和顾长安在以下至少 4 项明显不同：

- 起点资源；
- 修炼起点；
- 家庭关系；
- 核心地点；
- 主要 NPC；
- 关键矛盾；
- 属性使用场景；
- 时间节奏。

禁止“复制顾长安剧情换名字”。

---

# Stage 17+：内容扩张

只有两个不同人物原型都证明好玩后，才允许：

- 增加人物 archetype；
- 增加 NPC；
- 增加地点；
- 扩散修、宗门、坊市生活；
- 扩筑基以后人生；
- 扩更多 FateGraph。

每批内容仍需小规模提交与试玩。

---

# Stage 18：V1.2 发布门禁

## 技术

- typecheck 通过；
- tests 通过；
- production build 通过；
- Pages deploy 通过；
- 同 Seed 重放通过；
- save migration 通过；
- Player View 无隐藏信息泄露。

## 体验

至少连续试玩多个 Seed/人物后满足：

- 不再有固定半年感；
- 不再以事件抽卡作为核心；
- 资源具有机会成本；
- 检定可理解；
- 已知未来事项可用于计划；
- 隐藏命运仍有未知感；
- NPC 不静止；
- 人生既有平淡也有高潮；
- 一世结束能读出一篇人物小传；
- 重开欲望来自“下一个人是什么命”。

---

# 每阶段统一工作纪律

1. 新阶段开始前先读取 `V1_2_GAME_DESIGN.md`、`V1_2_TECH_SPEC.md` 和本文对应阶段。
2. 一阶段一个工作分支。
3. 不直接在 main 试错。
4. 每阶段新增对应自动测试。
5. 不允许用“后续再修”跨过明确验收失败。
6. 禁止 `Math.random()`。
7. UI 不直接写 Core State。
8. UI 不读取隐藏 Fate/World Schedule。
9. 世界时间只有一个推进入口。
10. 每阶段完成后先 CI，再决定是否 merge。
11. 体验检查 A/B/C 是真实 STOP gate，不是文档装饰。
12. 大量内容永远排在系统验证之后。
