# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R13「沉脉石室」秘境最小闭环已完成，下一轮进入 R14「背包与储物袋」。**
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
- C13：首版第一秘境 **黑风山「沉脉石室」** 内容冻结完成。
- R13：沉脉石室发现、五节点导航、外围一次性资源、核心不可回头、成年岩甲蜥临时生死解析、核心泄压、永久清空、保存 / replay 完成。
- legacy Action/Event/Result/End 只为旧档、旧测试与迁移兼容保留，不得继续扩张。

## 内容真源与仍待后续补齐的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

仍需在对应轮次前补齐或冻结：

1. 炼气 → 筑基、筑基 → 金丹的具体突破资源与流程；
2. 筑基至金丹级主修传承；
3. 2～3 个具体延寿物；
4. **随机子地点正式内容池：目标 8～12 个。R12 当前仍只有洞府 / 药谷 / 兽巢 / 遗迹四类运行 archetype；**
5. 首版第一秘境已经冻结并实现为「沉脉石室」；如后续首版仍需要第 2 个小秘境，再单独做内容冻结；
6. 8～12 个重大机缘具体内容；
7. 30 个普通事件正式正文。

这些缺口不得由实现轮临时编造后反向固化。

---

## R11｜固定区域探索

- 可探索 fixed wilderness：黑风山、灵溪谷、万兽岭。
- 探索时长：1 / 3 / 10 天。
- 阶段：0 未系统探索；1–4 初步；5–14 较为熟悉；15–29 深入；30+ 基本探明。
- `GameState.exploration` 为 optional，第一次完成探索才 materialize，保护 R05～R10 replay digest。
- 探索推进唯一 `worldDay`；寿终途中不增加进度。

R11 代码 CI：run `31877727939`，typecheck / test / build 全通过。

---

## R12｜随机子地点运行骨架

### 运行态

`GameState.sublocations` 保持 optional：

```ts
interface SublocationRuntime {
  id: string
  parentLocationId: string
  archetype: 'cave' | 'herb-valley' | 'beast-nest' | 'ruin'
  discoveryThresholdDays: number
  discovered: boolean
  deepConfirmed?: boolean // R13 起可写入“已深入确认”事实
}
```

### 确定性生成

生成使用独立 seeded RNG：

```text
seedToState(`${runSeed}:r12-sublocations`)
```

不消耗主 `rngState`。首版一世 4～6 个：黑风山 2 个、灵溪谷 1～2 个、万兽岭 1～2 个。

### 发现

第一实例门槛 3 / 8 天，第二实例 18 / 30 天；完成区域探索后只检查当前区域，达标即 discovered。未发现实例不泄露数量、类型和门槛。

R12 代码 CI：run `31878114082`，typecheck / test / build 全通过。

---

## C13｜沉脉石室内容冻结

正式世界定义已回写 `V2_CONTENT_BIBLE.md` 第 34 节。

沉脉石室是黑风山地下古修留下的引脉 / 观测设施，与黑风矿变、碎灵晶、孟家旧矿图、青云宗封矿记录和 E01「黑风矿变遗痕」直接相连，不是空间秘境或高阶仙府。

固定结构：

```text
裂隙矿廊
├─ 渗水药圃
├─ 引脉侧室
└─ 锁脉石门
      ↓ 明确不可回头确认
    脉心室
```

C13 提交：

- 独立冻结：`fc5dca52204e765ae21908bac8ba5c5b2cd6660a`
- Content Bible 合并：`a860e9ae3e9ab16adecde8308d5c770e9d402f4f`
- R13 任务准备：`f99a4eb0172428f90b131722f0cd538d9f6ba49b`

---

# R13｜沉脉石室秘境最小闭环

## 1. Optional 运行态

新增 `src/types/secretRealm.ts`，`GameState.secretRealm` 仍是 optional；`createInitialGameState()` 不写空对象，因此 R05～R12 旧 replay digest 不被被动改变。

核心状态包括：

- 本世 anchor sublocation；
- discovered / active / currentNodeId；
- gateOpened / gateMethod；
- coreLockedBehindPlayer；
- cleared；
- 三处一次性 nodeClaims；
- `ventSequence` / `mineIncidentEvidence`；
- R14 前的 `pendingMaterials`；
- 本世 seeded 固定奖励；
- 临时 encounter `unresolved | victory | death`。

R12 通用子地点只新增 optional `deepConfirmed`，没有扩展成第二套地点系统。

## 2. Bootstrap 与旧档兼容

新增明确 SessionCommand：

```text
initialize-secret-realm
```

- 必须在 R12 `sublocations` 已存在后才能执行；
- 一世只执行一次；
- 不推进时间；
- 不消耗主 RNG；
- 进入 debug log / digest / replay / persistence；
- UI 不显示初始化按钮。

App 在已有 R12 runtime、尚无 R13 runtime 的成年存档加载后会通过该正式命令自动 bootstrap；因此旧存档若黑风山已经探索 30+ 天且 anchor 已发现，可立即按已有事实确认沉脉石室，不需要额外浪费一次探索。

## 3. Anchor 与发现规则

Anchor 只从本世 R12 已生成的黑风山 `cave | ruin` 两个候选中确定：

```text
seedToState(`${runSeed}:r13-sunken-vein-anchor`)
```

同一人生固定，不创建第三个黑风山子地点。

发现必须满足：

- `blackwind_mountain` fixed knowledge = discovered；
- anchor sublocation = discovered；
- 黑风山累计探索 ≥15 天。

15～29 天当前只读取项目中真实存在的提前识别条件：

- `observant`（察微知著）；
- `empty_mind_platform`（空明灵台）。

孟家旧图与寻灵盘路径没有伪造；等真实状态 / 背包系统存在后再接入。30+ 天无需特殊条件。

发现写一条重大 Chronicle，但不改 fixed-world `knowledge.locations`。

## 4. 五节点与时间

`world.currentLocationId` 在整个秘境流程中仍是 `blackwind_mountain`。秘境内部位置只存在于 `secretRealm` runtime。

- 裂隙矿廊：外围枢纽，可退出；
- 渗水药圃：检查 / 采集耗时 1 天；
- 引脉侧室：检查耗时 1 天，获得 `ventSequence`；
- 锁脉石门：安全开启 / 强开均耗时 1 天；
- 脉心室：进入后不可返回外围，直到核心危险解决并泄压。

进入 / 外围节点移动 / 退出本身不推进时间。

若任何 1 天操作中寿元耗尽，现有 `ADVANCE_TIME` 死亡优先，本次资源 / knowledge claim 不会伪造完成。

## 5. R14 前资源边界

本轮没有提前新增通用 InventoryState。

药圃与侧室、岩甲蜥材料统一使用 canonical material id + count 写入：

```text
secretRealm.sunkenVeinChamber.pendingMaterials
```

R14 必须接管这些 pending claims 后再形成正式库存。

本世 seeded 固定资源：

- 药圃：青露草 2～4、水灵苔 1～3、玉髓芝 0～1；
- 侧室：黑铁 1～3、赤纹铁 0～1、碎灵晶 1～2；
- 核心：碎灵晶 2～4、赤纹铁 1～2、岩甲蜥真实材料类别；
- 核心灵石：8～15，直接进入现有 `resources.spiritStones`。

资源池使用独立：

```text
seedToState(`${runSeed}:r13-sunken-vein-rewards`)
```

不扰动主 RNG。

## 6. 锁脉石门与不可回头

石门会展示：灵压差、大型爬行妖兽痕迹、旧阵可能重新闭锁。

当前可用：

- 退回外围；
- 已知 `ventSequence` 时按旧阵泄压顺序开启；
- 强行开启。

R14 前没有真实破灵锥持有状态，因此不显示“使用破灵锥”假按钮。

开门与进入核心是两个独立操作；进入核心前有明确死亡与不可回头警告。确认后 `coreLockedBehindPlayer = true`，外围导航消失。

## 7. 成年岩甲蜥临时生死解析

没有实现通用 CombatEngine、HP、技能栏、正式状态或妖兽 AI。

R13 专用 resolver 只产生：

```text
victory | death
```

使用主 `rngState`。临时成功率严格按 C13 冻结值：

- 凡人 0%；
- 炼气 1～2：20%；
- 炼气 3～5：60%；
- 炼气 6～9：90%；
- 筑基及以上：100%。

安全泄压开门对炼气 +10 个百分点，上限 100%。UI 只显示自然语言风险，不展示百分比。

失败直接进入标准 `dead / endReason`，不自动逃出；R20 正式战斗接入时替换这个 resolver，但不改变秘境结构。

## 8. 核心清空与永久事实

胜利后完成泄压：

- 核心奖励只发一次；
- `cleared = true`；
- `active = false`；
- `currentNodeId = null`；
- `coreLockedBehindPlayer = false`；
- `mineIncidentEvidence = true`；
- flags 写入沉脉石室矿变证据与 cleared；
- anchor 写入 `deepConfirmed = true`；
- `world.currentLocationId` 仍是黑风山；
- 写一条重大 Chronicle。

之后仍可以进入遗迹查看，但不能重新采集药圃、侧室、核心，也不会重刷成年岩甲蜥。

## 9. UI

沉脉石室不作为第 12 个固定地图节点。

只有 `discovered = true` 后，黑风山区域详情才出现真实“沉脉石室”入口。进入后切换至专门的 `SecretRealmPanel`，显示当前位置、可返回分支、一次性资源状态、石门警告与核心状态。

未发现时名称、节点、资源和入口完全不可见。

## 10. 保存与 replay

`saveRepository` 对 secret realm runtime 做独立深拷贝，覆盖：

- nodeClaims；
- knowledge；
- pendingMaterials；
- rewards 三组 material maps。

所有 R13 操作均通过：

```text
SessionCommand
→ resolver
→ GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

专项测试验证真实 selected-birth Session 可以从 bootstrap → 30 天探索发现 → 进入 → 侧室检查后 `verifySessionReplay = true`。

## 11. R13 主要提交与 CI

主要提交：

- runtime types：`09423d17f6b9cb23e813a8de022322ccb5313d15`
- secret realm engine：`63a9dc6bdaf46ee61933fb0ae08827d9cfd8ae2c`
- optional GameState：`96f49f34a8acadb79cb27a767bc811d70b731e18`
- sublocation deep-confirmed fact：`7a74eb7f3cb8cf2bee3b34a2fd91e990de0fb51c`
- Session commands：`c2825a48afd175d24f8b145812d9d7572685e1b5`
- Session routing：`476f0924b4a13fbd7ae0cca4cb455263c3aff03d`
- save/reload：`10a44a311fed1904795b78ebd843f3c986ef4c06`
- realm UI：`b4315d544f186c573abce5a91ee95360f0136875`
- map entry：`2a7b04d8a23b6f9d386788d43847ae3223aa677d`
- App integration：`706fafa2a8bd235bc8f861222c59e98552fa28e7`
- strict engine FIX：`b44b383bc2bc1b0a3feafa26b24dfbbfeec1d3c1`
- lifecycle tests：`707cb026c86a5b860fc8664c5a1954e91cf69ea2`
- test import FIX：`d18eaf9dc24d8ce3cd609b921182195b459175bd`
- legacy R12 auto-bootstrap：`8df2d6ba50be3405cfff1a81acfd694a2007aa88`

最终 R13 代码 CI：run `31881013892`，verify job `95003459087`：

- typecheck：通过；
- test：通过；
- build：通过。

---

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
→ R13 沉脉石室秘境最小闭环 ✅
→ R14 背包与储物袋
→ R15 装备栏与品阶
→ 后续修炼 / 战斗 / 宗门 / 职业 / 世界事件
```

## 下一步

执行：

> **R14｜背包与储物袋**

R14 必须先接管 R13 的 `pendingMaterials`，建立唯一正式物品库存与携带容量，再允许后续地点、战斗和职业系统真正产出物品。

具体范围以 `CURRENT_TASK.md` 为准。
