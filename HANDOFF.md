# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**V2.0 架构地基**。
- R00.1～R00.3 迁移准备已完成。
- R01 已把 live `GameState` 扩展为 V2 后续流程的唯一状态真源。
- R02 已建立 V2 `GameAction -> reducer -> Session -> replay/persistence` 调度边界。
- 当前网页玩法仍暂时运行 V1.2 legacy 主循环，尚未进入地点驱动世界。
- V2.0 不另开仓库，不建立长期并行 `src/v2/` 或第二套 GameState。

## 已完成

### R00.1｜设计与施工真源落库

已建立 `V2_GAME_DESIGN.md`、`V2_GITHUB_ROADMAP.md`、`V2_MIGRATION_AUDIT.md`、`AGENTS.md`、`CURRENT_TASK.md`、`HANDOFF.md`，并切换 README 到 V2.0 迁移主线。

### R00.2｜冻结 V1.2 旧玩法边界

已明确以下内容仅为迁移期 legacy：

- `ActionPanel` 旧主操作壳；
- `actionEngine` 的四行为 + `duration -> drawEvent(category)` 主循环；
- 全局 `FORMAL_EVENTS` 大池作为主世界驱动；
- 固定人生 chain 作为全局路线。

旧功能暂时保留可玩，但不得继续作为 V2 主系统扩张。

### R00.3｜存档 V3 与人生阶段入口

已完成：

- `PersistentGame.schemaVersion = 3`；
- 当前槽 `restarting-life:v3`；
- v2/v1 保留为只读迁移输入；
- `birth-selection / life / ended` 三阶段；
- checksum 与迁移链继续有效；
- 真正旧 V2 活跃人生迁入 V3 时封存，不静默套用新规则。

### R01｜扩展现有统一 GameState

已完成 live 状态承重层扩展：

- `GameState.schemaVersion` 从 2 升级到 3；
- 新增 `lifeStage`：`legacy-adult / childhood / adult`；
- `identity` 新增 `physiqueIds: string[]`；
- 新增唯一当前位置 `world.currentLocationId`；
- 新增地点认知 `knowledge.locations`，状态为 `rumored / discovered`；
- 当前 legacy 新人生使用兼容默认值：`lifeStage = legacy-adult`、当前位置为空、地点认知为空，不伪造尚未实现的 V2 地图内容；
- 明确保留旧 V2 为只读迁移类型，不把旧状态冒充 live GameState；
- R00.3 期间已经写入的“外层 V3 + 内层 state schema 2”活跃人生会原地规范化为 schema 3，不封存、不重开、不丢 worldDay / runSeed / 现有进度；
- 新增字段已进入保存、加载、clone、digest 与 seeded replay 所使用的同一 GameState；
- V2/V1 真正旧存档的既有迁移语义保持不变。

### R02｜统一 GameAction / Reducer 与 Session 调度边界

已完成：

- 新增 `src/types/gameAction.ts`，V2 `GameAction` 与 legacy `PlayerAction` 明确分离；
- 新增纯函数 `applyGameAction(state, action)`；
- 当前支持最小通用 action：
  - `ADVANCE_TIME`
  - `SET_FLAG`
  - `REMOVE_FLAG`
  - `SET_LIFE_STAGE`
  - `SET_CURRENT_LOCATION`
  - `SET_LOCATION_KNOWLEDGE`
- `ADVANCE_TIME` 复用唯一 `advanceWorldTime()`，自然寿终仍由原 lifespan 规则处理；
- 非法时间、空 location id、非法 flag 等不会产生半修改状态；
- `discovered` 地点认知不能被普通 action 降级回 `rumored`；
- `SessionCommand` 新增 `game-action`；
- player-facing V2 state change 可以通过 Session 进入现有 debug log / digest / seeded replay / PersistentGame 生命周期；
- 被拒绝的 GameAction 不写 debug log；
- GameAction 导致寿终时，现有 PersistentGame 会进入 `ended` 并建立 Archive；
- R02 没有为了旧路线草案提前建立 inventory，`ADD_ITEM / REMOVE_ITEM` 留到 R14 再接入同一 reducer。

## 当前唯一状态与调度规则

后续正式 V2 系统必须继续使用：

```text
UI / feature
→ SessionCommand
→ GameAction / 对应 resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

禁止：

```text
React 页面
→ 自己 mutate GameState
→ 自己写 localStorage
```

也禁止：

- 新建 `GameStateV2`；
- 新建长期并行 `src/v2/` store；
- 新系统绕过 Session / persistence 自己保存核心状态。

## 当前可复用基础设施

继续保留并扩展：

- React + TypeScript + Vite；
- Vitest；
- Seeded RNG；
- 单一 `worldDay`；
- Session / Command；
- GameAction reducer；
- state digest / debug log / replay；
- `PersistentGame`；
- localStorage + checksum + migration；
- condition / effect / event；
- Chronicle / Archive。

## 当前主迁移方向

旧：

```text
explore / livelihood / cultivate / breakthrough
→ 耗时
→ 全局事件池抽事件
→ 结算
```

目标：

```text
当前地点 + 角色状态 + 已知世界
→ 上下文可执行活动
→ SessionCommand / GameAction
→ 时间 / 探索 / 战斗 / 修炼 / 资源 / 因果
→ 必要时触发事件
→ Chronicle
```

## 下一轮

执行：

> **R03｜V3 单档自动保存行为补全**

R03 只验证和补齐当前 browser store / persistence 的自动保存闭环，不增加新玩法，不做多档、手动保存或 SL。

具体范围以 `CURRENT_TASK.md` 为准。
