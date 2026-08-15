# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R18「炼气 → 筑基突破系统」已完成，下一轮进入 C19「延寿物与 R19 前内容冻结」。**
- R00.1～R00.3：迁移、存档 V3 与开发规则完成。
- R01：唯一 `GameState` 完成。
- R02：统一 `GameAction / SessionCommand / reducer / replay` 边界完成。
- R03：V3 单档自动保存 / 恢复完成。
- R04：V2 Game Shell 完成。
- C00：`V2_CONTENT_BIBLE.md` 成为首版具体内容真源。
- R05：出生三选一完成。
- R06：8 出身 × 2 童年关键节点完成。
- R07：成年 / 入道入口完成。
- R08：11 个固定世界节点与当前地点初始化完成。
- R09：地点知识 `Unknown → Rumored → Discovered` 与认知地图完成。
- R10：固定路线、逐节点旅行、旅行时间、已走路线与快速前往完成。
- R11：黑风山 / 灵溪谷 / 万兽岭固定区域探索完成。
- R12：每世有限随机子地点、确定性生成、探索发现与保存 / replay 完成。
- C13：首版第一秘境「沉脉石室」内容冻结完成。
- R13：沉脉石室五节点、一次性资源、不可回头核心、临时生死解析、永久清空完成。
- R14：正式背包、R13 材料接管、容量 / 堆叠 / 丢弃 / 储物袋扩容完成。
- R15：四槽装备、装备 / 卸下、库存引用、丢弃保护、阶 + 品结构完成。
- C16：炼气环境、炼气九层意义、炼气→筑基、筑基→金丹、三条筑基后传承正式冻结。
- R16：正式基础修炼、主修选择、1 / 3 / 10 / 30 日修炼、引气入体、炼气 1～9 层推进完成。
- R17：正式功法分类、主修 / 辅修、熟练度四阶段、专门练习、改修成本、Session / save / replay 完成。
- R18：正式 injury runtime、筑基准确成功率、14 日 seeded 冲关、资源消耗、轻 / 重 / 极端失败、真实死亡、调养与 UI 完成。
- legacy Action/Event/Result/End 只为旧档、旧测试与迁移兼容保留，不得继续扩张。

---

## 内容真源与仍待后续补齐的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

C16 已解决：

- 炼气 → 筑基具体准备、资源、时间、成功修正与失败后果；
- 筑基 → 金丹具体准备、资源、时间、成功修正与失败后果；
- 青云宗正统、散修 / 遗迹、邪道三条筑基至金丹前主修延续。

R18 已解决：

- authoritative `injuries` runtime；
- 轻伤 / 重伤 / 经脉伤的活动状态与自然恢复；
- 伤势对 R16 普通修炼与筑基前置条件的真实影响；
- 炼气九层 100% → 筑基前期的正式实现。

仍需在真正依赖它们的轮次前补齐，不得为清 TODO 提前硬编：

1. **2～3 个具体延寿物**：下一轮 C19 正式冻结，供 R19 使用；
2. **随机子地点正式内容池 8～12 个**：R12 目前仍只有洞府 / 药谷 / 兽巢 / 遗迹四类运行 archetype；
3. 如首版确实需要，再冻结第 2 个小秘境；
4. **8～12 个重大机缘具体内容**：C30 前补；
5. **30 个普通事件正式正文**：进入普通事件 / 世界事件内容轮前补；
6. **青锋剑、黑铁重剑、赤纹刀、青竹灵弓、黑铁护甲、青狼软甲、护心镜、镇灵玉、流云靴、寻灵盘的具体“阶 + 品”**：最迟在 R20 正式战斗平衡前做内容冻结，不允许 CombatEngine 临时猜品阶；
7. **完整治疗 / 中毒 / 伤势恶化系统**：R18 只建立突破所需最小 injury runtime；R21 再在同一状态上扩展，不另起第二套伤势系统。

---

# 当前关键世界 / 系统事实

## 世界与探索

- 青霞地界固定世界骨架已经存在；玩家知识与世界真相严格分离。
- 黑风山、灵溪谷、万兽岭支持 1 / 3 / 10 日探索。
- R12 每世生成 4～6 个有限随机子地点，未发现前不泄露。
- 首个秘境固定为黑风山「沉脉石室」，已经完成最小闭环。

## 背包与装备

- `GameState.inventory` 与 `GameState.equipment` 都保持 optional，分别由显式 SessionCommand materialize。
- 基础背包 12 槽，小型储物袋有效提升至 24 槽；大型材料真实占多槽。
- 装备只引用 inventory 中真实拥有的物品，不存在第二库存。
- 首版四槽：主武器 / 护甲 / 护身法器 / 辅助法器。
- 十件装备具体品阶仍未冻结，UI 显示“品阶未标定”。

## 修炼 / 功法

- `resources.cultivation` 是唯一当前小阶段修为进度：1000 点 = 100%。
- `knownTechniqueIds` 是角色真实已学功法唯一真源。
- R17 熟练度只存 `proficiencyPoints`，阶段纯派生：0 / 1000 / 3000 / 6000 = 入门 / 熟练 / 小成 / 大成。
- 普通炼气修炼继续支持 1 / 3 / 10 / 30 日；炼气九层 100% 后停止普通吐纳。
- R18 成功筑基后，R16 普通修炼按钮明确停止；**R18 不实现筑基期继续修炼，也不自动赠送筑基传承。**

---

# R18｜炼气 → 筑基突破系统

## 1. 最小 authoritative injury runtime

新增 optional：

```ts
state.injuries?: {
  conditions: Array<{
    id: string
    kind: 'light' | 'severe' | 'meridian'
    sourceId: string
    startedDay: number
    recoveryDay: number
  }>
}
```

规则：

- 只有真实受伤时才 materialize，不给旧 R05～R17 存档补空对象；
- 是否 active 完全由 `recoveryDay > worldDay` 派生；
- 不保存第二个 `active` 布尔真源；
- 过期伤势可以留在历史数组，但不会继续产生效果；
- `saveRepository` 会深拷贝 conditions。

R18 接回 R16：

- active 轻伤：正式普通修炼收益 ×0.90；
- active 重伤或经脉伤：`cultivate-days` 明确拒绝；
- legacy `performBasicCultivation()` 不读取 R18 伤势，继续只为旧档兼容。

新增最小调养：

```text
recuperate-days(10 | 30)
```

只推进 `worldDay`，不恢复额外属性、不送修为、不写 Chronicle；寿终优先。

## 2. 筑基物品登记

只新增 C16 已冻结内容：

- `pozhang_dan`｜破障丹：沿用一阶上品内容事实，R18 不新编获取来源；
- `ningji_dan`｜凝基丹：二阶下品，R18 不新编商店、掉落或炼丹配方。

R18 只允许背包里真实已有物品被选择和消耗。

## 3. 筑基前置

正式 resolver 要求：

1. playing / adult；
2. 炼气九层；
3. 当前修为恰好 1000；
4. 当前主修真实已知且有冻结的炼气运行定义；
5. 无 active 重伤 / 经脉伤；
6. 不在 active 秘境；
7. 无 pending event；
8. 当前地点存在；
9. 万兽岭没有真实 `breakthrough_shelter:beast_ridge` 时直接阻止连续 14 日冲关。

轻伤不硬锁筑基，只提供 -8% 可见修正。

## 4. 成功率

统一：

```text
successPercent = clamp(5, 95, 30 + modifiers)
```

首版修正：

- 通用主修：0；
- 属性契合：+5%；
- 属性不契合：-10%；
- 入门 / 熟练 / 小成 / 大成：0 / +4 / +8 / +12%；
- `cultivation:stable`：+3%；
- 静心守一：+4%；
- 当前轻伤：-8%；
- 地点 none / thin / low / medium / high：-10 / -7 / -4 / 0 / +6%；
- 青云宗非正式青云身份仍按外围 medium，不白用核心灵脉；
- 黑风山额外灵气紊乱：-5%；
- 破障丹：+12%；
- 凝基丹：+20%；
- 30 / 60 灵石：+8 / +14%；
- 已真实存在 `breakthrough_guidance:foundation`：+8%。

环境项即使是 0% 也保留在预览中，避免玩家看不到当前地点为何没有加成。

## 5. 失败严重度

成功 roll 失败后才抽 severity：

```text
成功率 >= 70：轻65 / 重30 / 极端5
45～69：      轻50 / 重38 / 极端12
< 45：        轻35 / 重45 / 极端20
```

极端失败再抽一次 death roll：50% 直接死亡。

固定后果：

- 轻败：修为 78%，light injury 10 日；
- 重败：修为 50%，severe + meridian 45 日；
- 极端存活：修为 30%，severe + meridian 90 日；
- 极端死亡：`status='dead'`，`endReason='筑基反噬，经脉崩裂'`。

无额外突破 cooldown；恢复并重新修满后可再次尝试。

## 6. 14 日与 RNG 顺序

权威顺序：

```text
完整预校验
→ 冻结 preview
→ 原子扣除所选丹药 / 灵石
→ advanceWorldTime(14)
→ 若寿终则直接死亡，已投入资源不返还，且不抽 RNG
→ success roll
→ 失败才 severity roll
→ extreme 才 death roll
```

全部使用现有 seeded `nextRandom()`；无 `Math.random()`。

同一个 state snapshot + 同一个 SessionCommand 可稳定 replay 到同一 digest。

## 7. 成功后边界

成功只做：

```text
realm: qi → foundation
stage: 1
resources.cultivation: 0
```

并写 1 条 major Chronicle。

**不会：**

- 自动发《青元归真经》或其他筑基功法；
- 自动加入 / 晋升青云宗；
- 自动发装备、丹药或灵石；
- 自动继续筑基期修炼。

`CultivationPanel` 成功后只说明后续需要真正的筑基阶段传承，不展示无效的 1 / 3 / 10 / 30 日按钮。

## 8. UI

新增独立 `FoundationBreakthroughPanel`：

- 当前准确成功率；
- 主修 / 熟练度 / 当前地点 / 固定 14 日；
- 所有当前可见修正；
- 背包真实持有的破障丹 / 凝基丹选择；
- 0 / 30 / 60 灵石投入；
- 失败严重度分布；
- 明确提示极端失败约一半会直接死亡；
- active injury 与剩余自然恢复日数；
- 调养 10 / 30 日。

没有保底、推荐配置、未来隐藏奖励或假获取入口。

## 9. Session / save / replay

新增：

```text
attempt-foundation-breakthrough
recuperate-days
```

全部经过：

```text
SessionCommand
→ resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

有 `pendingResult` 时明确阻止新的筑基 / 调养命令。

## 10. 测试与 CI

R18 专项覆盖：

- 旧状态无 injuries 仍合法；
- 筑基前置；
- 万兽岭闭关据点；
- 属性契合 / 不契合；
- 四段熟练修正；
- 稳定功法 / 静心守一；
- 青云访客权限；
- 黑风山紊乱；
- 两种丹药真实持有与消耗；
- 0 / 30 / 60 灵石及原子拒绝；
- 95% 上限；
- 三档失败分布；
- 14 日；
- 寿终先于 RNG；
- seeded 成功；
- 轻 / 重 / 极端存活 / 极端死亡；
- 伤势对 R16 修炼与再次筑基的影响；
- 10 / 30 日调养；
- save / reload 深拷贝；
- Session replay / `RESULT_PENDING`；
- R13～R17 与 legacy breakthrough 回归测试继续通过。

实现中曾出现一次纯类型错误（探索字段名手误、SpiritRoot 类型宽化）和一次透明度测试（0% 青云外围环境被过滤）；均在 R18 范围内修复，没有改设计规则。

最终 R18 功能 CI：

- run：`31886042121`
- verify job：`95015380086`
- Typecheck：通过；
- Test：通过；
- Build：通过。

最终功能 HEAD：`afb346a5d0ae7521c5197d081d230baf9c90b696`。

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

禁止 React 直接 mutate 核心状态、页面直接写 localStorage、第二套 GameState/store、实现轮临时编造未冻结内容、绕过 replay/persistence。

---

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
→ R16 基础修炼 ✅
→ R17 功法系统 ✅
→ R18 炼气→筑基突破系统 ✅
→ C19 延寿物与 R19 前内容冻结
→ R19 寿元 / 延寿 / 金丹
→ C20 战斗 / 装备数值冻结
→ R20 半自动战斗
→ 后续宗门 / NPC / 职业 / 世界事件
```

## 下一步

执行：

> **C19｜延寿物与 R19 前内容冻结**

下一轮只更新内容真源与 R19 施工边界，至少冻结：

- 2～3 个首版具体延寿物；
- 名称、阶品、延寿年数、来源和稀有度尺度；
- 同一种延寿物对同一角色只生效一次的内容语义；
- R19 中筑基 / 金丹寿元上限的最终实现锚点是否与现有 lifespanEngine 一致；
- 筑基 → 金丹已冻结内容进入 R19 时需要的最小数据边界。

C19 不写 `src/` 代码，不实现 R19，不顺手冻结装备品阶或战斗数值。
