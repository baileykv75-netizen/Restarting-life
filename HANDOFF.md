# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**C16「修炼与突破内容冻结」已完成，下一轮进入 R16「基础修炼」。**
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
- R14：正式 `InventoryState`、R13 材料接管、12 槽容量、堆叠、大型物品占位、丢弃、小型储物袋 24 槽扩容、保存 / replay 完成。
- R15：正式四槽 `EquipmentState`、装备 / 卸下、装备引用不复制库存、丢弃保护、十件首版装备数据、阶 + 品 formatter、UI、保存 / replay 完成。
- C16：炼气修炼环境、炼气九层意义、炼气→筑基、筑基→金丹、三条筑基后传承与突破资源正式冻结。
- legacy Action/Event/Result/End 只为旧档、旧测试与迁移兼容保留，不得继续扩张。

## 内容真源与仍待后续补齐的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

C16 已解决此前挂账的：

- 炼气 → 筑基具体准备、资源、时间、成功修正与失败后果；
- 筑基 → 金丹具体准备、资源、时间、成功修正与失败后果；
- 青云宗正统、散修 / 遗迹、邪道三条筑基至金丹前主修延续。

仍需在对应轮次前补齐或冻结：

1. **2～3 个具体延寿物**：C16 已明确暂不补；在延寿资源第一次进入重大机缘、交易、秘境或寿元决策玩法前冻结；
2. **随机子地点正式内容池：目标 8～12 个。** R12 当前仍只有洞府 / 药谷 / 兽巢 / 遗迹四类运行 archetype；
3. 首版第一秘境已经冻结并实现为「沉脉石室」；如后续首版确实需要第 2 个小秘境，再单独做内容冻结；
4. **8～12 个重大机缘具体内容**：C30 前补；
5. **30 个普通事件正式正文**：进入对应普通事件 / 世界事件内容轮前补；
6. **青锋剑、黑铁重剑、赤纹刀、青竹灵弓、黑铁护甲、青狼软甲、护心镜、镇灵玉、流云靴、寻灵盘的具体“阶 + 品”尚未逐件冻结。** R15 只实现结构与“品阶未标定”显示；在这些装备首次真正影响战斗 / 交易 / 制造平衡前统一冻结。

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
  deepConfirmed?: boolean
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

核心状态包括：本世 anchor、discovered / active / currentNodeId、gateOpened / gateMethod、coreLockedBehindPlayer、cleared、三处一次性 nodeClaims、`ventSequence` / `mineIncidentEvidence`、R14 前的 `pendingMaterials`、seeded 奖励与临时 encounter。

## 2. Bootstrap 与旧档兼容

`initialize-secret-realm` 是正式 SessionCommand：一世只执行一次，不推进时间、不消耗 RNG，进入 debug log / digest / replay / persistence，UI 不显示初始化按钮。

## 3. Anchor 与发现规则

Anchor 只从本世 R12 已生成的黑风山 `cave | ruin` 候选中确定，使用：

```text
seedToState(`${runSeed}:r13-sunken-vein-anchor`)
```

发现需要 fixed 黑风山已 discovered、anchor 已 discovered、累计探索 ≥15 天；15～29 天只读取现有 `observant` / `empty_mind_platform` 提前识别条件，30+ 天无需特殊条件。

孟家旧图与寻灵盘路径没有伪造；寻灵盘已在 R15 形成真实装备定义，但尚无真实获得来源，也尚未接入发现 resolver。

## 4. 五节点与时间

`world.currentLocationId` 始终为 `blackwind_mountain`，秘境内部位置只存在于 `secretRealm` runtime。药圃、侧室、开门各耗时 1 天；核心确认后不可回头，死亡优先于资源领取。

## 5. 资源交接边界

R14 已把 R13 `pendingMaterials` 正式接入 inventory：旧档在 `initialize-inventory` 时原子迁移；新秘境领取在同一 SessionCommand 内立即转入背包；容量不足则整次领取动作回滚。

## 6. 成年岩甲蜥临时解析

R13 仍只有秘境专用 victory / death resolver，不是正式 CombatEngine；R20 再替换，不改变秘境结构。

最终 R13 代码 CI：run `31881013892`，verify job `95003459087`，typecheck / test / build 全通过。

---

# R14｜背包与储物袋

## 1. 唯一正式库存

`GameState.inventory` optional；正式背包只通过 `initialize-inventory` SessionCommand materialize，不存在 React 第二套库存。

基础规则：基础 12 槽；普通材料 10 份 / 栈；大型岩甲蜥背甲 2 槽 / 件；小型储物袋自身占 1 槽并提供 +12，有效 24 槽，多个袋不叠加容量。

## 2. R13 原子接管

旧 pending 只有全部可迁入时才清空；新秘境材料在 inventory 已存在时立即转入。容量不足整条领取回滚，因此不存在长期第二库存。

## 3. 丢弃与保存

`inventory-drop(itemId, quantity)` 走 SessionCommand → GameState → debug log / digest / replay → save。R14 时 UI 只暴露真实丢弃动作。

最终 R14 功能 CI：run `31881973031`，verify job `95005729147`，typecheck / test / build 全通过。

---

# R15｜装备栏与品阶

## 1. Optional EquipmentState

新增：

```ts
interface EquipmentState {
  mainWeaponItemId: string | null
  armorItemId: string | null
  protectiveArtifactItemId: string | null
  supportArtifactItemId: string | null
}
```

`GameState.equipment` 保持 optional，保护 R05～R14 旧 replay digest；只通过 `initialize-equipment` SessionCommand materialize，不推进时间、不消耗 RNG。

四槽固定为：主武器 / 护甲 / 护身法器 / 辅助法器。没有头盔、鞋独立槽、副手、戒指、宝石或套装槽。流云靴归辅助法器；小型储物袋继续由 R14 `inventory.storageBagItemId` 独立管理容量。

## 2. 装备引用语义

正式命令：

```text
initialize-equipment
equip-item(itemId)
unequip-slot(slot)
```

装备只是对 inventory 中真实拥有物品的引用：

- equip 不从背包删除物品；
- 同槽替换只替换引用；
- 旧装备仍在 inventory；
- unequip 只清空槽，不“返还”第二份物品；
- 所有命令进入 debug log / digest / replay。

## 3. 丢弃保护

R15 把“装备引用必须有真实库存”提升为状态不变量：

- 正在装备的最后 1 份不能丢弃，提示“请先卸下正在装备的物品”；
- 同 id 若有 2 份以上，可丢弃多余份，但至少保留 1 份；
- 不自动替玩家卸下再丢弃；
- 小型储物袋继续沿用 R14 自己的容量检查。

## 4. 首版十件装备定义

只登记 Content Bible 15 节已有内容，不新增获取来源：

主武器：青锋剑、黑铁重剑、赤纹刀、青竹灵弓。

护甲：黑铁护甲、青狼软甲。

护身法器：护心镜、镇灵玉。

辅助法器：流云靴、寻灵盘。

柳叶双刃未加入；破灵锥 / 雷火珠 / 困兽索不进四槽；小型储物袋不进 EquipmentState。

装备未来机制只以 `description / ruleTags` 记录 hook，没有提前执行攻击速度、伤害、HP、先手、逃跑或寻灵盘探测逻辑。

## 5. 阶 + 品

`ItemDefinition` 新增 optional：

```ts
equipmentSlot?: EquipmentSlot
tier?: number
quality?: 'low' | 'mid' | 'high'
```

formatter 已支持：一阶下品 / 一阶中品 / 一阶上品 / 二阶下品等。

十件装备的具体品阶尚未在 Content Bible 逐件冻结，因此 R15 全部显示：

> 品阶未标定

没有随机稀有度、颜色品质、战力评分、强化等级或耐久。

## 6. UI

人物面板新增四槽装备区：显示槽位、装备名、品阶与真实“卸下”动作。

InventoryPanel 对真实拥有的可装备物显示槽位、品阶、简短机制描述以及真实“装备”动作；当前已装备显示“已装备”。不存在强化 / 升星 / 耐久 / 推荐装备 / 战力按钮。

## 7. 保存 / replay / 测试

`saveRepository` 对 optional EquipmentState 做独立对象拷贝。专项测试覆盖旧状态兼容、bootstrap、槽位、装备引用、丢弃保护、品阶 formatter、save / reload 与 Session replay。

主要提交：

- 核心类型 / engine / item definitions / Session：`29f9ad9a7672ce68f1d8ad6aa27439025b029df0`
- UI / persistence / tests：`2ffc3bb2fe44d1c95b69c1fafe4e528e5a0172bc`
- TypeScript 测试类型修复：`66e2e916ce2f11960f38dad999c272a739336d1b`

最终 R15 功能 CI：run `31882788248`，verify job `95007583400`，typecheck / test / build 全通过。

---

# C16｜修炼与突破内容冻结

正式内容已写入 `V2_CONTENT_BIBLE.md` 第 35 节。C16 只修改内容文档，没有修改 `src/`。

## 1. 炼气阶段与环境

继续使用第 16 节已有 10 门基础主修 / 邪修内容，不扩功法池。

炼气世界节奏：

```text
炼气初期 1～3
→ 炼气中期 4～6
→ 炼气后期 7～9
→ 九层 100% 后进入筑基准备
```

小层不需要每层专属丹药或剧情任务。

修炼环境正式区分：

- 白石村 / 青石镇 / 临河县：贫薄；
- 青霞坊公共区域：普通；静修院可付费获得良好 / 更稳定环境；
- 青云宗：良好且稳定，内门 / 核心区域可上佳，但受权限控制；
- 灵溪谷：良好，木 / 水环境自然；
- 黑风山：局部不错但灵气紊乱，高风险不等于自动高收益；
- 万兽岭：部分灵气不错，但妖兽干扰使长期闭关不稳定。

## 2. 炼气 → 筑基

新增世界资源：

> **凝基丹｜二阶下品**

高价值准备项但不是强制门票，正常价值约 180～260 下品灵石。来源连接青云宗丹堂、陆家、私人交易与西渠，不加入首版七张玩家炼丹配方。

正式筑基：

- 炼气九层 100% 后可准备；
- 一次按 14 日结算；
- 可见修正读取灵根 / 主修契合、功法稳定与熟练、伤势 / 经脉、静心守一、环境、破障丹、凝基丹、30 / 60 灵石投入与师长指点；
- 允许裸冲，但低准备不是正常最优解；
- 普通路线成功率上限建议 95%；
- 失败分轻 / 重 / 极端，分别造成修为倒退、经脉伤 / 30～60 日恢复、严重反噬；极端失败内部约 50% 死亡；
- 不设置额外突破冷却。

精确公式留给 R18。

## 3. 筑基至金丹前三条主修延续

### 青云宗正统

> **《青元归真经》**

《青元引气诀》的筑基后正式延续，可稳定修至金丹初成。完整传承掌握在传功堂与真正师父 / 长老手中，筑基并不等于免费拿到结丹要诀。

### 散修 / 遗迹

> **《归元守一篇》**

广适性的散修筑基法，可修至结丹。主体章节约 120～200 灵石等价，结丹要诀约 300～500 等价；通过私人收藏、西渠、遗迹线索或真实战利品获得，不是永久商店货架，也不是沉脉石室直接掉落的神功。

### 邪道

> **《阴髓录·凝煞篇》**

《阴髓录》筑基后延续。正式转修永久减少 10 年寿元上限，并产生可被针对性识别的身体 / 灵力异常；换来阴寒体系与危险资源利用优势。仍不扩成完整魔宗平行世界。

## 4. 筑基 → 金丹

新增世界资源：

> **抱元丹｜二阶上品**

高价值结丹准备项但不保证成功，常见价值约 650～900 下品灵石；来源连接青云宗丹堂、陆家 / 陆清仪、高阶私人交易与西渠，不加入首版七张玩家炼丹配方。

正式结丹：

- 筑基圆满 100% + 真实结丹法门；
- 一次按 60 日结算；
- 可见修正读取功法 / 熟练、根骨与契合、伤势心神、环境、抱元丹、200 / 400 灵石投入与高阶指点；
- 普通路线成功率上限建议 90%；
- 失败分轻 / 重 / 极端，恢复尺度约 60～120 日、180～360 日或严重反噬；极端失败内部约 60% 死亡；
- 不设置额外冷却。

邪道《阴髓录·凝煞篇》允许使用完整二阶妖丹 + 高品质妖兽精血替代抱元丹；成功结丹后再永久减少 20 年寿元上限，且失败权重更高。

精确公式留给 R19。

## 5. 常规金丹不做雷劫

首版普通筑基 → 金丹不建立独立雷劫系统。特殊事件、邪法反噬或雷灵根异常可产生雷 / 灵气现象，但不等于常规天劫。

## 6. 延寿物继续后置

C16 明确判断：R16～R19 暂不依赖独立延寿物，因此不为了清 TODO 强行补内容。等延寿资源第一次真正进入玩法前，再冻结 2～3 个。

## 7. C16 提交与 CI

Content Bible 冻结提交：`9137885ee78f5e7335921ba3005a7f2620a83073`。

该提交相对 C16 前基线只修改 `V2_CONTENT_BIBLE.md`，diff 为 **+526 / -0**，没有删除旧内容。

CI：run `31883374391`，verify job `95008936703`：

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
→ R14 背包与储物袋 ✅
→ R15 装备栏与品阶 ✅
→ C16 修炼与突破内容冻结 ✅
→ R16 基础修炼
→ R17 功法系统
→ R18 炼气→筑基突破系统
→ R19 金丹前成长闭环
→ 后续战斗 / 宗门 / 职业 / 世界事件
```

## 下一步

执行：

> **R16｜基础修炼**

R16 只实现“当前已有修炼入口 → 选择修炼时长 → 读取灵根 / 主修 / 地点环境等已冻结因素 → 推进唯一 worldDay → 累积炼气修为 / 小层”的基础闭环。

不得顺手实现 R17 的完整功法学习 / 转修 / 熟练度体系，不得提前实现 R18 筑基突破，不得消耗凝基丹 / 抱元丹，也不得进入金丹或战斗系统。

具体范围以 `CURRENT_TASK.md` 为准。
