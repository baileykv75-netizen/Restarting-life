# 当前任务：V2 R00.3 - 存档 V3 与可扩展 GameState 入口

## 本轮唯一目标

建立 V2.0 后续开发所需的 **V3 持久化入口**，让新版本拥有独立于旧 V1/V2 的存档槽和最小人生阶段状态，同时安全保留旧存档，不提前实现出生三选一或其他正式玩法。

## 必须实现

1. 将当前 `PersistentGame` 外层 schema 升级为 `schemaVersion: 3`。
2. 将当前浏览器存档键改为 `restarting-life:v3`。
3. 保留 `restarting-life:v2` 和 `restarting-life:v1` 作为只读迁移输入；正常加载迁移时不得主动删除旧槽。
4. 为 `PersistentGame` 增加最小、真实可用的阶段状态：
   - `birth-selection`：当前没有正式人生，等待后续出生系统接管；
   - `life`：当前人生正在进行；
   - `ended`：当前人生已经结束。
5. `createEmptyPersistentGame()` 必须返回 `birth-selection`。
6. 当前旧版 `startNewRun()` 暂时继续启动现有可玩人生，但必须把 phase 切到 `life`；R05 再由真正出生三选一接管这一入口。
7. 当前人生结束后 phase 切到 `ended`。
8. V2 存档迁入 V3 时：
   - 已完成 archives 保留；
   - 正在进行的 V2 当前人生不得静默继续套用 V3 规则；应封存为 legacy archive；
   - V3 进入 `birth-selection` 且 `currentSession = null`。
9. V1 存档继续通过已有 V1→V2 迁移逻辑，再进入 V3；原始 legacy 来源信息必须保留。
10. V3 保存继续使用 checksum；损坏的 V3 存档不得静默回退到旧 V2。
11. 增加/更新存档和 browser store 测试，覆盖 V3 round-trip、checksum、V2→V3、V1→V3、阶段状态和删除行为。
12. 更新 `HANDOFF.md`，并把 `CURRENT_TASK.md` 切换到下一轮 R01。

## 允许修改

- `src/types/persistence.ts`
- `src/store/saveRepository.ts`
- `src/store/saveMigration.ts`
- `src/store/saveRepository.test.ts`
- `src/store/browserGameStore.ts`
- `src/store/browserGameStore.test.ts`
- `src/core/persistentGameEngine.ts`
- 与上述变化直接相关的最少类型/测试文件
- `HANDOFF.md`
- `CURRENT_TASK.md`

## 本轮禁止

- 不实现三个出生候选。
- 不修改背景、天赋、灵根内容。
- 不新增 location / inventory / combat / sect / beast 等正式 V2 系统。
- 不创建 `GameStateV2` 或 `src/v2/` 第二套运行体系。
- 不改现有 ActionPanel / 事件概率 / 修炼 / 突破 / UI 行为。
- 不强行把 V2 活跃人生继续运行在 V3 下。
- 不删除旧 v1 / v2 存档槽作为迁移副作用。

## 验收标准

1. 无存档时加载 V3 空游戏，phase 为 `birth-selection`。
2. 当前旧版开始按钮仍能进入现有可玩人生，phase 为 `life`。
3. 人生结束后 phase 为 `ended`。
4. 新 V3 存档写入 `restarting-life:v3`。
5. V2 活跃人生迁移后被封存，V3 不继续该 session。
6. V1 历史迁移链仍可用。
7. V3 checksum 保护有效。
8. 正常迁移不会删除旧 v1 / v2 存档。
9. `npm run typecheck` 通过。
10. `npm test` 通过。
11. `npm run build` 通过。
12. `HANDOFF.md` 已更新，下一轮指向 R01。

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_MIGRATION_AUDIT.md`
4. `V2_GITHUB_ROADMAP.md`
5. `HANDOFF.md`

完成以上内容后立即停下，不得自行实现 R01。
