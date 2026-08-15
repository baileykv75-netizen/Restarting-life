# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R11 区域页面 + 探索动作已完成，下一轮进入 R12 随机子地点。**
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
- R11：黑风山 / 灵溪谷 / 万兽岭的固定区域探索进度、风险展示、1/3/10 天探索与 replay / persistence 完成。
- legacy Action/Event/Result/End 只为旧档、旧测试与迁移兼容保留，不得继续扩张。

## 内容真源与仍待后续补齐的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

仍需在对应轮次前补齐或冻结：

1. 炼气 → 筑基、筑基 → 金丹的具体突破资源与流程；
2. 筑基至金丹级主修传承；
3. 2～3 个具体延寿物；
4. **R12 随机子地点具体内容池：目标 8～12 个；当前 Bible 只冻结了洞府 / 药谷 / 兽巢 / 遗迹等内容家族，不能由实现者临时批量编造细节；**
5. 1～2 个小秘境；
6. 8～12 个重大机缘具体内容；
7. 30 个普通事件正式正文。

## R05～R10 已完成摘要

- R05：三个出生候选一次生成并保存，选择后进入唯一 GameState。
- R06：16 个童年关键节点走 Session / replay / persistence，结束准确到 16 岁。
- R07：8 出身按灵根、童年、关系和出生 seed 形成不同成年入口。
- R08：11 个固定地点进入 static data，`initialize-world` 只物化 `world.currentLocationId`。
- R09：`knowledge.locations` 成为玩家认知唯一真源；Unknown 隐藏、Rumored 模糊、Discovered 完整；地图不再全知。
- R10：11 条固定无向路线有正式旅行时间；普通旅行与快速前往均推进唯一 `worldDay` 并进入 replay / persistence。

R10 代码 CI：run `31876717239`，verify job `94993440316`，typecheck / test / build 全通过。  
R10 最终交接 CI：run `31876815400`，verify job `94993678674`，typecheck / test / build 全通过。

## R11｜区域页面 + 探索动作

### 探索状态与兼容

新增可选 `GameState.exploration`：

```ts
interface ExplorationState {
  locations: Record<string, { locationId: string; exploredDays: number }>
}
```

兼容规则已经锁定：

- `createInitialGameState()` **不写空 exploration**；
- R05～R10 旧人生 / replay 因此不会平白多一个空字段；
- 第一次成功完成 R11 探索后才 materialize；
- V3 保存 / 读取会保留并克隆已有探索进度；
- 未探索的其他区域不会被自动补零记录。

### 首版可探索区域

只有 R08 中 `type = wilderness` 的三个固定区域：

- `blackwind_mountain`｜黑风山；
- `lingxi_valley`｜灵溪谷；
- `beast_ridge`｜万兽岭。

白石村、青石镇、临河县、青霞坊市、青云宗、陆家庄、黑风山山脚、青云宗家属区均不会出现 R11 探索按钮。

### 探索阶段

按累计有效探索天数派生：

```text
0 天       尚未系统探索
1–4 天     初步探索
5–14 天    较为熟悉
15–29 天   深入探索
30+ 天     基本探明
```

- 只允许 1 / 3 / 10 天三种时长；
- 阶段没有第五级；
- `surveyed` 后仍可继续探索，但只增加时间和累计天数；
- R11 不写“探索经验值 / 熟练度百分比”。

### 时间与死亡边界

`resolveRegionExploration()`：

- 复用现有 `ADVANCE_TIME / advanceWorldTime`；
- 只有角色活着完成整段探索才增加 `exploredDays`；
- 探索期间寿元耗尽时死亡优先，本次探索不入账；
- 不修改当前位置、地点知识、路线记录、灵石、修为、属性、关系；
- 不触发战斗、伤势、中毒、资源掉落或随机事件。

### 当前风险

区域页同时显示：

- R08 静态客观危险；
- 当前角色风险：`较低 / 可控 / 较高 / 极高`。

当前风险只由地点危险 + 当前境界 / 小阶段确定性派生，不使用 RNG、不显示推荐等级，也不会因为“极高”硬禁止探索。

### Session / UI

新增 `explore-region` SessionCommand：

- 进入 debug log / digest / replay / persistence；
- 成功后显示花费时间、累计探索天数和当前阶段；
- 跨阶段时显示阶段变化；
- **不会逐次向 Chronicle 写日常探索流水账**；
- 地图下方仅在 wilderness 显示区域探索面板与 `探索 1 天 / 3 天 / 10 天`。

R11 没有生成洞府、药谷、兽巢、遗迹，没有假资源表，没有探索随机事件。

### R11 主要提交

- 类型与可选 GameState：`4918e2546acaef4e986ff4246a08a381786f0774`、`f790a37146298eda364325b027455c164444ee04`
- 探索核心：`190f3e112a2ff181b45af7d9331c26ff9cd91845`
- Session / 存档：`7948e67dca43bcb5fb44cb09874f2a30ecc18bf3`、`90fbf2c6775504ec49ec2d0095f32962bc46ee35`
- UI：`a55e03cfd5606414850d65e62e83c64ab298325c`、`65259defa71f8a185a905b48d44d9cfef104b7b0`、`963d59561a61445fb5d8a2cc94540d92e8af7757`
- 测试：`d8ddaafb9bbee75aee2174e0987923aaee49188d`

R11 代码 CI：run `31877727939`，verify job `94995815459`：

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
→ 随机子地点（R12）
→ 资源 / 修炼 / 战斗 / 宗门 / 职业
→ 世界事件 / 完整一世
```

## 下一轮

执行：

> **R12｜随机子地点**

R12 要在 R11 的固定区域探索进度上建立“每一世固定、不同人生组合不同”的子地点运行骨架，并通过探索阶段逐步发现。**但当前具体子地点内容池仍不完整：实现前必须以 Content Bible 已冻结内容家族为边界，不允许 Codex 临时批量创造 8～12 个正式地点。**

具体范围以 `CURRENT_TASK.md` 为准。
