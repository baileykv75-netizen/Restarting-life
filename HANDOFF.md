# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**V2.0 架构地基与 R05 出生三选一已完成，下一步进入童年关键节点。**
- R00.1～R00.3 迁移准备已完成。
- R01 已把 live `GameState` 扩展为 V2 后续流程的唯一状态真源。
- R02 已建立 V2 `GameAction -> reducer -> Session -> replay/persistence` 调度边界。
- R03 已把 V3 单档自动保存行为锁成可回归验证的浏览器闭环。
- R04 已建立 V2 Game Shell。
- C00 已建立 `V2_CONTENT_BIBLE.md`，成为首版世界与具体内容真源。
- R05 已把新人生入口替换为真正的出生三选一；选择后进入 `lifeStage = childhood`，不会落回 legacy 四按钮主循环。
- legacy Action/Event/Result/End 与旧出生 wrapper 仍只为旧人生、旧测试与迁移期兼容保留，不得继续扩张。
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
- 新字段进入保存、加载、clone、digest 与 seeded replay 使用的同一 GameState。

### R02｜统一 GameAction / Reducer 与 Session 调度边界

已完成：

- V2 `GameAction` 与 legacy `PlayerAction` 分离；
- `applyGameAction(state, action)`；
- 当前支持 `ADVANCE_TIME / SET_FLAG / REMOVE_FLAG / SET_LIFE_STAGE / SET_CURRENT_LOCATION / SET_LOCATION_KNOWLEDGE`；
- GameAction 进入 debug log / digest / seeded replay / PersistentGame 生命周期。

### R03｜V3 单档自动保存行为补全

已通过浏览器层行为测试锁定：

- 开始人生立即落盘；
- command / GameAction 成功自动保存；
- 拒绝命令不覆盖最后有效存档；
- 关键 V3 状态刷新保持；
- 寿终后 `ended + currentSession + Archive` 一起恢复；
- `clearGame()` 删除 v3/v2/v1 三代槽；
- checksum 与旧版迁移行为不退化。

### R04｜V2 Shell 页面骨架

已完成：

- 单一 `App.tsx`；
- 顶部品牌 / 状态带 / 三栏主界面；
- `GameStatusBar` 只读取真实 GameState；
- 不展示尚未实现的地图、背包、功法、事务假入口；
- legacy UI 仅在旧成人流程继续兼容。

### C00｜首版内容真源冻结

`V2_CONTENT_BIBLE.md` 已冻结当前已认可内容，包括：

- 青霞地界、黑风矿变、8 个主地点 / 区域；
- 青云宗、陆 / 孟 / 谢三家、西渠；
- 8 个出身、灵根体系、无特殊体质 + 7 体质、首版 12 天赋；
- 童年事件池与多路径入道；
- 资源、经济、丹药、符箓、装备、功法；
- 半自动节拍战斗、8 种妖兽、6 类人类敌人；
- NPC、关系、炼丹 / 炼器 / 御兽；
- 3 个世界事件、6 条事件链、30 个普通事件骨架；
- 《此世记》/《此世传》文风规则。

仍需后续冻结的内容继续保留：

1. 炼气 → 筑基、筑基 → 金丹的具体突破资源与流程；
2. 筑基至金丹级主修传承；
3. 2～3 个具体延寿物；
4. 8～12 个随机子地点和 1～2 个小秘境；
5. 8～12 个重大机缘具体内容；
6. 30 个普通事件的正式正文。

不得让 Codex 临时用占位内容补齐这些缺口。

### R05｜出生三选一

已完成 V2 正式新人生入口：

- `phase = birth-selection` 现在是真正可玩的阶段；
- 点击开始后一次性生成并保存 3 个候选，刷新 / 关闭再打开仍为同一组三人；
- 重复点击开始不会重抽，也不会重复增加人生计数；
- 三个候选的出身互不重复，出生强弱不做补偿；
- 正式接入 Content Bible 的 8 个出身、35 个具体灵根组合 / 异灵根、无特殊体质 + 7 体质、12 个首版天赋；
- 出身写入出生地、关系、已知地点、童年池、成年入口与资源 seed/tag，但 R05 不伪造真实地图状态；
- 天赋和体质使用未来系统可读取的 `ruleTags`，不再只是文学说明 + 数值；
- 谢家、陆家候选姓名会保持对应家族姓氏；
- 选择后只建立一个权威 `GameState`，`lifeStage = childhood`，当前年龄从出生开始；
- 未选择候选不会残留为第二份角色状态；
- `pendingBirthSelection` 进入 V3 checksum / 单档保存并可刷新恢复；
- 通过可编码 selected birth seed，使选择后的 Session 仍能被现有 replay 从 `runSeed` 重建；
- legacy `generateBirthState()` 对普通旧 seed 仍保持 16 岁直接出生，旧回放 / 旧档案不被切断；
- 新出生 UI 明确展示出身、灵根、体质、1～3 天赋、资源、已知世界种子、关系与成年入口，不显示推荐、稀有度或隐藏气运；
- 选择进入童年后不再露出 legacy 四按钮，只显示童年阶段入口。

R05 主实现 commit：`1a69418ef90ff50e93f3c60f2c1e3bab02a81854`。

CI：run `31861441415`，verify job `94955452642`：

- typecheck：通过；
- test：通过；
- build：通过。

## 当前唯一状态与调度规则

后续正式 V2 系统继续使用：

```text
UI / feature
→ SessionCommand
→ GameAction / 对应 resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

禁止：React 页面自己 mutate GameState / 自己写 localStorage；禁止第二套 GameState 或长期并行 store。

## 当前可复用基础设施

- React + TypeScript + Vite；
- Vitest；
- Seeded RNG；
- 单一 `worldDay`；
- Session / Command；
- GameAction reducer；
- state digest / debug log / replay；
- `PersistentGame` + `pendingBirthSelection`；
- localStorage + checksum + migration；
- condition / effect / event；
- Chronicle / Archive；
- V2 Game Shell；
- 正式出生内容 data 层。

## 当前主迁移方向

```text
出生三选一（已完成）
→ 童年关键节点
→ 成年入口
→ 当前地点 + 角色状态 + 已知世界
→ 上下文可执行活动
→ 时间 / 探索 / 战斗 / 修炼 / 资源 / 因果
→ 必要时触发事件
→ Chronicle
```

## 下一轮

执行：

> **R06｜童年关键节点**

R06 只把已选出生带入 2 个首批关键童年节点，并在童年结束后推进到 16 岁 / `lifeStage = adult`。不实现成年入道，不提前做地图、旅行、宗门、战斗或职业系统。

具体范围以 `CURRENT_TASK.md` 为准。
