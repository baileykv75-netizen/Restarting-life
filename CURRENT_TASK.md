# 当前任务：V2 R10 - 节点旅行与时间

## 本轮唯一目标

在 R08 固定世界骨架与 R09 玩家地点认知之上，完成首版真实移动闭环：

> **已发现地点 → 相邻路线 → 查看耗时 → 旅行推进唯一 worldDay → 抵达后更新 currentLocationId → 记录已走路线 → 刷新 / replay 保持。**

本轮不是探索系统，也不是旅行事件系统。重点是让“去另一个地方”第一次真正发生，而不是 UI 直接切页。

## 内容来源约束

必须先阅读：

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`
4. `V2_MIGRATION_AUDIT.md`
5. `V2_GITHUB_ROADMAP.md`
6. `HANDOFF.md`

继续使用 R08 的 11 个固定地点与 R09 的 `knowledge.locations`。不得在 R10 增加随机洞府、秘境、新区域或旅行剧情。

## 旅行规则冻结

1. **普通旅行只允许沿固定邻接边移动。**
2. 目的地必须 `discovered`；`rumored` 只能知道大概存在，R10 不允许直接导航过去。
3. 第一次到新地点仍是一段真实旅程，不能点击任意地图节点瞬移。
4. 距离 / 地形由正式 route data 决定固定基础 `travelDays`，不要在 React 里硬编码。
5. 旅行只使用现有唯一 `worldDay`；不得新增 travel clock。
6. 旅行期间首版不抽随机事件；R10 不需要测试事件。
7. 路线走过以后记录为“已走过”，但不要新建第二套 route store；优先使用明确 flag/tag 或现有 GameState 可兼容字段。
8. 快速前往只允许沿 **全部已走过 + 标记为可稳定通行** 的连续路线。
9. 快速前往仍消耗路线总 `travelDays`，它只是省点击，不是瞬移。
10. 快速前往开始后一次结算到目标地点；首版不做中途改道。
11. 野外 / 高危路线可以正常逐节点旅行，但是否可加入快速安全路线必须由 route data 明确声明，不能仅凭“走过一次”自动安全。
12. 本轮不计算角色移动速度、坐骑、轻身术或负重修正；这些以后再叠加，首版先把固定时间闭环做对。

## 建议路线数据

新增正式 route data，例如：

```ts
interface WorldRouteDefinition {
  id: string
  from: string
  to: string
  travelDays: number
  stableFastTravel: boolean
  description?: string
}
```

要求：

- 每条路线与 R08 邻接一致；
- `from/to` 必须是合法 fixed-world id；
- route id canonical、唯一；
- 同一无向边只定义一次；
- React 不自己推导耗时；
- 首版 route data 只覆盖当前 11 个固定节点的现有连接，不新增地图边。

## 必须实现

1. 新增正式 `WorldRouteDefinition` / 等价静态 route data。
2. 为 R08 所有固定邻接边补齐旅行时间，并做完整性校验：
   - 每条 R08 邻接边恰好有一条 route；
   - route 两端合法；
   - 无重复无向边；
   - `travelDays` 为正整数；
   - `stableFastTravel` 明确声明。
3. 新增旅行 resolver，例如 `resolveTravel(state, destinationId)`：
   - 当前地点必须合法；
   - destination 必须 discovered；
   - destination 必须与当前地点直接相邻；
   - 查到合法 route；
   - 推进 `worldDay`；
   - 处理自然寿元死亡；
   - 只有角色仍存活时才更新 `world.currentLocationId`；
   - 成功完成路线后记录 route traversed。
4. 时间推进必须复用 `ADVANCE_TIME` / `advanceWorldTime` 现有边界；不要自己 `worldDay += travelDays`。
5. 位置更新必须复用 `SET_CURRENT_LOCATION`；不要在 React 直接 mutate。
6. 新增 `travel` SessionCommand / 等价命令，进入 debug log / digest / replay / persistence。
7. 旅行结果自然显示：
   - 去哪里；
   - 花了多久；
   - 已抵达；
   - 不要写 AI 式命运总结。
8. 地图只对 **当前地点的 discovered 相邻地点** 显示“前往”入口；Rumored / Unknown 不提供按钮。
9. 普通前往按钮必须在点击前显示确定耗时，例如：
   - `前往青石镇 · 2天`
10. 抵达后地图当前位置立即改变；刷新保持。
11. 首次成功走过路线后标记该 route 已 traversed。
12. 新增最小快速前往 resolver：
   - 目标必须 discovered；
   - 使用只由 `traversed && stableFastTravel` route 组成的路径；
   - 找不到路径则不可快速前往；
   - 使用最短总 travelDays 路径；
   - 一次推进路径总天数，再抵达目标；
   - 不生成中途事件；
   - 不允许选择中途停靠。
13. 快速前往 UI 只在至少存在一个合法非当前目标时显示，不做独立复杂地图模式。
14. 快速前往与普通逐节点旅行都必须可 replay、可保存。
15. 若旅行途中因寿元耗尽死亡：
   - 角色死亡状态优先；
   - 不应伪造“成功抵达”；
   - currentLocationId 保持出发地点或明确的首版约定，不做半路节点模拟。
16. 不在 R10 自动把相邻地点变 discovered；地点发现仍由 R09/R11 知识系统控制。
17. 不在旅行时偷偷修改探索阶段、资源、关系、修为或事件 flags（除 route traversed）。
18. 保持 R05～R09、Archive、legacy replay 兼容。
19. 新增测试至少覆盖：
   - route data 完整对应 R08 邻接；
   - 非 discovered 目的地不可旅行；
   - 非相邻地点不可普通旅行；
   - 普通旅行时间正确；
   - 抵达后 currentLocationId 正确；
   - route traversed 只在成功抵达后记录；
   - 刷新保存保持位置与 route 记录；
   - 普通旅行 command 可 replay；
   - 已走过但 `stableFastTravel=false` 不可用于快速路线；
   - 多段安全路径快速前往总天数正确；
   - 未走过的边不能用于快速前往；
   - rumored / unknown 地点不出现在可旅行目标；
   - 旅行导致寿终时不伪造抵达；
   - legacy adult 不被强行套入新旅行系统。
20. 更新 `HANDOFF.md`；本轮成功后把 `CURRENT_TASK.md` 切换到 R11。

## UI 原则

1. 地图继续是**角色认知地图**，不是全知地图。
2. 当前位置详情下面显示可前往的 discovered 相邻地点。
3. 按钮文案自然：`前往青石镇 · 2天`，不要写“执行 MOVE action”。
4. Rumored 节点可以看见，但没有“前往”按钮。
5. Unknown 继续完全隐藏。
6. 快速前往是省重复点击，不是传送，因此必须显示总耗时。
7. 不显示推荐等级。
8. 不加入移动动画、路径寻路动画或第三方地图库。

## 本轮禁止

- 不实现 R11 探索时长 / 探索阶段；
- 不通过旅行自动发现 rumored 地点；
- 不做随机旅行事件；
- 不做伏击 / 战斗；
- 不做资源采集；
- 不做随机子地点；
- 不做秘境；
- 不做商店；
- 不做宗门任务；
- 不做正式修炼；
- 不做坐骑 / 轻身术 / 负重移动修正；
- 不接 LLM API；
- 不回到 legacy `ActionPanel`。

## 验收标准

1. 已发现的相邻固定节点可以真实旅行。
2. 每条旅行路线有正式静态耗时，不由 UI 猜测。
3. 普通旅行正确推进唯一 `worldDay`。
4. 非相邻 / 未发现地点不能普通前往。
5. 已走过的稳定路线可组成快速前往路径。
6. 快速前往仍按路径总时长推进时间。
7. travel / fast-travel 都进入 Session / replay / persistence。
8. 刷新保持当前位置与路线记录。
9. 旅行不污染地点知识、探索状态或其他系统。
10. 寿终边界正确。
11. 没有提前实现旅行事件或 R11 探索。
12. `npm run typecheck` 通过。
13. `npm test` 通过。
14. `npm run build` 通过。
15. `HANDOFF.md` 已更新。

完成后立即停下，不得自行进入 R11。
