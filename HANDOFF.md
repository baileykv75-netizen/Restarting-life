# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R12 随机子地点运行骨架已完成。R13 秘境实现前必须先补齐 / 冻结首版秘境具体内容。**
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
- R11：黑风山 / 灵溪谷 / 万兽岭固定区域探索、风险展示、1/3/10 天探索完成。
- R12：每世有限随机子地点、确定性生成、探索门槛发现、隐藏信息隔离与保存 / replay 完成。
- legacy Action/Event/Result/End 只为旧档、旧测试与迁移兼容保留，不得继续扩张。

## 内容真源与仍待后续补齐的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

仍需在对应轮次前补齐或冻结：

1. 炼气 → 筑基、筑基 → 金丹的具体突破资源与流程；
2. 筑基至金丹级主修传承；
3. 2～3 个具体延寿物；
4. **随机子地点正式内容池：目标 8～12 个。R12 当前只有洞府 / 药谷 / 兽巢 / 遗迹四类运行 archetype，没有擅自编造正式命名地点；**
5. **R13 前置：至少 1 个首版小秘境的具体世界来源、入口条件、分支节点、资源内容、核心区风险与退出规则；目前尚未冻结，禁止实现者临时编造；**
6. 后续可再补第 2 个小秘境；
7. 8～12 个重大机缘具体内容；
8. 30 个普通事件正式正文。

## R11 摘要

- 可探索固定 wilderness：黑风山、灵溪谷、万兽岭。
- 探索时长：1 / 3 / 10 天。
- 阶段：0 未系统探索；1–4 初步；5–14 较为熟悉；15–29 深入；30+ 基本探明。
- `GameState.exploration` 为 optional，第一次完成探索才 materialize，保护 R05～R10 replay digest。
- 探索推进唯一 `worldDay`；寿终途中不增加进度。
- 不掉资源、不触发战斗、不生成剧情。

R11 代码 CI：run `31877727939`，verify job `94995815459`，typecheck / test / build 全通过。  
R11 最终交接 CI：run `31877817161`，typecheck / test / build 全通过。

## R12｜随机子地点运行骨架

### 运行态

新增 optional `GameState.sublocations`：

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

兼容规则：

- `createInitialGameState()` 不写空 `sublocations`；
- R05～R11 旧状态仍合法；
- 第一次真正进行 R12 区域探索前，通过统一 `game-action:INITIALIZE_SUBLOCATIONS` 一次 materialize；
- 初始化动作进入 debug log / digest / replay；
- 不推进时间；
- legacy-adult 不允许初始化。

### 确定性生成

生成只使用 `seedToState(`${runSeed}:r12-sublocations`)` 与现有 `randomInt()`：

- 不使用 `Math.random()`；
- 不消耗 / 改写主 `rngState`，避免 R12 改变旧事件随机序列；
- 同一 `runSeed` 始终得到同一组合；
- 不同人生可以不同；
- 一世只生成一次，刷新 / 离开区域不重抽。

首版只生成 **4～6 个实例**：

- 黑风山：固定 2 个，`cave | ruin`；
- 灵溪谷：1～2 个，`herb-valley | ruin`；
- 万兽岭：1～2 个，`beast-nest | ruin`。

这只是运行骨架，不等于正式 8～12 个命名地点内容池。

### 发现规则

每个实例生成时固定一个门槛：

- 第一实例：3 / 8 天之一；
- 第二实例：18 / 30 天之一。

R11 `explore-region` 成功结束后：

- 只检查当前 wilderness；
- 用累计 `exploredDays` 对照固定门槛；
- 达标即 `discovered = true`；
- 一次长探索可以揭示多个实例；
- 已发现永不回退；
- 寿终探索因为不增加 `exploredDays`，也不会触发发现；
- 不修改 fixed-world `knowledge.locations`。

### 信息隔离与 UI

未发现子地点：

- 不进入地图；
- 不进入区域列表；
- 不显示数量；
- 不显示 archetype；
- 不显示发现门槛；
- 不允许直接访问。

已发现后只显示克制的 archetype 级信息：

- 一处洞府遗迹；
- 一片野生药谷；
- 一处兽巢；
- 一处残破遗迹。

当前没有“进入 / 搜索 / 清剿”假按钮，也没有宝物、妖兽、传承、奖励或剧情假内容。

### 保存与 replay

- V3 save / load 保留 `sublocations.generated` 和 discovered 状态；
- load 路径对 exploration / sublocations runtime 做独立深拷贝；
- 初始化通过现有 `game-action` SessionCommand 进入日志；
- 发现通过原有 `explore-region` command 确定性重放。

### R12 主要提交

- runtime type：`42d8bd09114ef5ff598ac5dd8ad2c02f3ebeda73`
- deterministic engine：`c748e2a3ead3b28e8a276b7bcad05668c6ccb41d`
- optional GameState：`673b5ad047df3c3b791a5687562b1f45e85cb505`
- reducer action：`7b80bc7a589c5db09a068a68e59f3408fea9b901`、`3b9e0a1b49ffe28712f2f58154e322feb70e8fd1`
- exploration discovery integration：`60dcb0cf7980567e8a0b7e33a689977d82b6b82e`
- first-exploration initialization：`95bbdf06fb74e73dffdc2fd82129c40b9780e0e6`
- visible UI：`d605bd0cb89c2bf35f40d8feafc7de7ca778f8dd`、`0cf2d98b00d2db30d57372ee5777ba974ba2f841`
- save reload：`89b9503e97c651374077c7b92351d19e24dc7d54`
- tests：`33b949eb8d435ca1b40292e2338cfb3ffa45d750`

R12 代码 CI：run `31878114082`，verify job `94996709406`：

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
→ 区域页面 + 探索动作 ✅
→ 随机子地点 ✅
→ C13 秘境内容冻结（R13 前置）
→ R13 秘境最小闭环
→ R14 背包与物品
→ 后续修炼 / 战斗 / 宗门 / 职业 / 世界事件
```

## 下一步

执行：

> **C13｜首版秘境内容冻结（R13 前置）**

原因：路线要求 R13 做一个真正可玩的分支秘境，并包含资源、占位战斗、核心区不可回头点；但 `V2_CONTENT_BIBLE.md` 尚未冻结任何一个具体秘境。根据 `AGENTS.md`，不能让实现者自行编造世界来源、资源、节点与剧情后反向固化。

C13 只负责把 **1 个首版小秘境** 设计并写回 Content Bible，明确世界来源、入口、4～6 个节点、分支、资源、风险、核心区回头规则和首版占位战斗边界。完成内容冻结后再进入 R13 代码实现。
