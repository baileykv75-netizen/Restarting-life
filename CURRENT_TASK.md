# 当前任务：V2 R12 - 随机子地点运行骨架

## 本轮唯一目标

在 R11 已完成的三个固定野外区域探索进度之上，建立首版“每一世不同、同一世固定”的随机子地点闭环：

> **新人生 seed → 为三个固定 wilderness 生成有限子地点 → 未发现时不泄露 → 随区域探索阶段逐步发现 → 发现后进入角色知识 / 区域页面 → 刷新 / replay 保持。**

本轮重点是 **随机子地点的运行骨架与发现机制**，不是资源、战斗、秘境或完整内容扩写。

---

## 内容来源约束

必须先阅读：

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`
4. `V2_MIGRATION_AUDIT.md`
5. `V2_GITHUB_ROADMAP.md`
6. `HANDOFF.md`

### 当前内容缺口必须牢记

`V2_CONTENT_BIBLE.md` 目前只正式冻结了以下随机子地点 **内容家族 / 世界来源**：

- 黑风山：随机洞府、遗迹、旧矿 / 矿变相关异常地点；
- 灵溪谷：野生药谷、深处寒潭类特殊地点；
- 万兽岭：兽巢；
- 总体允许的首版家族：洞府 / 药谷 / 兽巢 / 遗迹。

**尚未冻结完整的 8～12 个具体命名子地点内容池。**

因此 R12 禁止：

- Codex 自行批量编造 8～12 个正式地点并反向写成 Content Bible 真源；
- 自行发明宝物、妖兽、传承、NPC、奖励或剧情；
- 把路线文档里的示例扩写成正式世界设定。

R12 只允许使用上述已存在内容家族完成运行框架。完整具体内容池记录为后续内容补齐项。

---

## 首版生成规模

为了验证随机世界与发现闭环，首版每一世只生成 **4～6 个子地点实例**，不追求 8～12 个正式内容模板。

建议分布：

- 黑风山：2 个；
- 灵溪谷：1～2 个；
- 万兽岭：1～2 个。

允许的 archetype：

```text
cave      洞府
herb-valley  药谷
beast-nest   兽巢
ruin      遗迹
```

区域适配必须符合 Content Bible：

- 黑风山：`cave | ruin`；
- 灵溪谷：`herb-valley | ruin`，如果需要“寒潭”必须只作为后续具体内容钩子，本轮不实现寒潭专属玩法；
- 万兽岭：`beast-nest | ruin`。

不要为了凑随机性让万兽岭生成药谷、灵溪谷生成矿洞等违背世界来源的组合。

---

## GameState 兼容原则

R12 运行态必须进入唯一 `GameState`，但继续保护 R05～R11 已有 replay digest。

建议等价结构：

```ts
interface SublocationRuntime {
  id: string
  parentLocationId: string
  archetype: 'cave' | 'herb-valley' | 'beast-nest' | 'ruin'
  discoveryThresholdDays: number
  discovered: boolean
}

interface SublocationState {
  generated: Record<string, SublocationRuntime>
}
```

关键要求：

1. 新字段必须是 **optional**；
2. 不得修改 `createInitialGameState()` 给所有旧人生自动补空对象；
3. 通过新的明确 SessionCommand / resolver 第一次 materialize；
4. 生成必须只依赖当前 `runSeed / rngState` 的正式 seeded RNG 路径，不能使用 `Math.random()`；
5. 同一人生刷新 / replay 后组合完全一致；
6. 不新建第二套 runtime store；
7. 保存 / normalize 对已存在子地点状态必须保留并深拷贝。

---

## 生成与发现规则冻结

### 生成

- 子地点实例在本世第一次初始化 R12 world-sublocations 时一次性生成；
- 生成后本世固定，不因为刷新、离开区域或重复探索重新抽；
- 不允许无限生成；
- 每个实例必须有 canonical runtime id；
- 同一个父区域内实例 id 不重复。

### 未发现状态

未发现子地点：

- 不出现在地图节点；
- 不出现在区域详情列表；
- 不显示正式名称；
- 不泄露数量；
- 不允许直接前往。

### 发现

R12 不再新增“探索经验”。直接复用 R11 当前区域累计 `exploredDays`。

每个子地点拥有一个固定 `discoveryThresholdDays`，首版只使用简单门槛，例如：

```text
3 / 8 / 18 / 30 天
```

要求：

- 门槛由 seeded generation 一次确定；
- 当玩家完成一次 R11 `explore-region` 后，检查当前区域是否有达到门槛但尚未 discovered 的实例；
- 达标即可发现；
- 一次 10 天探索可以跨过多个门槛；
- 不使用每次探索重新随机“发现概率”；
- 不因角色气运在 R12 改写门槛，避免本轮扩张；
- 已发现永不回退。

这样保持：

> 探索越深入 → 世界信息逐步打开

而不是：

> 无限点击“探索” → 抽随机地点。

---

## 名称与文案约束

因为具体 8～12 个正式地点尚未内容冻结，R12 UI 只允许使用克制的 archetype 展示：

- `一处洞府遗迹` / `洞府`；
- `一片野生药谷` / `药谷`；
- `一处兽巢` / `兽巢`；
- `一处残破遗迹` / `遗迹`。

不要自动生成“玄阴真人洞府”“赤霞药王谷”之类带具体历史结论的名字。

发现结果文案只说明：

> 在持续探索这片区域后，你确认了一处新的子地点：残破遗迹。

不要描述其中有什么宝物、妖兽、尸体、功法或剧情。

---

## 必须实现

1. 新增正式 sublocation runtime 类型与 resolver / generator。
2. 只为三个 fixed wilderness 生成首版 4～6 个实例。
3. 生成必须 deterministic：同 runSeed / command history 得到同样实例。
4. 生成完成后写入唯一 GameState optional runtime 字段。
5. 新增 `initialize-sublocations` SessionCommand / 等价命令：
   - 只允许 R09 knowledge 已初始化的 V2 adult；
   - 只执行一次；
   - 进入 debug log / digest / replay / persistence；
   - 不推进时间。
6. R11 区域探索成功完成后，调用最小发现 resolver：
   - 只检查当前 wilderness；
   - 使用累计 exploredDays 与固定 threshold；
   - 达标实例变 discovered；
   - 不重新生成实例；
   - 不改变其他区域实例。
7. 如果 R11 探索途中寿终，没有增加 exploredDays，也不得触发新子地点发现。
8. 已发现子地点进入当前区域页面的“已确认子地点”列表。
9. 未发现实例不泄露数量、archetype 或门槛。
10. 发现结果可以附加在本次探索结果页，但不写逐次 Chronicle 流水账；如果首次发现是值得记录的世界事实，可暂时只进入状态，Chronicle 聚合规则后续统一处理。
11. 本轮不允许点击进入子地点形成独立场景页；可以把“已确认子地点”做成不可操作的信息项，进入 / 访问由后续轮次负责。
12. 不把子地点自动升级成 `knowledge.locations` 的 fixed-world id；R09 fixed location knowledge 与 R12 sublocation knowledge 是不同层级，避免污染 11 个固定节点命名空间。
13. 保存 / 刷新保持实例与 discovered 状态。
14. `initialize-sublocations` 与发现后的 `explore-region` 都必须可 replay。
15. 保持 R05～R11、Archive、legacy replay 兼容。
16. 更新 `HANDOFF.md`；成功后把 `CURRENT_TASK.md` 切到 R13。

---

## 必须测试

至少覆盖：

1. 只生成 4～6 个实例；
2. 只挂在 3 个 wilderness；
3. archetype 与父区域适配合法；
4. 同 seed / replay 生成结果一致；
5. 不同 seed 至少存在组合变化；
6. 初始化只执行一次；
7. 初始化不推进 worldDay；
8. 未发现实例不进入玩家可见 view model；
9. 3 / 8 / 18 / 30 等 threshold 边界发现正确；
10. 一次长探索可同时跨过多个门槛；
11. 探索 A 区不发现 B 区子地点；
12. 已发现状态不回退；
13. 寿终探索不触发发现；
14. 子地点状态不修改灵石、修为、关系、fixed location knowledge、currentLocationId；
15. 保存 / 刷新保持；
16. SessionCommand 可 replay；
17. 没有 sublocation 字段的 R05～R11 旧状态仍合法；
18. legacy adult 不被强制生成新世界子地点。

---

## UI 原则

1. 继续以当前固定区域页面为主，不另做大地图。
2. 只显示 `discovered` 子地点。
3. 未发现数量不显示 `2/5` 之类提示。
4. 子地点列表只展示 archetype 级别已确认信息，不显示假资源和假危险度。
5. 不给未实现的“进入洞府 / 搜索药谷 / 清剿兽巢”假按钮。
6. 不显示发现概率。
7. 不显示内部 threshold 数值。
8. 不做迷雾动画、粒子特效或第三方地图库。

---

## 本轮禁止

- 不补完整 8～12 个正式子地点内容池；
- 不做资源掉落；
- 不做采集；
- 不做妖兽生成；
- 不做战斗；
- 不做子地点内部节点；
- 不做秘境；
- 不做洞府宝箱；
- 不做遗迹传承；
- 不做寒潭鳞蟒；
- 不做独角苍狼；
- 不做随机 NPC；
- 不做旅行事件；
- 不接 LLM API；
- 不回到 legacy `ActionPanel`。

---

## 验收标准

1. 每一世拥有有限、稳定、可重放的随机子地点组合。
2. 同一人生刷新不改变组合。
3. 不同人生组合可以不同。
4. 未发现地点完全不泄露。
5. R11 探索天数能逐步揭示当前区域子地点。
6. 已发现子地点能在当前区域页面看到。
7. 不生成奖励、战斗或剧情假内容。
8. 不污染 fixed-world knowledge。
9. replay / V3 保存正常。
10. R05～R11 旧 digest 兼容。
11. `npm run typecheck` 通过。
12. `npm test` 通过。
13. `npm run build` 通过。
14. `HANDOFF.md` 已更新。

完成后立即停下，不得自行进入 R13。
