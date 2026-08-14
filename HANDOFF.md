# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**V2.0 架构地基已完成，开始进入人生起点系统**。
- R00.1～R00.3 迁移准备已完成。
- R01 已把 live `GameState` 扩展为 V2 后续流程的唯一状态真源。
- R02 已建立 V2 `GameAction -> reducer -> Session -> replay/persistence` 调度边界。
- R03 已把 V3 单档自动保存行为锁成可回归验证的浏览器闭环。
- R04 已建立 V2 Game Shell；当前 legacy Action/Event/Result/End 流程仍完整保留。
- 当前网页玩法仍暂时运行 V1.2 legacy 主循环，地点驱动世界尚未开始。
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

已完成：

- `GameState.schemaVersion = 3`；
- `lifeStage = legacy-adult / childhood / adult`；
- `identity.physiqueIds: string[]`；
- `world.currentLocationId`；
- `knowledge.locations`，状态为 `rumored / discovered`；
- R00.3 的“外层 V3 + 内层 state schema 2”活跃人生可原地规范化，不封存、不重开；
- 新字段已进入保存、加载、clone、digest 与 seeded replay 使用的同一 GameState。

### R02｜统一 GameAction / Reducer 与 Session 调度边界

已完成：

- 新增 V2 `GameAction`，与 legacy `PlayerAction` 分离；
- 新增纯函数 `applyGameAction(state, action)`；
- 当前支持 `ADVANCE_TIME / SET_FLAG / REMOVE_FLAG / SET_LIFE_STAGE / SET_CURRENT_LOCATION / SET_LOCATION_KNOWLEDGE`；
- 时间继续走唯一 `advanceWorldTime()`；
- `SessionCommand` 新增 `game-action`；
- GameAction 已进入 debug log / digest / seeded replay / PersistentGame 生命周期；
- 被拒绝操作不写 debug log；
- GameAction 导致寿终时正常进入 `ended` 并归档。

### R03｜V3 单档自动保存行为补全

生产代码经审查无需重写，已通过浏览器层行为测试锁定：

- 开始人生立即落盘；
- legacy command 成功自动保存；
- `game-action` 成功自动保存；
- 拒绝命令不覆盖最后有效存档；
- `lifeStage / physiqueIds / world / knowledge` 刷新后保持；
- `ADVANCE_TIME` 寿终后 `ended + currentSession + Archive` 一起恢复；
- `clearGame()` 删除 v3/v2/v1 三代槽；
- checksum 与旧版迁移行为不退化。

### R04｜V2 Shell 页面骨架

已完成：

- 继续使用单一 `App.tsx`，没有新增第二套路由或应用；
- 当前人生界面形成稳定三层结构：
  - 顶部产品标题与人生档案入口；
  - 一条真实状态带；
  - 左人物 / 中央主舞台 / 右《此世记》三栏；
- 新增纯展示 `GameStatusBar`；
- 状态带只读取真实 GameState / 现有 helper：
  - 年龄；
  - 境界；
  - 寿元信息；
  - 灵石；
- 页面主品牌从 V1.2 改为《此世问长生 · V2.0》；
- 进行中的 Chronicle 面板标题改为《此世记》，终局《此世传》概念不受影响；
- legacy `ActionPanel / EventPanel / ResultPanel / EndPanel` 继续原样承载当前可玩流程；
- 未展示地图、背包、功法、事务等假入口；
- 状态带采用单一横条 + 分隔线，不拆成独立仪表卡；
- 桌面保持三栏，窄屏继续自然折叠。

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
- Chronicle / Archive；
- V2 Game Shell。

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
出生候选 → 童年 → 成年入口
→ 当前地点 + 角色状态 + 已知世界
→ 上下文可执行活动
→ SessionCommand / GameAction
→ 时间 / 探索 / 战斗 / 修炼 / 资源 / 因果
→ 必要时触发事件
→ Chronicle
```

## 下一轮

执行：

> **R05｜出生三选一**

R05 将第一次替换玩家可见的 legacy 开局入口：三个出生候选必须一次生成并保存，刷新不能重抽；选择后写入唯一 GameState，并进入童年阶段。

具体范围以 `CURRENT_TASK.md` 为准。
