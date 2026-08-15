# 当前任务：V2 R08 - 固定世界骨架

## 本轮唯一目标

把 `V2_CONTENT_BIBLE.md` 已冻结的 **青霞地界** 做成首版固定节点世界：

> **静态地点数据 → 明确邻接关系 → R07 成年起点 seed 物化为正式当前地点 → 最小地图 / 地点骨架可视化 → 停在 R09 地点知识状态之前。**

本轮不是探索系统，也不是旅行系统。先把“世界到底有哪些地方、彼此怎么连、角色现在站在哪里”做成唯一可信结构。

## 内容来源约束

必须先阅读：

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`
4. `V2_MIGRATION_AUDIT.md`
5. `V2_GITHUB_ROADMAP.md`
6. `HANDOFF.md`

不得临时发明新的大区域、秘境或随机地点。

## 首版固定世界

优先使用 Content Bible 已冻结的青霞地界结构，不照搬旧 roadmap 的临时占位：

```text
                     万兽岭
                        │
       黑风山 ─── 青云宗 ─── 灵溪谷
          │             │
          │          青霞坊市
          │             │
       白石村 ───── 青石镇
                        │
                     临河县
```

同时保留 R07 已经真实使用的固定生活锚点：

- `blackwind_foothill`：黑风山山脚，属于黑风山外围固定入口；
- `lu_estate`：陆家庄，属于灵溪谷 / 陆家固定生活节点；
- `qingyun_family_quarters`：青云宗外围家属区域，属于青云宗固定生活节点。

这些可以做成独立可定位节点，也可以做成固定子节点；但必须有唯一 canonical id，并能映射到上面的世界骨架。不得把它们当随机子地点。

## 必须实现

1. 新增正式静态地点定义层，例如 `src/data/worldLocations.ts`；React 中不得硬编码整张地图。
2. 每个固定地点至少包含：
   - `id`；
   - 名称；
   - 类型（凡俗聚落 / 修仙聚落 / 宗门 / 家族据点 / 野外区域 / 固定入口等）；
   - 简短描述；
   - 客观危险等级；
   - `qiDensity` 或等价灵气环境等级；
   - 邻接地点 id；
   - 当前阶段可声明的 `activityTags` / allowed-action seeds；
   - 所属父区域 / 锚点（如适用）。
3. 地点 id 必须复用已经在 R05 / R07 出现的 canonical seed，至少覆盖：
   - `baishi_village`；
   - `qingstone_town`；
   - `linhe_county`；
   - `qingxia_market`；
   - `qingyun_sect`；
   - `blackwind_mountain`；
   - `blackwind_foothill`；
   - `lingxi_valley`；
   - `lu_estate`；
   - `beast_ridge`（对应万兽岭）；
   - `qingyun_family_quarters`。
4. 邻接关系必须与 Content Bible 的世界关系一致，并进行数据完整性测试：
   - 所有邻接 id 存在；
   - 需要双向的连接不得只写一边；
   - 不允许孤立的正式起始节点；
   - 不允许重复 id。
5. 新增最小 world initializer / resolver，将 R07 已完成的：
   - `adultEntry.startingLocationSeed`；或
   - 兼容旧 R07 状态的 `flags.adult_starting_location_seed`
   物化为唯一 `world.currentLocationId`。
6. 上述物化必须通过统一 SessionCommand / GameAction / resolver 边界完成并进入 debug log / digest / replay / persistence；不得让 React 首次渲染时直接修改 GameState。
7. R08 只物化 **当前地点**。不要在本轮大规模把 `location_seed:*` 转成 `knowledge.locations`；完整 `unknown → rumored → discovered` 由 R09 实现。
8. 若成年起点是固定子节点（如 `blackwind_foothill / lu_estate / qingyun_family_quarters`），必须能明确知道其父区域，但不要偷偷把父区域全部标记为 discovered。
9. 新增最小地图 / 世界骨架 UI：
   - 能看出固定地点和主要连接关系；
   - 明确标出“你在这里”；
   - 当前阶段只作为世界结构视图，不做点击旅行；
   - 不显示“前往”按钮；
   - 不把未实现的探索、商店、宗门任务做成可点击假入口。
10. 地图可以使用纯 React / CSS / SVG；不引入大型地图库。
11. 地点详情最小显示：名称、类型、简述、客观危险、灵气环境；只展示静态世界事实。
12. 当前地点没有合法定义时必须安全失败 / 显示明确开发错误，不得静默回落到青霞坊或旧版主循环。
13. R07 “成年起点已确定”安全页在 world 初始化前仍应可恢复；初始化成功后进入 R08 世界骨架页。
14. 保持 R05 / R06 / R07 / Archive / legacy replay 兼容。
15. 新增测试至少覆盖：
   - 固定地点 id 唯一；
   - 邻接引用合法且预期双向；
   - 11 个首版固定节点全部存在；
   - 8 个出身在完成 R07 后都能把 starting location seed 映射到合法地点；
   - R07 子节点起点有合法父区域；
   - world initializer 只能结算一次 / 幂等；
   - currentLocationId 刷新恢复；
   - world 初始化 command 可 replay；
   - 初始化不会提前污染 `knowledge.locations`；
   - legacy adult 不会被强行套入新地点。
16. 更新 `HANDOFF.md`；本轮成功后把 `CURRENT_TASK.md` 切换到 R09。

## 建议的数据结构

可以使用等价结构，不强制命名：

```ts
interface WorldLocationDefinition {
  id: string
  name: string
  type: 'mortal-settlement' | 'cultivation-market' | 'sect' | 'clan-estate' | 'wilderness' | 'fixed-entry'
  description: string
  danger: 'safe' | 'low' | 'moderate' | 'high' | 'extreme'
  qiDensity: 'none' | 'thin' | 'low' | 'medium' | 'high'
  adjacentLocationIds: string[]
  activityTags: string[]
  parentLocationId?: string
}
```

本轮不要新增第二套运行时世界状态。静态地点定义属于 data；角色当前在哪里仍写进现有 `GameState.world.currentLocationId`。

## UI 原则

1. 地图首先回答：**世界有哪些固定地方、它们怎么连、我现在在哪。**
2. 不需要做成自由拖拽开放世界地图。
3. 与游戏现有低饱和、克制界面保持一致。
4. 连接线比花哨背景更重要。
5. 当前位置需要明显但不刺眼。
6. 不展示“推荐等级”。
7. 可以展示客观危险词，例如：安全 / 较低 / 一般 / 较高 / 危险。
8. 本轮不要计算“对当前角色风险”；该逻辑留给后续区域与探索系统。

## 本轮禁止

- 不实现 R09 的完整地点知识状态流转；
- 不实现传闻获取 / 搜索确认；
- 不实现 R10 旅行；
- 不推进 travelDays；
- 不做快速旅行；
- 不做旅行事件；
- 不实现 R11 探索阶段；
- 不做随机洞府、药谷、巢穴、遗迹；
- 不做秘境；
- 不做资源刷新；
- 不做战斗；
- 不做商店交易；
- 不做宗门贡献 / 任务；
- 不做正式修炼；
- 不接 LLM API；
- 不回到 legacy `ActionPanel`。

## 验收标准

1. 青霞地界固定世界骨架成为正式 data，而不是 UI 文案。
2. 11 个固定节点与连接关系完整、无非法引用。
3. R07 的成年起始地点可进入 `world.currentLocationId`。
4. 页面能看到固定世界结构和当前位置。
5. 地图没有可点击旅行假功能。
6. `knowledge.locations` 未被 R08 偷偷做成完整知识系统。
7. 刷新保持当前地点。
8. replay 可重建 world 初始化。
9. legacy 四按钮不会重新出现。
10. `npm run typecheck` 通过。
11. `npm test` 通过。
12. `npm run build` 通过。
13. `HANDOFF.md` 已更新。

完成后立即停下，不得自行进入 R09。
