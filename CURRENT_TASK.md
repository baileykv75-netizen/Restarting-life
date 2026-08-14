# 当前任务：V2 R01 - 扩展现有统一 GameState

## 本轮唯一目标

在**不创建第二套状态体系、不改变现有玩家玩法**的前提下，把当前 `GameState` 升级成能够承接 V2 出生、童年和地点系统的唯一状态真源，并处理 R00.3 已产生的 V3 外层 / GameState schema 2 过渡存档。

## 必须实现

1. 继续使用现有 `src/types/game.ts` 与 `src/core/gameState.ts`，不得新建 `GameStateV2`。
2. 将 live `GameState.schemaVersion` 从 `2` 升级到 `3`。
3. 只增加近期 V2 流程真正需要的最小状态：
   - `lifeStage`：能够区分当前 legacy 成年流程、未来童年、未来成年；
   - `identity.physiqueIds: string[]`：为 R05 出生候选预留真实角色字段；
   - `world.currentLocationId: string | null`：为 R07/R08 地点入口提供唯一当前位置；
   - `knowledge.locations`：保存地点 `rumored / discovered` 认知状态。
4. 当前 legacy 新人生初始化为兼容值，保证现有网页继续可玩；不得伪造尚未实现的具体 V2 地点内容。
5. 为 R00.3 期间可能已写入的 V3 存档增加一次安全规范化：若外层 schema 3 中仍包含 GameState schema 2，则补齐上述最小字段并升级为 GameState schema 3；不得清空或重开该 V3 当前人生。
6. 更新所有 clone / digest / save normalization 逻辑，使新增状态不会在保存、加载、重放中丢失。
7. 增加测试覆盖：
   - 新 GameState schema 3；
   - 默认最小 V2 字段；
   - V3 + state schema 2 → V3 + state schema 3 规范化；
   - round-trip 不丢新增字段；
   - replay / 现有主循环不退化。
8. 更新 `HANDOFF.md`，完成后将 `CURRENT_TASK.md` 切换到 R02。

## 允许修改

- `src/types/game.ts`
- `src/core/gameState.ts`
- `src/types/persistence.ts`
- `src/store/saveMigration.ts`
- `src/store/saveRepository.ts`
- 与状态 clone / digest / replay 直接相关的最少文件
- 对应测试
- `HANDOFF.md`
- `CURRENT_TASK.md`

## 本轮禁止

- 不生成三个出生候选。
- 不实现童年事件。
- 不建立正式地图或可点击地点。
- 不实现 inventory / equipment / combat / sect / beast。
- 不移动现有 identity/stats/resources/cultivation 到全新嵌套结构。
- 不删除 legacy ActionPanel / actionEngine。
- 不改变事件概率、修炼数值、时间或 UI。
- 不创建并行 store 或第二套权威状态。

## 验收标准

1. live GameState 为 schema 3。
2. 新增字段均有明确默认值并进入唯一 GameState。
3. R00.3 生成的过渡 V3 存档可安全加载并规范化，不丢当前人生。
4. 新增字段保存 / 刷新后不丢失。
5. 现有 legacy 网页流程仍可开始、行动、结束。
6. seeded replay 仍成立。
7. `npm run typecheck` 通过。
8. `npm test` 通过。
9. `npm run build` 通过。
10. `HANDOFF.md` 已更新。

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_MIGRATION_AUDIT.md`
4. `V2_GITHUB_ROADMAP.md`
5. `HANDOFF.md`

完成后立即停下，不得自行进入 R02。
