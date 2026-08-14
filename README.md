# Restarting Life / 此世问长生

**《此世问长生》**是一款以“一世一生”为局长、以节点地图模拟开放世界、强调修炼、探索、风险、机缘、真死亡与世界因果的修仙人生 Roguelite。

项目继续采用 **React + TypeScript + Vite**，首版不依赖后端数据库，也不接入实时大模型 API。

## 当前开发状态

当前正式进入：

> **V2.0 迁移阶段 · R00**

现有网页可玩代码仍然是 V1.2 主循环；V2.0 将在不推倒现有工程底座的前提下逐轮迁移。

迁移原则：

> **新系统先上线，旧系统再退役。每一轮只完成一个可验证闭环。**

当前 R00.1 已完成设计与施工真源落库，下一轮执行 `CURRENT_TASK.md` 中的 **R00.2｜冻结 V1.2 旧玩法边界**。

## V2.0 文档真源

后续开发必须按以下优先级阅读：

1. [`AGENTS.md`](./AGENTS.md) — 长期开发纪律；
2. [`CURRENT_TASK.md`](./CURRENT_TASK.md) — 当前轮唯一施工范围；
3. [`V2_GAME_DESIGN.md`](./V2_GAME_DESIGN.md) — V2.0 游戏设计唯一真源；
4. [`V2_MIGRATION_AUDIT.md`](./V2_MIGRATION_AUDIT.md) — V1.2 → V2.0 迁移边界；
5. [`V2_GITHUB_ROADMAP.md`](./V2_GITHUB_ROADMAP.md) — 总开发路线；
6. [`HANDOFF.md`](./HANDOFF.md) — 当前进度与下一轮入口。

`GAME_DESIGN_V1.md`、`V1_1_GAME_DESIGN.md`、`V1_2_GAME_DESIGN.md`、`V1_2_DATA_MODEL.md`、`V1_2_TECH_SPEC.md`、`V1_2_DEV_ROADMAP.md` 等旧文档目前保留用于历史参考，但**不再是 V2.0 施工真源**。任何冲突以 V2 文档为准。

## V2.0 核心定位

首版目标不是堆大量事件，而是完整跑通：

```text
出生三选一
→ 少量童年关键节点
→ 成年 / 入道
→ 已知地点与节点地图
→ 探索 / 采集 / 战斗
→ 返回落脚点
→ 修炼 / 炼丹 / 炼器 / 御兽
→ 宗门或散修路线
→ 突破
→ 死亡或寿终
→ 《此世传》
→ 下一世
```

完整一世目标现实游玩时间约 **1～2 小时**。

## V2.0 开发方式

本项目采用 GitHub-native 小步迭代：

```text
V2_GAME_DESIGN
→ CURRENT_TASK
→ Codex / Agent 修改仓库
→ typecheck / test / build
→ 提交
→ 线上试玩
→ 审查
→ 下一轮
```

任何一轮如果出现白屏、存档损坏、核心状态不同步、测试失败或上一轮功能退化，应立即进入修复轮，不继续新增功能。

## 当前工程底座

V1.2 已存在并计划继续复用 / 扩展：

- Seeded RNG；
- 单一 `worldDay`；
- `GameState` / `PersistentGame`；
- Session / Command 操作入口；
- condition / effect / event 基础设施；
- Chronicle 与人生档案；
- debug log / state digest；
- localStorage 单档；
- checksum 与存档迁移；
- Vitest 回归测试。

V2.0 不会新建长期并行的第二套 `src/v2/` 引擎。

## 当前需要逐步退役的 V1.2 主循环

当前 V1.2 主要仍是：

```text
闭关修炼 / 外出历练 / 谋生或宗门事务 / 尝试突破
→ 时间推进
→ 按分类抽取事件
→ 结算
```

V2.0 将逐步改为地点驱动：

```text
当前地点
+ 角色状态
+ 已知地点 / 情报
→ 当前可做之事
→ 玩家选择行动和时长
→ 探索 / 战斗 / 修炼 / 资源 / 世界后果
→ 必要时触发事件
```

Event Engine 会保留，但不再承担整个世界的主驱动职责。

## 首版明确不优先做

- 连续自由移动开放世界；
- 完整 NPC 社会模拟；
- 深度家庭 / 子女 / 家族经营；
- 完整动态经济和拍卖系统；
- 大型技能树；
- 装备普通耐久；
- 完整魔宗平行体系；
- 元婴及以上首发内容；
- 实时 LLM 事件生成；
- 后端和云数据库。

## 本地运行

环境要求：Node.js >= 20.19，npm。

```bash
npm install
npm run dev
```

## 自动验收

每轮开发完成前至少运行：

```bash
npm run typecheck
npm test
npm run build
```

未通过验收的轮次不得标记完成。
