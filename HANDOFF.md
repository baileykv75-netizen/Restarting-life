# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R09 地点知识状态已完成，下一轮进入 R10 节点旅行与时间。**
- R00.1～R00.3：迁移、存档 V3 与开发规则完成。
- R01：唯一 `GameState` 完成。
- R02：统一 `GameAction / SessionCommand / reducer / replay` 边界完成。
- R03：V3 单档自动保存 / 恢复完成。
- R04：V2 Game Shell 完成。
- C00：`V2_CONTENT_BIBLE.md` 为首版具体内容真源。
- R05：出生三选一完成。
- R06：8 出身 × 2 童年关键节点完成。
- R07：成年 / 入道入口分流完成。
- R08：青霞地界 11 个固定节点、邻接关系、当前地点初始化和固定世界骨架 UI 完成。
- R09：地点知识 `Unknown → Rumored → Discovered`、初始知识物化与玩家认知地图完成。
- legacy Action/Event/Result/End 只为旧档、旧测试和迁移兼容保留，不得继续扩张。

## 内容真源与后续仍需冻结的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

仍需在对应开发轮前补齐，当前不得临时发明：

1. 炼气 → 筑基、筑基 → 金丹的具体突破资源与流程；
2. 筑基至金丹级主修传承；
3. 2～3 个具体延寿物；
4. 8～12 个随机子地点和 1～2 个小秘境；
5. 8～12 个重大机缘具体内容；
6. 30 个普通事件的正式正文。

## R05～R08 已完成摘要

- R05：三出生候选一次生成并持久化，选择后进入唯一 GameState；正式出身 / 灵根 / 体质 / 天赋进入 data。
- R06：16 个童年关键节点通过 `childhood-choice` 进入 Session / replay / persistence，结束准确到 16 岁。
- R07：8 出身按灵根、童年、关系和出生 seed 形成不同成年入口；无灵根不获得普通吐纳入口。
- R08：11 个固定地点成为正式 static data；`initialize-world` 仅把 R07 起点 seed 物化为 `world.currentLocationId`，没有提前污染地点知识。

R08 主实现：`74bfbe5eac57f6e8fa0ef4bbf432bd93002bcca9`  
R08-FIX：`13f73a771ea47376b133df8d48c02cf7c8cabcb3`

## R09｜地点知识状态

### 状态语义

`GameState.knowledge.locations` 现在是玩家地点认知唯一运行时真源：

- key 不存在 = `Unknown`；
- `rumored` = 只听说过；
- `discovered` = 已确认 / 真正知道。

只允许：

```text
Unknown → Rumored → Discovered
Unknown → Discovered
```

禁止 discovered 降级，首版没有遗忘系统。

### 初始知识物化

新增 `resolveLocationKnowledgeInitialization()`：

- 读取 R05 的 `location_seed:known:*` → `discovered`；
- 读取 R05 的 `location_seed:rumored:*` → `rumored`；
- R08 当前 `world.currentLocationId` 强制至少 `discovered`；
- 出生 seed 中非法 fixed-world id 会明确失败，不静默忽略；
- 初始化通过 `initialize-location-knowledge` SessionCommand 执行；
- 使用 `location_knowledge_initialized` flag 保证只结算一次；
- **没有修改 R08 旧 `initialize-world` 命令语义**，避免旧 replay digest 失效。

### 后续正式接口

`locationKnowledgeEngine` 已提供：

- `learnLocationRumor(state, locationId)`；
- `discoverLocation(state, locationId)`；
- `setLocationKnowledge(...)`；
- `getLocationKnowledgeStatus(...)`；
- 玩家可见地点 / 可见连接过滤接口。

任何知识写入都先验证地点是否存在于 R08 fixed world。

### 地图表现

R08 的全知骨架图已经改为玩家认知地图：

- Discovered：显示正式名称、类型、简介、客观危险、灵气环境与已知连接；
- Rumored：只显示传闻节点和模糊 `rumorText`，不展示危险 / 灵气 / 资源完整详情；
- Unknown：完全不显示节点；
- 连接线只有两端都在玩家认知中时才绘制；
- 当前地点如果不是 discovered，会停在安全错误页；
- 仍没有旅行 / 探索 / 商店 / 宗门假入口。

### R09 测试

新增并锁定：

- Unknown 用缺 key 表示；
- known / rumored 出生 seed 正确物化；
- 当前地点自动 discovered；
- 初始化幂等；
- rumor 可升级 discovered；
- discovered 不可降级；
- 非法地点无法污染知识表；
- 更高已有知识不会被初始化覆盖；
- 保存 / 刷新保持；
- 初始化 command 可 replay；
- legacy adult 不被强制初始化；
- Unknown 节点和隐藏连接不会进入地图 view model。

R09 实现提交链起点：`6e301f94055105605f3b0013180225492f9fdf79`  
R09 测试提交：`b14dba797c59c28add646e7451390339774dcf3e`  
R09-FIX：修复严格 TS 未使用参数，并将 R02 时代非法占位地点测试改为 canonical id。

最终代码 CI：run `31876419207`，verify job `94992727564`：

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

禁止：React 直接 mutate 核心状态、页面直接写 localStorage、第二套 GameState/store、未冻结内容临时编造、绕过 replay/persistence。

## 当前迁移主线

```text
出生三选一 ✅
→ 童年关键节点 ✅
→ 成年 / 入道入口 ✅
→ 固定世界骨架 ✅
→ 地点知识状态 ✅
→ 节点旅行与时间（R10）
→ 区域探索（R11+）
→ 资源 / 修炼 / 战斗 / 宗门 / 职业
→ 世界事件 / 完整一世
```

## 下一轮

执行：

> **R10｜节点旅行与时间**

R10 只负责在 R08 固定邻接与 R09 玩家认知基础上实现真实移动：相邻已发现地点逐节点旅行、路线耗时推进唯一 `worldDay`、已亲自走过且允许快速通行的路线形成可复用路线记录，并支持沿已知安全路径快速前往。R10 不实现正式旅行随机事件、不做探索收益、不发现随机子地点。

具体范围以 `CURRENT_TASK.md` 为准。
