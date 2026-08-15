# 当前任务：V2 R11 - 区域页面 + 探索动作

## 本轮唯一目标

让已经发现并亲自抵达的 **固定野外区域** 第一次真正可探索：

> **当前位置是 discovered 野外区域 → 显示区域信息与当前角色风险 → 选择探索 1 / 3 / 10 天 → 推进唯一 worldDay → 累积本区域探索进度 → 更新探索阶段 → 保存 / replay 保持。**

本轮只做“探索这片区域本身”的闭环。**不生成 R12 随机洞府、药谷、巢穴、遗迹，不正式掉落资源，不触发战斗。**

## 内容来源约束

必须先阅读：

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`
4. `V2_MIGRATION_AUDIT.md`
5. `V2_GITHUB_ROADMAP.md`
6. `HANDOFF.md`

继续使用 R08 的 fixed world、R09 knowledge 与 R10 travel。不得在 R11 临时增加新的世界地点或新玩法系统。

## 首版可探索固定区域

本轮只对 `type = wilderness` 的 3 个正式固定区域开放探索：

- `blackwind_mountain`｜黑风山；
- `lingxi_valley`｜灵溪谷；
- `beast_ridge`｜万兽岭。

`blackwind_foothill` 仍是固定入口 / 路线节点，不在 R11 单独建立完整探索进度。聚落、坊市、宗门、家族据点也不显示“探索 1 / 3 / 10 天”。

## 探索阶段冻结

使用 Content Bible 已冻结的四阶段：

1. `initial`｜初步探索；
2. `familiar`｜较为熟悉；
3. `deep`｜深入探索；
4. `surveyed`｜基本探明。

未有探索记录时，不额外写一个 `unknown` stage；直接通过“本区域没有 progress 记录”表示尚未开始系统探索。

首版以 **累计有效探索天数** 推进阶段：

```text
0 天       尚未系统探索
1–4 天     初步探索
5–14 天    较为熟悉
15–29 天   深入探索
30+ 天     基本探明
```

这里的边际递减通过越来越宽的阶段门槛体现：越往后，需要投入更多真实时间才能继续提升熟悉程度。

## 可选探索时长

首版固定：

- 1 天；
- 3 天；
- 10 天。

不要在 R11 做任意数字输入，也不要做 30 天 / 100 天超长快捷按钮。

## GameState 兼容原则

探索进度必须进入唯一 `GameState`，但必须保护 R05～R10 已存在的 replay digest。

推荐等价结构：

```ts
interface RegionExplorationProgress {
  locationId: string
  exploredDays: number
}

interface ExplorationState {
  locations: Record<string, RegionExplorationProgress>
}
```

关键要求：

1. 可以作为 GameState 新增 **可选字段** `exploration?`；
2. **不得修改 `createInitialGameState()` 让所有旧人生从出生就自动多出空 exploration 对象**；
3. 第一次真正执行 R11 探索时才 materialize 探索状态；
4. 这样旧 R05～R10 command replay 的历史 digest 语义保持不变；
5. save clone / migration 对已存在的 exploration 必须深拷贝，旧存档没有该字段时仍合法；
6. 不新建第二套 exploration store。

如果实现者有等价、更小且仍结构化的兼容方案可以使用，但禁止把全部探索进度散落成几十个随意 flags。

## 当前角色风险展示

R11 只做 **派生展示**，不新增推荐等级。

需要显示两层：

1. **客观危险**：继续读取 R08 `WorldLocationDefinition.danger`；
2. **当前风险**：由地点客观危险与当前角色境界 / 小阶段派生一个克制的定性结果。

建议输出：

- 较低；
- 可控；
- 较高；
- 极高。

最小规则可以基于：

- mortal；
- 炼气 1–3；
- 炼气 4–6；
- 炼气 7–9；
- 筑基；
- 金丹；

与 safe / low / moderate / high / extreme 做固定映射。

要求：

- 同一 GameState 得到确定性结果；
- 不使用隐藏 RNG；
- 不显示“推荐炼气五层”之类推荐等级；
- 当前风险只是玩家根据自身已知情况作判断的界面信息；
- R11 不因为“极高”而硬禁止探索。

## 必须实现

1. 新增正式 exploration 类型与 resolver，例如 `resolveRegionExploration(state, days)`。
2. 探索前必须验证：
   - 状态仍 playing；
   - 是 V2 adult；
   - R09 地点知识已初始化；
   - `world.currentLocationId` 合法且 discovered；
   - 当前地点 type 为 wilderness；
   - days 只能是 1 / 3 / 10。
3. 时间必须复用现有 `ADVANCE_TIME / advanceWorldTime`，禁止直接 `worldDay += days`。
4. 如果探索期间寿元耗尽：
   - 死亡优先；
   - 不伪造“完成了这次探索”；
   - 本次不增加 exploredDays；
   - 不增加探索阶段；
   - 当前地点保持原地。
5. 只有角色活着完成整段探索后才累计当前区域 `exploredDays`。
6. 不允许一次探索 A 区却修改 B 区进度。
7. 阶段只允许随累计天数上升，不得下降。
8. 已达到 `surveyed / 基本探明` 后仍可继续探索，但 R11 页面要明确告诉玩家该区域固定骨架已经基本探明；继续探索不会出现“第五阶段”。
9. 新增 `explore-region` SessionCommand / 等价命令，进入 debug log / digest / replay / persistence。
10. 探索结果页只展示当前轮可确定的内容：
    - 花费时间；
    - 累计探索天数；
    - 当前探索阶段；
    - 如果跨阶段，显示 `初步探索 → 较为熟悉`；
    - 不虚构“找到灵药 / 遇到妖兽 / 看见洞府”。
11. **R11 不向 Chronicle 逐次写入每次 1/3/10 天探索。** 这是可重复日常行为，后续《此世传》需要聚合，不得现在制造流水账。
12. 新增最小区域页 / 地图下方区域面板：
    - 当前区域名称与简介；
    - 客观危险；
    - 当前角色风险；
    - 当前探索阶段；
    - 累计探索天数；
    - 1 / 3 / 10 天探索按钮。
13. 非 wilderness 地点不显示探索按钮；继续显示 R10 旅行入口即可。
14. R11 可以声明“已知资源 / 已知妖兽 / 已知子地点”的**空状态位置**，但不得硬编码假内容；如果没有已由世界知识支持的数据，就显示“尚未掌握”或干脆不展示。
15. R11 不通过探索自动发现 R09 rumored 的其他固定节点；固定地点知识状态仍由明确知识来源推进。
16. R11 不生成任何 R12 random sublocation。
17. R11 不给予灵石、材料、修为、属性、关系或职业经验。
18. R11 不造成战斗、伤势、中毒或随机死亡；真实探索风险后续与事件 / 战斗系统接入，本轮先冻结可重放的时间与熟悉度骨架。
19. 保持 R05～R10、Archive、legacy replay 兼容。
20. 新增测试至少覆盖：
   - 只有 3 个 wilderness fixed region 可探索；
   - 聚落 / 坊市 / 宗门 / fixed-entry 不可探索；
   - 1 / 3 / 10 天合法，其他天数拒绝；
   - 探索正确推进唯一 worldDay；
   - exploredDays 只写当前区域；
   - 0 / 1 / 5 / 15 / 30 天边界得到正确阶段；
   - 跨阶段结果正确；
   - surveyed 后没有第五阶段；
   - 极高风险仍不硬阻止；
   - 探索不修改 knowledge、currentLocationId、资源、修为、关系；
   - 寿终途中不增加探索进度；
   - 保存 / 刷新恢复 exploredDays；
   - `explore-region` command 可 replay；
   - 没有 exploration 字段的 R05～R10 状态仍能读取；
   - legacy adult 不被强行套入探索系统。
21. 更新 `HANDOFF.md`；本轮成功后把 `CURRENT_TASK.md` 切换到 R12。

## UI 原则

1. 地图依然是玩家认知地图；探索页不能突然展示全区域资源表。
2. 区域页首先回答：
   - 我现在在哪里；
   - 这里客观有多危险；
   - 以我现在的状态，大致有多危险；
   - 我对这里熟到什么程度；
   - 我准备花多少天继续摸清这里。
3. 按钮自然：
   - `探索 1 天`；
   - `探索 3 天`；
   - `探索 10 天`。
4. 不显示“探索经验 +60”“区域熟练度 37/100”之类游戏化经验条；阶段与累计时间即可。
5. 不显示推荐等级。
6. 不做探索动画、地图迷雾动画或第三方地图库。
7. 文案克制，不写“命运齿轮”“你感到这片山林在呼唤你”等 AI 式句子。

## 本轮禁止

- 不实现 R12 随机子地点；
- 不生成洞府 / 药谷 / 巢穴 / 遗迹；
- 不实现秘境；
- 不掉落正式资源；
- 不做采集收益；
- 不做狩猎收益；
- 不做妖兽遭遇；
- 不做战斗；
- 不做旅行事件；
- 不做伤势 / 中毒结算；
- 不做商店；
- 不做宗门任务；
- 不做正式修炼；
- 不接 LLM API；
- 不回到 legacy `ActionPanel`。

## 验收标准

1. 玩家抵达 discovered wilderness 后能进行 1 / 3 / 10 天真实探索。
2. 探索推进唯一 worldDay 并形成持久的区域探索天数。
3. 探索阶段按 1 / 5 / 15 / 30 天门槛正确推进。
4. 客观危险与当前风险同时可见，且不硬限制高风险探索。
5. 探索结果不伪造资源、妖兽、地点或剧情。
6. 非野外固定地点没有探索按钮。
7. 探索不会改变 location knowledge 或旅行路线状态。
8. 寿终边界正确。
9. replay / V3 保存 / 刷新恢复正常。
10. 旧 R05～R10 replay digest 不因空 exploration 初始字段被改写。
11. 没有提前实现 R12。
12. `npm run typecheck` 通过。
13. `npm test` 通过。
14. `npm run build` 通过。
15. `HANDOFF.md` 已更新。

完成后立即停下，不得自行进入 R12。
