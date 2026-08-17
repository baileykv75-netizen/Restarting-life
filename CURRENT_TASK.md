# 当前任务：V2 R20 - 半自动战斗骨架

## 本轮唯一目标

把 C20 已冻结的战斗内容真正接入现有 V2 运行链，完成第一套**唯一、可保存、可重放、可实际游玩的正式 Combat runtime**：

```text
创建战斗
→ 离散 combat beat
→ 自动普攻
→ 玩家主动招式 / 物品 / 换武器 / 逃跑
→ 敌人普通攻击 / 一拍预兆特殊动作
→ 胜利 / 敌人逃跑 / 玩家逃跑 / 玩家死亡
→ R18 injury 接入
→ Session / save / replay
→ 用正式成年岩甲蜥战斗替换 R13 临时概率胜负
```

本轮只实现上述骨架和 C20 指定的 4 个测试敌人。

**不得提前实现 R21 完整中毒 / 治疗、R22 妖兽掉落与生态、R23 强大妖兽领地，也不得继续修改 C20 已冻结的战斗数值。**

---

# 一、必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`：战斗、死亡、伤势、装备、逃跑、风险原则
3. `V2_CONTENT_BIBLE.md`：
   - 第 14～19 节现有物品 / 装备 / 功法 / 战斗定位
   - **第 37 节 C20 战斗与装备执行数值，作为本轮数值唯一真源**
4. `HANDOFF.md`：R14～R19 现有状态与 C20 交接
5. 现有实现：
   - `src/types/game.ts`
   - `src/types/command.ts`
   - `src/types/persistence.ts`
   - `src/core/sessionEngine.ts`
   - `src/core/stateDigest.ts`
   - `src/core/replayEngine.ts`
   - `src/store/saveRepository.ts`
   - `src/core/inventoryEngine.ts`
   - `src/core/equipmentEngine.ts`
   - `src/core/injuryEngine.ts`
   - `src/data/items.ts`
   - `src/data/techniques.ts`
   - `src/core/secretRealmEngine.ts`
   - `src/components/SecretRealmPanel.tsx`
   - `src/App.tsx`
6. R05～R19 现有测试，尤其 save / replay / inventory / equipment / secret realm / injury。

若现有架构与本任务冲突，做**最小兼容扩展**，不得借机全项目重构。

---

# 二、核心架构原则

## 2.1 Combat 进入唯一 GameState

新增一个正式、可选的 `combat` runtime，例如：

```ts
state.combat?: CombatState
```

旧 R05～R19 状态没有 `combat` 必须继续合法。

不要在 `createInitialGameState()` 为所有旧人生强塞空 combat object，避免无意义改变旧 digest / replay。

`CombatState` 只保存一场战斗真正需要的瞬时状态，例如：

- battleId / source；
- opponentId / opponent template id；
- beat；
- player currentHP / currentQi；
- opponent currentHP / currentQi；
- `nextBasicAttackBeat`；
- 当前临时状态及剩余 beats；
- cooldown；
- 当前已配置主动招式；
- 本场回气丹已用次数；
- 护心镜本场是否已触发；
- 青竹灵弓 opening 是否已结算；
- 当前 / 下一拍敌人 telegraph；
- 战斗来源上下文（例如沉脉石室核心）；
- 必要的 seeded combat RNG state / sequence information。

不要复制：

- inventory 数量；
- equipment 真源；
- knownTechniqueIds；
- permanent injuries；
- lifespan；
- secret realm 主状态。

这些继续读取原有 authoritative state。

## 2.2 只允许一套正式战斗真源

R20 完成后：

- 正式 CombatEngine 是玩家战斗唯一执行路径；
- R13 `encounterChance()` / `resolveCoreEncounter()` 不能继续直接决定玩家岩甲蜥胜负；
- 可以保留内部 helper 仅供历史测试迁移所需，但实际玩家流程必须停止调用，最好删除失去用途的概率胜负逻辑；
- 不允许长期存在“秘境概率战斗 + CombatEngine”两套真源。

## 2.3 所有正式操作走 SessionCommand

必须满足：

```text
UI
→ SessionCommand
→ Combat resolver
→ GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

不要让 React 直接改 `combat`。

命令命名可以结合现有风格最小设计，但至少需要表达：

- 开始战斗 / 从世界内容进入战斗；
- 玩家 beat action；
- 换武器；
- 使用主动招式；
- 使用物品；
- 尝试逃跑。

如果这些可以安全统一成一个 `combat-action` union，优先统一，不要为每个按钮造十几个顶层 SessionCommand。

---

# 三、静态 combat data

## 3.1 装备

把 C20 第 37.1 / 37.6 / 37.7 的 10 件现有装备正式写入已有 item / equipment 数据层：

```text
青锋剑：一阶下品｜×1.00｜1 beat
黑铁重剑：一阶中品｜×1.55｜2 beats｜12pp穿甲
赤纹刀：一阶中品｜×1.05｜fire active ×1.12
青竹灵弓：一阶中品｜正常开战先手×1.15｜近身×0.65
黑铁护甲：一阶中品｜20%｜逃跑-12pp
青狼软甲：一阶中品｜12%
护心镜：一阶上品｜重伤级命中×0.50｜每战一次
镇灵玉：一阶中品｜mind/spirit抵抗+30pp
流云靴：一阶上品｜逃跑+15pp
寻灵盘：一阶上品｜战斗数值0
```

不要增加随机词条 / 耐久 / 强化等级。

## 3.2 角色战斗基础尺度

直接数据化第 37.2：

```text
炼气1 100/60/10
炼气2 110/70/12
炼气3 120/80/14
炼气4 130/90/16
炼气5 140/100/18
炼气6 150/110/20
炼气7 160/120/22
炼气8 170/130/24
炼气9 180/140/26
筑基前 230/180/38
筑基中 280/220/48
筑基后 340/270/60
筑基圆 410/330/74
金丹 650/500/110
```

顺序：`maxHP / maxQi / baseAttack`。

R20 不从 constitution / comprehension 临时再推另一套 combat formula。

## 3.3 招式

只实现 C20 第 37.8 已冻结的 10 个招式数值：

- 刺；
- 斩；
- 御剑追击；
- 火弹；
- 炎爆；
- 缠束；
- 荆刺；
- 水幕；
- 石甲护体；
- 金芒。

招式是否可用必须继续读取：

```text
knownTechniqueIds
+ R17 proficiency / move unlock
```

不得因为 R20 自动发放功法或招式。

### 武器兼容

《青锋剑诀》三个招式要求当前主武器属于**剑类**：

- 青锋剑；
- 黑铁重剑。

青锋剑诀不是“必须拿名字叫青锋剑的武器”才能用；黑铁重剑仍属于剑类，但其慢普攻节拍不影响主动招式本身占用 1 beat 的规则。

赤焰术 / 缚藤术 / 水幕术 / 石甲术 / 金芒诀不要求特定武器。

赤纹刀的 `fire active ×1.12` 可以作用于火弹 / 炎爆；不作用于非火主动。

---

# 四、CombatEngine 核心公式

严格实现 Content Bible 第 37 节，不自行调参。

## 4.1 伤害

```text
basicRaw = baseAttack × weaponBasicMultiplier
weaponMoveRaw = baseAttack × weaponBasicMultiplier × moveMultiplier
spellRaw = baseAttack × spellMultiplier
```

护甲：

```text
effectiveArmorReduction
= clamp(0, 35%, armorReduction - armorPenetration)

afterArmor
= round(rawDamage × (1 - effectiveArmorReduction))
```

暴露：下一次伤害 ×1.25，命中后消耗。

R20 不加入：

- 暴击；
- 命中；
- 闪避；
- 随机浮动；
- 元素抗性大表。

## 4.2 临时防御

- 水幕：下一次命中 ×0.65，2 beats 未触发则过期；
- 石甲：3 beats 额外减伤20%，逃跑 -15pp；
- 护身符：下一次命中 ×0.55，最长3beats；
- 普通临时防御叠加总减伤按 C20 55% cap；
- 护心镜在主动防御结算后检查；重伤级命中再 ×0.50，本场最多触发1次。

重伤级命中判定严格按第 37.7。

---

# 五、combat beat

严格顺序：

```text
1. 到期状态 + 上一拍 telegraph
2. 玩家可免费换主武器一次
3. 玩家一个 beat action；没有主动行为则尝试自动普攻
4. 玩家行动结算；敌人HP≤0立即结束
5. 敌人普通 / telegraphed action
6. cooldown / 状态推进 / 生成下一拍 telegraph
```

## 5.1 自动普攻

玩家没有使用主动 action 时：

- 若 `beat >= nextBasicAttackBeat`，自动普攻；
- 否则本 beat 玩家没有攻击。

标准武器 interval = 1。

黑铁重剑 interval = 2。

**换武器不能重置 nextBasicAttackBeat。**

## 5.2 青竹灵弓先手

仅当：

- 战斗开始前已经装备青竹灵弓；
- 不是伏击 / 已贴身开始；

才在 beat1 前结算 1 次 ×1.15 opening shot。

战斗中换到灵弓不能重新触发先手。

先手后进入 `engaged`，普通攻击 ×0.65。

不做距离格 / 弹药系统。

## 5.3 主动行为

以下都占 1 beat 并替代自动普攻：

- 主动招式；
- 丹药；
- 符箓；
- 一次性法器；
- 逃跑。

换武器免费，每 beat 最多一次。

---

# 六、状态与 cooldown

实现 R20 需要的最小状态：

- bound；
- slowed；
- guarded；
- exposed；
- enraged。

`poison` 只保留 identity / future hook，不实现战后毒伤与治疗。

规则完全按 Content Bible 37.9。

Cooldown：

```text
cd1：N 使用，N+1不能用，N+2最早再用
```

不得使用浏览器实时计时器。

---

# 七、战斗物品

R20 只实现已有世界内容中 C20 已冻结的：

- 回气丹；
- 火符；
- 金刃符；
- 护身符；
- 轻身符；
- 破灵锥；
- 雷火珠；
- 困兽索。

必须从真实 `inventory` 消耗。

如果当前 item registry 里某个已冻结物品尚无正式 definition，本轮可以补**该既有内容的最小正式 item definition**；不得借机新增别的丹药 / 法器。

所有数值严格用 Content Bible 37.10。

R20 不实现：清毒散、止血散、养脉丹完整战斗 / 战后治疗。

---

# 八、逃跑

使用 Content Bible 37.11：

```text
fleeChance = clamp(10, 90, 50 + modifiers)
```

必须读取：

- realm / stage band；
- 最高一项已启用身法；
- 身轻步稳；
- 流云靴；
- 轻身符；
- 黑铁护甲；
- 石甲；
- R18 active injury；
- slowed / bound；
- 敌人明确追击 hook；
- 战斗来源地形 hook。

玩家 UI 显示：

- 最终准确百分比；
- 主要 + / - 修正来源。

逃跑成功：立即结束，不再吃本 beat 敌人攻击。

逃跑失败：玩家本 beat 没有普攻，敌人照常行动。

下一 beat 可再次尝试。

所有概率使用 deterministic combat RNG，并进入 replay truth。

---

# 九、R20 只做 4 个测试敌人

静态数据只实现：

1. T-01 青背狼；
2. T-02 成年岩甲蜥；
3. T-03 赤鬃山猿；
4. T-04 普通散修。

数值、telegraph、低血行为严格照 Content Bible 37.12。

不要在 R20 顺手把 8 种妖兽全量数据化；那是 R22。

不要给测试敌人正式掉落表。

敌人最小 AI：

```text
普通攻击
→ 可用时按固定 / seeded 可重放规则触发特殊动作预兆
→ 下一 beat 执行特殊动作
→ 低血按模板进入狂暴或尝试逃跑
```

T-04 普通散修可以用火弹和最多1张真实测试火符；不要扩成完整人类 AI 系统。

---

# 十、R13 沉脉石室正式接入

这是本轮必须完成的纵向整合，不是可选项。

当前：

```text
进入脉心室
→ encounterChance()
→ resolveCoreEncounter()
→ 一次RNG直接胜 / 死
```

R20 改为：

```text
进入脉心室
→ 创建 combat(source = sunken-vein-core, opponent = adult-rock-lizard)
→ App / SecretRealmPanel 切到 CombatPanel
→ 正式逐 beat 战斗
→ victory
→ secretRealm.sunkenVeinChamber.encounter = victory
→ 回到秘境核心流程
→ 允许泄压离开
```

玩家死亡沿现有唯一死亡 / EndPanel / archive 流程。

玩家成功逃跑时，因为已经越过核心不可回头石门：

- **不能把逃跑解释为直接离开秘境；**
- R20 中对该固定核心战斗的 flee action 应明确不可用，或返回 `FLEE_BLOCKED_BY_SECRET_REALM_LOCK`；
- 这是 C13 已冻结“核心不可回头”的结构要求。

普通开放地点战斗仍允许正常逃跑。

不要为了测试逃跑破坏沉脉石室不可回头点。

---

# 十一、战后 injury / death

复用 R18，不造第二套。

胜利 / 敌人逃走后，根据本场记录：

- 玩家 HP ≤0：死亡；
- 存活且最终 HP ≤10%，或单次实际命中 ≥35% maxHP：severe；
- 否则最终 HP ≤30%，或单次实际命中 ≥25% maxHP：light；
- severe 优先，不重复再加 light；
- R20 四敌人不随机生成 meridian。

HP / Qi combat runtime 在战斗结束后销毁；长期伤势进入 authoritative `injuries`。

R20 不实现 poison 战后恶化。

战斗死亡至少需要因果清楚的 endReason / Chronicle，例如具体敌人与关键失败，不写宿命式文案。

---

# 十二、UI

新增最小 `CombatPanel`，风格沿用现有 V2 Game Shell，不做动画大改。

至少展示：

- 敌人名称 / 境界量级；
- 双方 HP；
- 玩家 Qi；
- 当前 beat；
- 当前主武器；
- 当前状态；
- 敌人下一拍明确 telegraph；
- 最多4个真实已解锁主动招式；
- 可用战斗物品；
- 背包中的可切换备用主武器；
- 逃跑准确成功率及主要修正；
- 最近 3～5 条战斗记录即可，不做无限日志墙。

按钮：

- “继续交锋 / 普攻”可以代表让本 beat 进入自动普攻；
- 主动招式；
- 使用物品；
- 切换武器；
- 逃跑。

不要显示后台 RNG roll。

不要加入技能树、装备强化、战斗速度滑条或实时键盘操作。

---

# 十三、Session / persistence / replay

必须覆盖：

- combat state save / reload 深拷贝；
- 中途刷新后继续同一 beat；
- 同 seed + 同 command sequence → 同 combat result；
- control / flee RNG 不因刷新改变；
- equipment / inventory 消耗在 replay 后一致；
- 战斗结束 combat runtime 正确清空；
- 旧状态没有 combat 继续合法；
- R05～R19 旧 replay digest 继续通过。

如果 combat 使用独立 RNG stream，必须能被保存 / replay；如果复用主 rngState，也必须保证 SessionCommand 顺序完全确定。禁止 `Math.random()`。

---

# 十四、R20 专项测试最低覆盖

## Combat 基础

- 4 个测试敌人数据精确；
- HP / Qi / baseAttack 表精确；
- 青锋剑同阶基础攻击落在预期量级；
- 黑铁重剑 ×1.55 / interval2 / 12pp pen；
- 赤纹刀 fire-active ×1.12；
- 灵弓只在合法开战触发一次 opening；
- 换武器不能刷新重剑 nextBasicAttackBeat。

## 防御

- 黑铁20%、青狼12%；
- armor cap 35%；
- 水幕 / 石甲 / 护身符；
- 暴露一次消费；
- 护心镜只在重伤级命中触发且每战一次。

## 招式

- 10 招 Qi、倍率、穿甲、cooldown 精确；
- 缠束 seeded 概率；
- 荆刺对 bound 目标增伤；
- move unlock / known technique 真校验；
- 青锋剑诀要求剑类；
- 赤纹刀只增益 fire active。

## 物品

- 真 inventory 消耗；
- 回气丹 +40、每战最多2；
- 火符 / 金刃符；
- 轻身符不能解 bound；
- 破灵锥有 / 无护体两条路径；
- 雷火珠不能靠 35% target HP 让低境界角色无脑削高境界；
- 困兽索人类目标拒绝。

## 逃跑

- 精确公式；
- 身法只取最高；
- 流云靴 / 黑铁甲 / 伤势 / slow；
- bound 禁止；
- 成功不吃敌人追击；
- 失败敌人照常行动；
- 沉脉石室核心禁止 flee。

## 敌人 / telegraph

- 青背狼扑击；
- 岩甲蜥扫尾后暴露；
- 赤鬃山猿低血狂暴；
- 普通散修低血逃跑；
- 特殊动作前一 beat 可见。

## 伤势 / 死亡

- HP0 真实死亡；
- light / severe 阈值；
- 不随机造 meridian；
- injury 进入 R18 authoritative state；
- 战后 combat 清空。

## 沉脉石室

- 旧概率战斗不再是玩家路径；
- 进入核心创建 T-02 combat；
- victory 后才允许泄压；
- death 结束人生；
- refresh / save / replay 不跳过战斗。

## 回归

R05～R19 全部既有测试保持通过。

---

# 十五、验收与 CI

完成代码后必须运行：

```text
npm run typecheck
npm test
npm run build
```

并通过 GitHub Actions 实际验证。

若失败：

- 只修 R20；
- 不借机做 R21；
- CI 全绿前不得标记完成。

本轮完成后更新 `HANDOFF.md`，记录：

- CombatState 结构；
- SessionCommand；
- combat RNG；
- 4 敌人；
- 装备 / 招式 / 物品落地；
- R13 替换方式；
- injury / death 接口；
- save / replay；
- CI run / commit。

R20 全绿后，把 `CURRENT_TASK.md` 切换到：

> **R21｜伤势与治疗**

然后停止，不得开始 R21。

---

# 十六、明确禁止

- 不修改 C20 第37节战斗数值，除非测试证明存在明确数学矛盾；若真有矛盾，先作为 FIX C20 文档修订而不是在代码暗改；
- 不做实时 ARPG / 帧级计时；
- 不做碰撞 / 走位；
- 不做暴击 / 命中 / 闪避大系统；
- 不做元素抗性大表；
- 不做装备耐久 / 强化 / 随机词条；
- 不新增第5装备槽；
- 不新增武器；
- 不做完整 poison / 治疗（R21）；
- 不做妖兽正式掉落 / 刷新 / named ecology（R22）；
- 不做强妖兽领地 / 全面危险评估（R23）；
- 不做宗门贡献、商店、拍卖；
- 不自动发功法 / 招式 / 装备；
- 不做多人队伍微操；
- 不扩第二秘境；
- 不生成重大机缘；
- 不改整个 GameState 架构；
- 不保留第二套玩家战斗真源。