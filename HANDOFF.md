# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**V2.0 架构地基**。
- R00.1～R00.3 迁移准备已完成。
- R01 已把 live `GameState` 扩展为 V2 后续流程的唯一状态真源。
- R02 已建立 V2 `GameAction -> reducer -> Session -> replay/persistence` 调度边界。
- R03 已把 V3 单档自动保存行为补成可回归验证的浏览器闭环。
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

- `GameState.schemaVersion = 3`；
- `lifeStage = legacy-adult / childhood / adult`；
- `identity.physiqueIds: string[]`；
- `world.currentLocationId`；
- `knowledge.locations`，状态为 `rumored / discovered`；
- R00.3 的“外层 V3 + 内层 state schema 2”活跃人生可原地规范化，不封存、不重开；
- 新字段已进入保存、加载、clone、digest 与 seeded replay 使用的同一 GameState。

### R02｜统一 GameAction / Reducer 与 Session 调度边界

已完成：

- 新增独立 V2 `GameAction`；
- 建立纯函数 `applyGameAction(state, action)`；
- 当前支持：`ADVANCE_TIME`、`SET_FLAG`、`REMOVE_FLAG`、`SET_LIFE_STAGE`、`SET_CURRENT_LOCATION`、`SET_LOCATION_KNOWLEDGE`；
- `ADVANCE_TIME` 复用唯一 `advanceWorldTime()` 与现有寿终规则；
- 非法 action 不产生半修改；
- `discovered` 地点不能降级回 `rumored`；
- `SessionCommand` 已支持 `game-action`；
- 新 action 已接入 debug log / digest / seeded replay / PersistentGame；
- R02 没有提前建立 inventory，物品 action 留到 R14。

### R03｜V3 单档自动保存行为补全

R03 审查后确认现有生产逻辑已经满足设计，不为“增加改动量”重写正确代码：

- `startAndSaveRun()` 开启人生后立即写入当前 V3 单档；
- `commandAndSave()` 只在 `applied = true` 时覆盖存档；
- legacy `SessionCommand` 与新 `game-action` 成功后均走同一个自动保存入口；
- reducer / Session 拒绝命令不会覆盖最后一份有效存档；
- `ADVANCE_TIME` 导致寿终后，`ended` phase、current session 与 Archive 一并落盘；
- `lifeStage`、`physiqueIds`、`world`、`knowledge` 可随完整 GameState 刷新恢复；
- R01 的过渡 V3 规范化会在 `loadPersistentGame()` 中回写 V3 槽，不会每次刷新重复迁移；
- checksum 失败仍直接报错，不回退旧 V2/V1；
- `clearGame()` 删除 v3/v2/v1 三个槽并返回全新 `birth-selection`。

R03 主要新增浏览器行为级回归测试，没有修改生产玩法逻辑。

## 当前唯一状态、调度与保存规则

后续正式 V2 系统必须继续使用：

```text
UI / feature
→ SessionCommand
→ GameAction / 对应 resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ browserGameStore auto-save
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
- 新系统绕过 Session / persistence 自己保存核心状态；
- 增加手动 SL、多档位或历史回滚。

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
- localStorage + checksum + migration + auto-save；
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
→ 自动保存
```

## 下一轮

执行：

> **R04｜V2 Shell 页面骨架**

R04 只建立新的页面壳层和响应式布局，用真实现有状态展示顶栏，并继续承载当前 legacy 可玩主舞台；不做出生三选一、地图、背包、功法、事务或战斗等新玩法。

具体范围以 `CURRENT_TASK.md` 为准。
