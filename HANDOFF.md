# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**V2.0 迁移准备**。
- 当前仓库线上可玩代码仍然是 V1.2 主循环。
- V2.0 不另开仓库，不另建长期并行 `src/v2/`。
- V2.0 采用“保留底层工程底座、逐轮替换玩法承重层”的迁移方式。

## 已完成

### R00.1｜设计与施工真源落库

已建立：

- `V2_GAME_DESIGN.md`：V2.0 玩法唯一真源；
- `V2_GITHUB_ROADMAP.md`：逐轮开发路线；
- `V2_MIGRATION_AUDIT.md`：V1.2 → V2.0 迁移审查；
- `AGENTS.md`：长期开发纪律；
- `CURRENT_TASK.md`：当前唯一施工任务；
- `HANDOFF.md`：本交接文件；
- `README.md`：已切换到 V2.0 迁移阶段说明。

R00.1 **未修改任何 `src/` 游戏代码**。

### R00.2｜冻结 V1.2 旧玩法边界

已在不改变运行逻辑的前提下冻结以下 legacy 边界：

- `src/components/ActionPanel.tsx`：明确为 V1.2 legacy gameplay shell；V2 地点驱动 World Shell 验证后才退役。
- `src/core/actionEngine.ts`：明确 `duration -> drawEvent(category)` 与四行为列表属于 V1.2 legacy 主循环职责；不得继续扩张为 V2 探索 / 地点 / 宗门 / 世界系统。
- `src/data/events/formalEvents.ts`：明确 `FORMAL_EVENTS` 是 V1.2 全局主循环事件源；V2 事件应改由地点、宗门、功法、NPC、世界状态等上下文触发。
- `src/data/events/chainEvents.ts`：明确现有固定人生链仅作为 legacy 内容素材，不得继续扩张为 V2 全局人生路线。

本轮只增加迁移注释并更新交接，没有修改事件概率、事件内容、数值、时间、UI 行为、存档 schema 或 GameState 字段，也没有新增地点系统。

## 当前确认可复用的基础设施

后续迁移优先保留并扩展：

- React + TypeScript + Vite；
- Vitest；
- Seeded RNG；
- 单一 `worldDay`；
- Session / Command 统一操作入口；
- state digest / debug log；
- `PersistentGame` 一世一局结构；
- localStorage 单档；
- checksum；
- save migration framework；
- condition / effect / event 基础设施；
- Chronicle / Archive 基础设施。

## 当前确认需要迁移的主问题

V1.2 当前核心仍是：

```text
explore / livelihood / cultivate / breakthrough
→ 固定或范围耗时
→ 按 category 从 FORMAL_EVENTS 抽事件
→ 结算
```

V2.0 最终必须转为：

```text
当前地点
+ 角色状态
+ 已知地点 / 情报
→ 可执行活动
→ 玩家决定时长 / 行动
→ 探索 / 战斗 / 修炼 / 资源 / 世界状态
→ 必要时触发事件
→ Chronicle
```

Event Engine 保留，但不再作为整个世界的主驱动器。

## 迁移硬规则

- 新系统先上线，旧系统后退役。
- 不先删除旧 ActionPanel / actionEngine 再重写。
- 不创建第二套权威 GameState。
- 不强迁正在进行的 V1.2 当前人生为 V2 世界。
- V2 存档后续使用 schemaVersion 3 / `restarting-life:v3`，但这属于 R00.3，不得提前实施。
- 旧 V1 / V1.1 / V1.2 文档只作为历史参考；发生冲突以 `V2_GAME_DESIGN.md` 为准。

## 下一轮

执行：

> **R00.3｜存档 V3 与可扩展 GameState 入口**

下一轮必须先把 `CURRENT_TASK.md` 切换为 R00.3 的最小任务定义，再开始修改代码。

R00.3 的目标是建立 V2 存档与状态迁移入口，不是一次性实现整个 V2 GameState。

## R00.3 边界提醒

R00.3 只应处理：

- schemaVersion 3；
- `restarting-life:v3`；
- 旧 v2 存档保留 / 安全处理；
- 新人生进入 V3 的最小 phase / birth 状态入口；
- 对应存档与迁移测试。

R00.3 不得提前加入完整 inventory / combat / sect / beast / world map 等 V2 系统。
