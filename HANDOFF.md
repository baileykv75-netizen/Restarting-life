# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**V2.0 迁移准备已完成，下一轮进入统一状态扩展**。
- 当前网页玩法仍暂时运行 V1.2 legacy 主循环，尚未进入地点驱动世界。
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

R00.1 未修改任何 `src/` 游戏代码。

### R00.2｜冻结 V1.2 旧玩法边界

已在不改变运行逻辑的前提下冻结以下 legacy 边界：

- `src/components/ActionPanel.tsx`：V1.2 legacy gameplay shell；V2 地点驱动 World Shell 验证后才退役。
- `src/core/actionEngine.ts`：`duration -> drawEvent(category)` 与四行为列表属于 V1.2 legacy 主循环职责；不得继续扩张为 V2 探索 / 地点 / 宗门 / 世界系统。
- `src/data/events/formalEvents.ts`：`FORMAL_EVENTS` 是 V1.2 全局主循环事件源；V2 事件最终应由地点、宗门、功法、NPC、世界状态等上下文触发。
- `src/data/events/chainEvents.ts`：现有固定人生链仅作为 legacy 内容素材，不得继续扩张为 V2 全局人生路线。

### R00.3｜存档 V3 与可扩展 GameState 入口

已完成持久化层迁移：

- 当前 `PersistentGame.schemaVersion` 升级为 `3`。
- 当前浏览器存档槽改为 `restarting-life:v3`。
- `restarting-life:v2` 与 `restarting-life:v1` 保留为只读迁移输入；正常迁移不会主动删除旧槽。
- `PersistentGame` 新增真实阶段状态：
  - `birth-selection`
  - `life`
  - `ended`
- 无存档时 `createEmptyPersistentGame()` 进入 `birth-selection`。
- 当前 legacy 开始流程暂时仍直接生成现有人生，但开始后 phase 切为 `life`；真正的出生三选一留给后续 R05。
- 一次已接受的操作导致人生结束后，phase 切为 `ended`。
- V2 活跃人生不会直接续接到 V3：升级时封存为 legacy archive，V3 回到 `birth-selection`。
- V1 存档继续通过 V1→V2→V3 迁移链，原始 `sourceSchemaVersion: 1` 元数据保留。
- V3 继续使用 checksum；已存在但损坏的 V3 不会静默回退到 V2。
- 显式清档会删除 v3/v2/v1 三个槽；普通加载迁移不会删除旧槽。

### R00.3 的重要边界

本轮**没有**升级 `GameState.schemaVersion`，它仍是当前 V1.2 的 schema 2。

这是刻意的：

> R00.3 只负责外层持久化与人生阶段入口；真正扩展统一 GameState 属于 R01。

这样避免在同一轮同时做“存档迁移 + 状态重构”。

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
- 不强迁正在进行的 V1.2/V2 当前人生为新世界运行态。
- 当前 live persistence 为 schema 3；旧 v1/v2 只作为迁移输入。
- `GameState` 的正式 V2 扩展从 R01 开始，按需增加，不一次性塞入所有未来系统。
- 旧 V1 / V1.1 / V1.2 文档只作为历史参考；发生冲突以 `V2_GAME_DESIGN.md` 为准。

## 下一轮

执行：

> **R01｜扩展现有统一 GameState**

具体范围以 `CURRENT_TASK.md` 为准。

R01 必须继续扩展现有 `src/types/game.ts` / `src/core/gameState.ts`，不得新建长期并行 `GameStateV2`。
