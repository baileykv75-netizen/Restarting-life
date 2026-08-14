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

> **R00.2｜冻结 V1.2 旧玩法边界**

具体范围以 `CURRENT_TASK.md` 为准。

本轮目标只是在代码中清晰标记 legacy 边界，不改变玩家当前行为。

## 下一轮完成后的入口

R00.2 通过 typecheck / test / build 和行为验收后，才进入：

> **R00.3｜存档 V3 与可扩展 GameState 入口**

R00.3 也必须保持最小迁移，不得一次性加入 inventory / combat / sect 等全部 V2 字段。
