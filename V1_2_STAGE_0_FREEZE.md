# Restarting Life V1.2 — Stage 0 规格冻结记录

> 状态：**Stage 0 READY FOR MERGE**  
> 本阶段只冻结设计和技术契约，不修改玩法代码。

---

# 1. 本阶段审查的现状

V1.1 已经解决了一部分表层问题：结果页、数值反馈、事件冷却、基础神识成长和简化传记。但当前主循环仍然高度依赖“选择一个顶层行动 → 固定推进一段时间 → 从类别事件池抽事件”，因此继续堆事件不能解决可玩性问题。

V1.2 不再以扩大事件池为主，而是更换游戏骨架。

---

# 2. V1.2 已冻结的产品定义

> **每次新人生体验的是另一个人的命。玩家看不到完整命运结构，但能清楚理解眼前选择为什么可行、为什么危险，以及它造成了什么具体后果。**

固定原则：

1. 不做常规前世属性继承、轮回点或“刷下一世更强”。
2. FateGraph 完整结构永远隐藏在 Core。
3. 当前属性/资源/关系/伤势等判定信息对玩家透明到足以形成经验。
4. 时间由事情自身决定，固定半年行动制永久废弃。
5. 已经通过人物、环境、公告、传闻等得知的未来事项进入“近日所知”，按时间排序；未知未来完全不显示。
6. 玩家可以计划已知未来，但不能看到系统级任务进度或命运完成度。
7. NPC 有自己的时间线，但首版只做里程碑模拟，不做逐日 AI。
8. 《此世传》记录真正经历过的人生：发生了什么、玩家怎么选、为什么成功/失败、数值怎样变化、人物心境怎样变化。
9. 普通重复生活允许聚合为多年阶段叙事。
10. 失败、错过和代价都是正常人生结果，不要求每条路线最终修仙成功。

---

# 3. 已冻结的技术收缩

为避免工程复杂度失控，以下决定在 Stage 1 开始前冻结：

## 3.1 时间

- 新人生唯一时间源：`worldDay`。
- 1 月 30 日，1 年 360 日。
- 不使用 JavaScript `Date` 作为规则时间。
- 所有业务时间最终通过 `advanceWorldTime()`。

## 3.2 Duration

首版只允许：

```ts
fixed(days)
range(minDays, maxDays)
```

暂不实现 `untilCondition`、`untilBreakthrough` 等无限条件时间。

## 3.3 长行动与世界事件

世界未来事项分为：

- `deadline`：过期即可；
- `background`：后台结算；
- `interrupt`：极少数重大事项才允许打断活动。

Stage 11 前不开发通用活动中断/恢复框架。

## 3.4 NPC

使用 milestone 模拟：只在关键年龄/时间点结算其境界、状态和人生变化，不逐日模拟修炼和行为。

## 3.5 FateGraph

只做数据驱动白名单条件，不做：

- 可视化图编辑器；
- 脚本语言；
- 任意函数；
- 自动生成剧情树。

技术上使用 Graph，而不是要求严格 Tree。

## 3.6 小说文本

运行时不调用 LLM 生成《此世传》。所有核心叙事采用作者文本 + 结构化 Chronicle；数值变化来自真实 StateDelta。

---

# 4. 隐藏数据与玩家可见数据的硬边界

Core 可以拥有：

- World Schedule；
- FateGraph；
- 未触发 FateNode；
- NPC 隐藏 milestone；
- 未知地点和线索；
- 隐藏检定修正。

UI 不能直接读取这些数据。

UI 只能读取 Player View，例如：

- 人物状态；
- 当前地点；
- 可做的活动；
- 已知 NPC；
- 已知线索；
- 已知未来事项；
- 当前检定可见依据；
- 《此世传》。

核心不变量：

> `WorldScheduledEvent !== KnownFutureEvent`

角色可能不知道真实事件；角色也可能相信一个最终被证伪的传闻。

---

# 5. 存档与重放边界

现有实际存档仍是 V1 schema。

Stage 1 将建立 V2 envelope 与显式迁移：

- 新 key：`restarting-life:v2`；
- 迁移成功前保留 `restarting-life:v1`；
- V1 archives 作为 Legacy 资料保留；
- V1 进行中的人生不静默解释为新的 V1.2 命运语义；
- V1 debug log 可以保留为 legacy replay，但不要求 V2 引擎重新计算旧 digest；
- V2 新人生继续要求同 Seed + 同初态 + 同命令序列 = 同结果。

---

# 6. Stage 0 文件真源

Stage 0 之后，V1.2 开发遵循：

1. `V1_2_GAME_DESIGN.md` — 玩法真源；
2. `V1_2_TECH_SPEC.md` — 技术真源；
3. `V1_2_DATA_MODEL.md` — 数据职责与隐藏/可见边界；
4. `V1_2_DEV_ROADMAP.md` — 分阶段施工顺序；
5. 本文 — Stage 0 冻结与验收记录。

如与 V1.1 文档冲突，以 V1.2 文档为准。

---

# 7. Stage 0 验收结论

经现有仓库结构审查：

- V1.2 不需要后端、数据库或 LLM API；
- React + TypeScript + localStorage + Seeded RNG 足以承载；
- 技术风险最高的时间迁移、长行动中断、旧存档、NPC时间线均已通过阶段拆分和功能收缩降低风险；
- Stage 0 未修改 `src/` 下任何玩法代码；
- 下一阶段可以安全进入 Save Schema V2，而无需同时修改时间、剧情或 UI。

---

# 8. 下一阶段唯一任务

## Stage 1：Save Schema V2 与 Legacy Migration

Stage 1 只允许处理：

- V2 persistence 类型；
- V2 save envelope/key；
- V1 → V2 migration；
- LegacyLifeRecord；
- save/load/checksum/migration tests。

Stage 1 禁止顺手处理：

- `worldDay`；
- Duration；
- FateGraph；
- 新地点；
- 新剧情；
- Chronicle V2；
- NPC Runtime。

只有 Stage 1 CI 全绿并通过迁移验收后，才能进入 Stage 2。