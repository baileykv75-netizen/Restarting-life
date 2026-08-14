# 当前任务：V2 R02 - 统一 GameAction / Reducer 与 Session 调度边界

## 本轮唯一目标

在**不改变当前玩家玩法、不提前实现任何具体新系统**的前提下，建立 V2 后续系统统一修改 `GameState` 的通用 `GameAction -> reducer` 入口，并把它与现有 Session / Command 架构明确衔接，避免未来地图、出生、背包、战斗各自直接 mutate state。

## 必须实现

1. 继续使用 R01 的唯一 `GameState`，不得创建第二套 store / reducer state。
2. 定义独立于 legacy `PlayerAction` 的 V2 `GameAction` 类型。
3. 建立纯函数：

```ts
applyGameAction(state, action)
```

4. R02 只实现当前状态结构已经真实支持的最小通用 action：
   - `ADVANCE_TIME`
   - `SET_FLAG`
   - `REMOVE_FLAG`
   - `SET_LIFE_STAGE`
   - `SET_CURRENT_LOCATION`
   - `SET_LOCATION_KNOWLEDGE`
5. `ADVANCE_TIME` 必须复用现有唯一 world time / natural death 逻辑，不创建第二个时钟。
6. action 输入必须有最小合法性校验，例如：
   - 时间必须为合法正整数；
   - location id 不得为空字符串；
   - 地点认知只允许 `rumored / discovered`；
   - 已经 `discovered` 的地点不得被普通 action 降级回 `rumored`。
7. reducer 不负责 UI 文案、随机事件抽取、存档或 Chronicle 叙事。
8. 明确现有 `SessionCommand` / legacy `PlayerAction` 暂时继续服务旧网页；后续新 V2 command 应通过 Session 调度进入 `applyGameAction`，而不是页面直接调用 reducer 后自行保存。
9. 增加单元测试覆盖合法 action、非法 action、地点认知不可降级、时间推进和自然死亡。
10. 更新 `HANDOFF.md`，完成后将 `CURRENT_TASK.md` 切换到 R03。

## 关于路线图中的 ADD_ITEM / REMOVE_ITEM

原 `V2_GITHUB_ROADMAP.md` 的 R02 草案曾列出 `ADD_ITEM / REMOVE_ITEM`。

R01 按迁移审查决定**没有提前建立 inventory**，因此 R02 不得为了满足旧草案而空造背包结构。物品 action 留到 R14 背包系统建立时接入同一 reducer。

## 允许修改

- `src/types/command.ts` 或新增一个最小 `src/types/gameAction.ts`
- 新增一个最小 reducer 文件，例如 `src/core/gameActionReducer.ts`
- `src/core/worldEngine.ts`（仅为复用时间入口所需的最小调整）
- `src/core/sessionEngine.ts`（仅在需要明确 dispatch 边界时最小修改）
- 对应测试
- `HANDOFF.md`
- `CURRENT_TASK.md`

## 本轮禁止

- 不实现出生三选一。
- 不实现童年事件。
- 不新增真实地点数据或地图 UI。
- 不新增 inventory / item 内容。
- 不实现 combat / sect / beast。
- 不重写 legacy `actionEngine`。
- 不让新 reducer 直接负责 localStorage。
- 不让 React 页面绕过 Session 成为权威状态修改入口。
- 不改变现有事件概率、修炼、突破、时间数值或 UI 行为。
- 不顺手清理旧事件内容。

## 验收标准

1. 存在唯一、纯函数式 `applyGameAction(state, action)`。
2. R02 最小 action 均有测试。
3. 非法 action 不会产生半修改状态。
4. 时间 action 继续使用唯一 `worldDay` 并保留自然死亡规则。
5. 地点认知 discovered 不会被普通更新降级为 rumored。
6. 现有 legacy 网页流程不退化。
7. seeded replay 仍成立。
8. `npm run typecheck` 通过。
9. `npm test` 通过。
10. `npm run build` 通过。
11. `HANDOFF.md` 已更新。

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_MIGRATION_AUDIT.md`
4. `V2_GITHUB_ROADMAP.md`
5. `HANDOFF.md`

完成后立即停下，不得自行进入 R03。
