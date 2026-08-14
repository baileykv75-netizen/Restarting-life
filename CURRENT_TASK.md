# 当前任务：V2 R03 - V3 单档自动保存行为补全

## 本轮唯一目标

在**不增加新玩法、不改变单档原则**的前提下，把 R00.3～R02 已建立的 V3 persistence、统一 GameState 和 GameAction/Session 链完整接到浏览器自动保存行为上，确保“已接受操作自动保存、拒绝操作不覆盖存档、刷新恢复一致、清档重新开始”形成稳定闭环。

## 必须实现

1. 继续使用现有 `browserGameStore.ts` / `saveRepository.ts`，不得建立第二套 store。
2. 明确并测试：
   - `startAndSaveRun()` 创建人生后立即写入 V3 单档；
   - legacy SessionCommand 成功后自动保存；
   - 新 `game-action` SessionCommand 成功后自动保存；
   - 被 reducer / Session 拒绝的命令不得覆盖当前有效存档；
   - `ADVANCE_TIME` 导致寿终后，`ended` phase、Archive 和当前 session 一并持久化；
   - 刷新/重新加载后 GameState 新字段（lifeStage、physiqueIds、world、knowledge）保持一致；
   - `clearGame()` 删除 v3/v2/v1 槽并回到 `birth-selection`。
3. 如发现当前 R01 的 V3 过渡状态规范化只在内存生效，允许做最小修改，使规范化后的 schema 3 状态回写当前 V3 槽，避免每次加载重复迁移。
4. checksum 失败仍必须直接报错，不得静默回退旧 V2/V1。
5. 不增加手动保存按钮、多档位、历史回滚或 SL 功能。
6. 增加/整理 browser store 与 save repository 测试，覆盖以上行为。
7. 更新 `HANDOFF.md`，完成后将 `CURRENT_TASK.md` 切换到 R04。

## 允许修改

- `src/store/browserGameStore.ts`
- `src/store/browserGameStore.test.ts`
- `src/store/saveRepository.ts`
- `src/store/saveRepository.test.ts`
- 与 V3 规范化回写直接相关的最少 migration 文件
- `HANDOFF.md`
- `CURRENT_TASK.md`

## 本轮禁止

- 不实现出生三选一。
- 不实现童年事件。
- 不新增地图 UI 或真实地点数据。
- 不新增 inventory / combat / sect / beast。
- 不新增手动保存、多存档位、回档、读档刷结果。
- 不改变 legacy ActionPanel、事件概率、修炼、突破或时间数值。
- 不创建后端数据库。
- 不提前进入 R04 UI Shell。

## 验收标准

1. 成功的 legacy command 与 `game-action` 都会自动保存。
2. 被拒绝的 command 不会覆盖有效存档。
3. 刷新后完整 V3 GameState 与 persistent phase 一致恢复。
4. 寿终后的 ended / Archive 可正确恢复。
5. 清档后回到 birth-selection，旧槽也被删除。
6. checksum 防护和旧版迁移行为不退化。
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

完成后立即停下，不得自行进入 R04。
