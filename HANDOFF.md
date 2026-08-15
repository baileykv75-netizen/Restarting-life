# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**C13 首版秘境内容冻结已完成，下一轮正式进入 R13「沉脉石室」秘境最小闭环。**
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
- C13：首版第一秘境 **黑风山「沉脉石室」** 的世界来源、发现条件、5 节点结构、资源、风险、核心不可回头点和永久后果已冻结。
- legacy Action/Event/Result/End 只为旧档、旧测试与迁移兼容保留，不得继续扩张。

## 内容真源与仍待后续补齐的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

仍需在对应轮次前补齐或冻结：

1. 炼气 → 筑基、筑基 → 金丹的具体突破资源与流程；
2. 筑基至金丹级主修传承；
3. 2～3 个具体延寿物；
4. **随机子地点正式内容池：目标 8～12 个。R12 当前只有洞府 / 药谷 / 兽巢 / 遗迹四类运行 archetype，没有擅自编造正式命名地点；**
5. 首版第一秘境已经冻结为「沉脉石室」；如后续首版仍需要第 2 个小秘境，再单独做内容冻结；
6. 8～12 个重大机缘具体内容；
7. 30 个普通事件正式正文。

## R11 摘要

- 可探索 fixed wilderness：黑风山、灵溪谷、万兽岭。
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

### 发现规则

每个实例生成时固定一个门槛：第一实例 3 / 8 天之一；第二实例 18 / 30 天之一。

R11 `explore-region` 成功结束后只检查当前 wilderness，用累计 `exploredDays` 对照固定门槛，达标即 discovered；寿终探索不增加进度，也不触发发现。

### 信息隔离

未发现子地点不进入地图 / 区域列表，不显示数量、archetype、门槛，也不允许访问。发现后只显示 archetype 级已确认信息。

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

R12 代码 CI：run `31878114082`，verify job `94996709406`，typecheck / test / build 全通过。

## C13｜沉脉石室内容冻结

### 世界定位

正式名称：**沉脉石室**。

它是黑风山地下古修留下的引脉 / 观测设施，不是独立小世界，也不是仙帝洞府。五十多年前深层矿工从侧面打穿外围结构，后续争夺与矿变使其再次封闭，因此自然接入：黑风矿变、碎灵晶、孟家旧矿图、青云宗封矿记录与 E01「黑风矿变遗痕」。

### 本世发现

- 每世 1 个实例，不公开成固定世界节点；
- 从 R12 本世黑风山 `cave / ruin` 子地点中 seeded 选定 1 个入口承载点；
- 必须先发现承载子地点；
- 黑风山探索至少 15 天；
- 15～29 天可由孟家旧图线索 / 察微知著 / 空明灵台 / 寻灵盘提前确认；
- 30 天基本探明后无需特殊条件也可确认；
- 无硬境界门槛。

### 五节点结构

```text
裂隙矿廊
├─ 渗水药圃
├─ 引脉侧室
└─ 锁脉石门
      ↓ 核心不可回头点
    脉心室
```

外围可自由返回裂隙矿廊并退出。

### 冻结资源

渗水药圃：青露草、水灵苔、极少 1 份玉髓芝。  
引脉侧室：黑铁、赤纹铁、碎灵晶，并可获得地点知识「旧阵泄压顺序」。  
脉心室：碎灵晶、赤纹铁、8～15 下品灵石，以及成年岩甲蜥真实材料类别。

全部一次性，不短期刷新。

### 核心不可回头规则

进入脉心室前必须明确提示：石门后灵压紊乱、门会重新闭锁、未找到内侧泄压口无法返回、存在大型爬行妖兽痕迹，并明确可能重伤或死亡。

进入后由内外灵压差触发旧阵闭锁；只有处理核心危险并完成泄压后，才能从侧面断层出口回到黑风山。

### 危险遭遇

脉心室固定 1 只成年岩甲蜥，身份沿用 Content Bible 18.5。R13 只允许最小测试战斗接口，不提前实现 R20 的正式战斗系统。

### 历史证据与永久后果

玩家可确认：凡俗矿工发现深层结构之前，就有人长期维护过黑风山地下灵脉；石室作用偏引导 / 观察灵气。这是 E01 的一块证据，但不能单独解释谁导致矿变、所有失踪者去了哪里。

完成后：核心已泄压 / 已取；资源不刷新；入口承载子地点变为已深入确认；历史知识永久保留；未来孟家 / 青云宗事务可以读取该事实。

### C13 文件与提交

- 审阅冻结记录：`C13_SECRET_REALM_FREEZE.md`
- Content Bible 正式回写：第 34 节「首版第一秘境：沉脉石室」
- C13 独立冻结文件提交：`fc5dca52204e765ae21908bac8ba5c5b2cd6660a`
- Content Bible 合并提交：`a860e9ae3e9ab16adecde8308d5c770e9d402f4f`
- 合并 diff 已复查：`V2_CONTENT_BIBLE.md` 仅 +240 / -3，旧内容未被整份重写。

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
→ C13 沉脉石室内容冻结 ✅
→ R13 沉脉石室秘境最小闭环
→ R14 背包与物品
→ 后续修炼 / 战斗 / 宗门 / 职业 / 世界事件
```

## 下一步

执行：

> **R13｜沉脉石室秘境最小闭环**

R13 只能实现 Content Bible 第 34 节已经冻结的一个秘境，不得自行新增第二秘境、额外材料、上古大能、正式战斗系统或通用背包系统。

具体范围以 `CURRENT_TASK.md` 为准。
