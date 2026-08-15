# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R17「功法系统」已完成，下一轮进入 R18「炼气→筑基突破系统」。**
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
- legacy Action/Event/Result/End 只为旧档、旧测试与迁移兼容保留，不得继续扩张。

---

## 内容真源与仍待后续补齐的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

C16 已解决：

- 炼气 → 筑基具体准备、资源、时间、成功修正与失败后果；
- 筑基 → 金丹具体准备、资源、时间、成功修正与失败后果；
- 青云宗正统、散修 / 遗迹、邪道三条筑基至金丹前主修延续。

仍需在真正依赖它们的轮次前补齐，不得为清 TODO 提前硬编：

1. **2～3 个具体延寿物**：R19 明确会进入延寿玩法，因此在 R18 完成后、R19 实现前做内容冻结；
2. **随机子地点正式内容池 8～12 个**：R12 目前仍只有洞府 / 药谷 / 兽巢 / 遗迹四类运行 archetype；
3. 如首版确实需要，再冻结第 2 个小秘境；
4. **8～12 个重大机缘具体内容**：C30 前补；
5. **30 个普通事件正式正文**：进入普通事件 / 世界事件内容轮前补；
6. **青锋剑、黑铁重剑、赤纹刀、青竹灵弓、黑铁护甲、青狼软甲、护心镜、镇灵玉、流云靴、寻灵盘的具体“阶 + 品”**：最迟在 R20 正式战斗平衡前做内容冻结，不允许 CombatEngine 临时猜品阶；
7. **正式伤势 runtime 与修炼 / 突破连接**：R18 已经真实需要轻伤 / 重伤 / 经脉伤与失败恢复，因此 R18 必须在唯一 `GameState` 中建立最小 authoritative injury runtime；不能再用 flags 伪造第二套伤势系统。

这些缺口不得由实现轮临时编造后反向固化。

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

## C16 突破内容

### 炼气 → 筑基

- `凝基丹`：二阶下品，约 180～260 下品灵石；高价值但非强制门票。
- 正式突破按 14 日结算。
- 可见修正来自灵根 / 主修契合、功法状态、伤势 / 经脉、静心守一、环境、破障丹、凝基丹、灵石投入、师长指点。
- 允许裸冲；失败分轻 / 重 / 极端，极端可死亡；无额外突破冷却。

### 筑基 → 金丹

- `抱元丹`：二阶上品，约 650～900 下品灵石；高价值但不保证成功。
- 正式结丹按 60 日结算。
- 三条筑基后主修延续：`《青元归真经》`、`《归元守一篇》`、`《阴髓录·凝煞篇》`。
- 普通常规金丹不建立雷劫系统。

---

# R16｜基础修炼

## 唯一状态

R16 继续扩展唯一 `state.cultivation`：

```ts
practiceInitialized?: true
knownTechniqueIds?: string[]
mainTechniqueId?: string | null
```

`resources.cultivation` 是唯一当前小阶段修为进度：1000 点 = 当前阶段 100%。

只有 R07 真正得到功法传授的 `cultivation_method_access_seed` 会变成已知功法；只有宗门 / 坊市 / 散修门路不会自动送功法。

正式修炼支持 1 / 3 / 10 / 30 日，确定性读取灵根、功法、属性契合、地点灵气和已冻结相关天赋 / 体质。凡人可自然引气入体，炼气 1～8 层每 1000 点晋一层，炼气九层在 1000 点硬停，不自动筑基。

R16 最终功能 CI：run `31884102346`，typecheck / test / build 全通过。

---

# R17｜功法系统

## 1. 继续使用唯一 cultivation state

R17 没有创建 `TechniqueStateV2` 或第二套 store，而是在同一个：

```ts
state.cultivation
```

继续增加 optional 字段：

```ts
techniqueSystemInitialized?: true
auxiliaryTechniqueIds?: string[]
techniquePractice?: Record<string, { proficiencyPoints: number }>
```

`knownTechniqueIds` 继续是角色**真实已经学会**的唯一真源；R17 不新增“可学列表”来偷换已学状态。

## 2. 显式 R17 初始化保护旧 R16 replay

新增：

```text
initialize-technique-system
```

只有执行这个命令后，R17 熟练度语义才启用。

原因：R16 历史 debug log 已经存在 `cultivate-days`。如果 R17 直接改变旧命令语义，让它自动写熟练度，会导致旧人生 replay digest 改变。

因此：

- 旧 R16 状态没有 `techniqueSystemInitialized` 时，旧 `cultivate-days` 仍保持 R16 原语义；
- 新人生 / 已继续运行的人生通过显式 SessionCommand materialize R17；
- 初始化不推进时间、不消耗 RNG、不增加任何功法。

## 3. 功法 registry 与分类

正式分类：

```text
main / combat / movement / body / secret
```

R16 六门已平衡主修继续作为真正可执行修炼定义。

Content Bible 已有但基础效率尚未冻结的：

- 《庚金锐气诀》
- 《风行吐纳篇》
- 《雷引诀》
- 《阴髓录》残篇

只登记 registry / category / future hook，**没有猜 baseEfficiency，因此当前不能被当作 R16 可执行主修。**

战斗术法 / 身法 / 炼体 / 秘术只数据化已有内容，没有实现伤害、灵力消耗、冷却或战斗按钮。

《青锋剑诀》正式记录：刺、斩、御剑追击；只有已冻结的「御剑追击」要求小成，未给其他招式擅自增加门槛。

## 4. 熟练度

内部只保存整数 `proficiencyPoints`，阶段纯派生：

```text
0    入门
1000 熟练
3000 小成
6000 大成
```

UI 不显示 XP 数字条。

基础增长：20 点 / 真实练习日。

`举一反三`：熟练增长 ×1.15；采用整数比例计算，避免 `200 × 1.15` 因 JS 浮点落成 229。

它**不增加 R16 cultivation gain**。

## 5. 主修与辅修

- `mainTechniqueId` 始终只有一门主修；
- `auxiliaryTechniqueIds` 可以配置多门已经真实掌握的非主修功法；
- 配置辅修不复制 / 删除 `knownTechniqueIds`；
- 没有真实来源的功法不会因为 R17 自动进入已知列表。

主修完成真实 `cultivate-days` 后同时积累该主修熟练度。

非主修已知功法支持专门练习：

```text
1 / 3 / 10 / 30 日
```

只推进 `worldDay` 和熟练，不增加修为、灵石、属性或 Chronicle；寿终优先。

## 6. 改修成本

第一次从 `mainTechniqueId = null` 选择主修仍免费。

已有主修后改修另一门已知且已冻结基础效率的 main，必须走：

```text
change-main-technique
```

三档：

```text
同体系 / 通用互转：3 日 + 当前小阶段修为损失 5%
通用 ↔ 属性 / 同属性：7 日 + 当前小阶段修为损失 10%
不同属性 / 正邪切换：14 日 + 当前小阶段修为损失 20%
```

`举一反三`只把适应时间乘 0.8 后向上取整，不减少修为损失。

修为损失只作用 `resources.cultivation`，不会让炼气层数或大境界倒退。

UI 在执行前显示真实耗时、百分比和当前点数损失。

## 7. Session / save / replay

R17 新命令：

```text
initialize-technique-system
change-main-technique
set-auxiliary-technique
practice-technique-days
```

以及 R16 的 `cultivate-days` 在 R17 已初始化状态下追加主修熟练。

全部经过：

```text
SessionCommand
→ resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

`saveRepository` 深拷贝：

- `knownTechniqueIds`
- `auxiliaryTechniqueIds`
- `techniquePractice` 每个对象

## 8. UI

`CultivationPanel` 现在显示：

- 主修及当前熟练阶段；
- 已知非主修的分类与熟练阶段；
- 辅修 / 取消辅修；
- 专门练习 1 / 3 / 10 / 30 日；
- 已冻结招式与当前是否达到熟练门槛；
- 改修前的真实时间与修为损失。

没有：

- 免费学习按钮；
- 技能树；
- 战力；
- 招式施放按钮；
- 商店 / 宗门传功 / 拜师 / 遗迹掉落假入口。

## 9. 测试与 CI

R17 新专项测试覆盖：

- registry 与未冻结主修不执行；
- 显式初始化不加功法、不推进时间 / RNG；
- 四阶段纯派生；
- 主修 / 辅修分类校验；
- 多辅修不复制 known；
- 主修闭关增加熟练；
- `quick_study` 只影响熟练与改修时间；
- 旧 R16 未初始化状态不被新语义改写；
- 专门练习与寿终优先；
- 青锋剑诀小成招式门槛；
- 三档改修成本；
- 改修只损失当前阶段修为；
- 秘境内禁止普通专门练习 / 改修；
- save / reload 深拷贝；
- Session replay 与 `RESULT_PENDING`。

第一次 CI 暴露测试未使用 import；第二次 CI 暴露 `1.15` 浮点 floor 为 229 的精度问题，均只做 R17 最小修复。

最终 R17 功能 CI：

- run：`31884930599`
- verify job：`95012744394`
- Typecheck：通过；
- Test：通过；
- Build：通过。

最终功能修复提交：`c33497495fffde5e928dd42c62d03ca4e78f798e`。

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
→ R18 炼气→筑基突破系统
→ C19 延寿内容冻结
→ R19 寿元 / 延寿 / 金丹
→ C20 战斗 / 装备数值冻结
→ R20 半自动战斗
→ 后续宗门 / NPC / 职业 / 世界事件
```

## 下一步

执行：

> **R18｜炼气→筑基突破系统**

R18 直接使用 C16 已冻结的筑基内容，不需要再插一个内容轮。

重点：

- 炼气九层 100% 后显示真实筑基准备；
- 明确成功率和主要修正来源；
- 正式突破消耗 14 日；
- 可选资源只使用已经冻结的破障丹 / 凝基丹 / 灵石投入等；
- 失败分轻 / 重 / 极端；
- R18 必须建立最小正式 injury runtime，供经脉伤 / 重伤真实进入唯一 GameState；
- 极端失败可以真实死亡；
- 不实现筑基金丹期完整修炼，不进入 R19；
- 不顺手冻结延寿物，延寿物放在 R18 成功后的 C19。

具体范围以新的 `CURRENT_TASK.md` 为准。
