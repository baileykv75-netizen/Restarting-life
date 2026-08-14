# 当前任务：V2 R00.2 - 冻结 V1.2 旧玩法边界

## 本轮唯一目标

在**不改变当前线上玩法行为**的前提下，通过最小代码注释、文档说明和必要测试，明确 V1.2 哪些主循环组件属于迁移期 legacy 兼容层，防止后续继续在旧随机事件主循环上扩张。

## 必须实现

1. 在 `src/components/ActionPanel.tsx` 明确标记：它是 V1.2 legacy gameplay shell，V2 地点驱动 World Shell 稳定后将退役。
2. 在 `src/core/actionEngine.ts` 明确标记：`explore / livelihood → duration → drawEvent(category)` 属于 V1.2 legacy 主循环职责，不得作为 V2 探索系统继续扩张。
3. 在 `src/data/events/formalEvents.ts` 或对应正式事件汇总入口明确标记：全局 `FORMAL_EVENTS` 大池是 V1.2 legacy main-loop source；V2 事件最终必须由地点、宗门、世界、功法等上下文触发。
4. 在 `src/data/events/chainEvents.ts` 明确标记：V1.2 固定人生链不得继续新增为 V2 全局人生路线；旧内容仅作为后续筛选素材。
5. 如现有测试缺少防退化约束，只补最少必要测试或静态断言，确保本轮没有改变当前运行行为。
6. 更新 `HANDOFF.md`，记录本轮冻结的 legacy 边界和下一轮 R00.3 入口。

## 允许修改

- `src/components/ActionPanel.tsx`
- `src/core/actionEngine.ts`
- `src/data/events/formalEvents.ts`
- `src/data/events/chainEvents.ts`
- 与上述边界直接相关的最少测试文件
- `HANDOFF.md`

## 本轮禁止

- 不删除任何现有 V1.2 功能。
- 不改变当前玩家可执行的四类行动。
- 不改变事件概率、事件内容、数值、时间、突破规则或 UI 行为。
- 不新增地点系统。
- 不新增 V2 GameState 字段。
- 不修改存档 schema。
- 不进入 R00.3。
- 不归档 / 移动大量旧文件。
- 不顺手清理事件文本或 UI。

## 验收标准

1. 当前网页玩法与本轮前一致。
2. legacy 边界在代码和交接文档中清晰可见。
3. 后续开发者能明确知道旧 ActionPanel / actionEngine / FORMAL_EVENTS / fixed chains 不得继续作为 V2 主系统扩张。
4. `npm run typecheck` 通过。
5. `npm test` 通过。
6. `npm run build` 通过。
7. `HANDOFF.md` 已更新。

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_MIGRATION_AUDIT.md`
4. `V2_GITHUB_ROADMAP.md`
5. `HANDOFF.md`

完成以上内容后立即停下，不得自行进入 R00.3。
