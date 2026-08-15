# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R10 节点旅行与时间已完成，下一轮进入 R11 区域页面 + 探索动作。**
- R00.1～R00.3：迁移、存档 V3 与开发规则完成。
- R01：唯一 `GameState` 完成。
- R02：统一 `GameAction / SessionCommand / reducer / replay` 边界完成。
- R03：V3 单档自动保存 / 恢复完成。
- R04：V2 Game Shell 完成。
- C00：`V2_CONTENT_BIBLE.md` 为首版具体内容真源。
- R05：出生三选一完成。
- R06：8 出身 × 2 童年关键节点完成。
- R07：成年 / 入道入口完成。
- R08：11 个固定世界节点与当前地点初始化完成。
- R09：地点知识 `Unknown → Rumored → Discovered` 与认知地图完成。
- R10：固定路线、逐节点旅行、旅行时间、已走路线记录与多段快速前往完成。
- legacy Action/Event/Result/End 只为旧档、旧测试与迁移兼容保留，不得继续扩张。

## 内容真源与仍待后续冻结的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

仍需在对应开发轮前补齐，当前不得临时发明：

1. 炼气 → 筑基、筑基 → 金丹的具体突破资源与流程；
2. 筑基至金丹级主修传承；
3. 2～3 个具体延寿物；
4. 8～12 个随机子地点和 1～2 个小秘境；
5. 8～12 个重大机缘具体内容；
6. 30 个普通事件的正式正文。

## R05～R09 已完成摘要

- R05：三个出生候选一次生成并保存，选择后进入唯一 GameState。
- R06：16 个童年关键节点走 Session / replay / persistence，结束准确到 16 岁。
- R07：8 出身按灵根、童年、关系和出生 seed 形成不同成年入口。
- R08：11 个固定地点进入 static data，`initialize-world` 只物化 `world.currentLocationId`。
- R09：`knowledge.locations` 成为玩家认知唯一真源；Unknown 隐藏、Rumored 模糊、Discovered 完整；地图不再全知。

R08 主实现：`74bfbe5eac57f6e8fa0ef4bbf432bd93002bcca9`  
R08-FIX：`13f73a771ea47376b133df8d48c02cf7c8cabcb3`  
R09 代码 CI：run `31876419207`，verify job `94992727564`，typecheck / test / build 全通过。  
R09 最终交接 CI：run `31876499998`，verify job `94992917523`，typecheck / test / build 全通过。

## R10｜节点旅行与时间

### 固定路线数据

新增 `WorldRouteDefinition` 与 `src/data/worldRoutes.ts`。

R08 的 11 条无向邻接边全部有且只有一条正式路线，路线拥有：

- canonical `id`；
- `from / to`；
- 正整数 `travelDays`；
- `stableFastTravel`；
- 简短路线说明。

当前首版旅行时间：

- 白石村 ↔ 青石镇：2 天，稳定；
- 白石村 ↔ 黑风山山脚：1 天，稳定；
- 青石镇 ↔ 青霞坊市：2 天，稳定；
- 青石镇 ↔ 临河县：3 天，稳定；
- 青霞坊市 ↔ 青云宗：1 天，稳定；
- 青云宗 ↔ 黑风山：3 天，不作为快速安全路线；
- 青云宗 ↔ 灵溪谷：2 天，稳定；
- 青云宗 ↔ 万兽岭：4 天，不作为快速安全路线；
- 青云宗 ↔ 青云宗家属区：1 天，稳定；
- 黑风山山脚 ↔ 黑风山：2 天，不作为快速安全路线；
- 灵溪谷 ↔ 陆家庄：1 天，稳定。

### 普通旅行

新增 `resolveTravel()`：

- 只有 R09 已初始化的 V2 adult 能旅行；
- 目的地必须 `discovered`；
- 普通旅行只允许直接邻接节点；
- 时间通过现有 `ADVANCE_TIME / advanceWorldTime` 推进唯一 `worldDay`；
- 活着走完以后才通过 `SET_CURRENT_LOCATION` 抵达；
- 成功走完后使用 `route_traversed:<routeId>` flag 记录路线已亲自走过；
- 不自动发现地点；
- 不修改资源、关系、修为或探索状态；
- 旅行途中若寿元耗尽，死亡优先，地点保持出发地，路线也不会被标记成已走完。

### 快速前往

新增 `findFastTravelPath()` / `resolveFastTravel()`：

- 只使用 `route_traversed:* === true` 且 `stableFastTravel === true` 的路线；
- 路径中地点仍必须是 discovered；
- 使用最短总 `travelDays`；
- 一次推进总时间、一次抵达目标；
- 不能中途停靠或改道；
- 快速前往不是传送，时间不会减少；
- 黑风山、万兽岭等不稳定路线即使走过也不会进入快速路线网。

### Session / UI

新增：

- `travel` SessionCommand；
- `fast-travel` SessionCommand；
- 两者均进入 debug log / digest / replay / persistence；
- 旅行结果明确展示耗时与地点变化；
- 地图只给 discovered 的相邻地点显示 `前往XX · N天`；
- Rumored / Unknown 没有前往按钮；
- 当存在多段已走熟稳定路径时显示快速前往；
- R10 没有旅行随机事件、战斗或路线动画。

### 测试与 CI

新增 `travelEngine.test.ts`，覆盖：

- route data 完整对应 R08 邻接；
- 未发现 / 非相邻目的地拒绝；
- 普通旅行耗时、抵达、route traversed；
- Rumored / Unknown 不进入普通旅行目标；
- 未走过路线不能快速前往；
- 不稳定路线不能快速前往；
- 多段稳定路线按最短总耗时快速前往；
- 寿终途中不伪造抵达；
- 保存恢复位置与 route flag；
- travel SessionCommand 可 replay；
- legacy adult 不被强行套入旅行系统。

R10 路线 / 引擎主要提交：`3666b71f2434d91c40c6d97703cec1fb9eaf2477`、`62313c7c7f03e9be7d16f128c8d8134526dfb6e5`  
R10 Session / UI：`535f78a0f186dec75957e25b4012410b10dd1d94`、`01056ac969b1bc9a9bb7555e44b4db174e670900`、`ef67f67e257285a7c20bb21c747552f2895acf5c`  
R10 测试提交：`901f81091cc00b3472509619001b161ccd76c00e`

R10 代码 CI：run `31876717239`，verify job `94993440316`：

- typecheck：通过；
- test：通过；
- build：通过。

## 当前唯一状态与调度规则

```text
UI / feature
→ SessionCommand
→ GameAction / 对应 resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

禁止 React 直接 mutate 核心状态、页面直接写 localStorage、第二套 GameState/store、未冻结内容临时编造、绕过 replay/persistence。

## 当前迁移主线

```text
出生三选一 ✅
→ 童年关键节点 ✅
→ 成年 / 入道入口 ✅
→ 固定世界骨架 ✅
→ 地点知识状态 ✅
→ 节点旅行与时间 ✅
→ 区域页面 + 探索动作（R11）
→ 随机子地点（R12）
→ 资源 / 修炼 / 战斗 / 宗门 / 职业
→ 世界事件 / 完整一世
```

## 下一轮

执行：

> **R11｜区域页面 + 探索动作**

R11 只负责让已发现的野外固定区域第一次真正可探索：建立探索阶段、可选探索时长、客观危险 / 当前角色风险的最小展示，以及由探索时间推进阶段的闭环。R11 不提前生成 R12 随机洞府、药谷、巢穴或遗迹，不正式掉落资源，也不做战斗。

具体范围以 `CURRENT_TASK.md` 为准。
