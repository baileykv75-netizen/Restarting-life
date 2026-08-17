# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R20「半自动战斗骨架」已完成；下一轮先做 C21「伤势 / 中毒 / 治疗内容冻结」，再进入 R21 实现。**
- R00.1～R04：迁移、唯一 GameState、Session / replay、V3 单档存档、V2 Game Shell 完成。
- R05～R07：出生三选一、童年、成年 / 入道完成。
- R08～R13：固定世界、地点知识、旅行、区域探索、随机子地点、首版秘境「沉脉石室」完成。
- R14～R15：正式背包、储物袋、四槽装备完成。
- C16 / R16～R17：修炼内容、炼气修炼、功法 / 熟练 / 改修完成。
- R18：authoritative injury runtime 与炼气→筑基完成。
- C19 / R19：寿元、延寿、筑基后修炼、60 日结丹与金丹完成。
- C20：装备阶品、战斗数值、beat、主动招式、战斗物品、逃跑、4 个测试敌人冻结完成。
- **R20：唯一正式 Combat runtime、半自动 beat 战斗、真实物品 / 装备 / 招式、逃跑、伤势 / 死亡、save / replay、沉脉石室正式岩甲蜥战斗完成。**

legacy Action/Event/Result/End 与 R13 旧概率岩甲蜥 resolver 只为旧档 / 旧测试 / 历史 replay 兼容保留；实际玩家 R20 路径不再调用旧概率战斗。

---

# 一、唯一状态与调度纪律

继续保持：

```text
UI / feature
→ SessionCommand
→ resolver / GameAction
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

R20 没有建立第二套 Session 协议。正式战斗操作使用现有：

```text
SessionCommand: game-action
→ GameAction: START_COMBAT / COMBAT_ACTION
→ CombatEngine
→ GameState.combat
```

`applyPersistentCommand()` 已增加战斗门禁：只要 `state.combat` 存在，除 `game-action -> COMBAT_ACTION` 外的正式 SessionCommand 全部返回 `COMBAT_ACTIVE`。

因此战斗中不能通过底层入口绕过 CombatPanel 去：

- 旅行；
- 修炼；
- 探索；
- 普通换装 / 卸装；
- 使用寿元物；
- 突破；
- 进入其他世界流程。

战斗内换主武器必须走 CombatEngine 自己的 `switch-weapon`。

---

# 二、R20 CombatState

新增 optional：

```ts
state.combat?: CombatState
```

旧 R05～R19 状态没有 combat 完全合法；`createInitialGameState()` 不塞空 combat。

CombatState 只保留单场瞬时真源：

- battleId / source / opponentId / locationId；
- beat；
- 独立 combat rngState；
- 双方 currentHP / maxHP / currentQi / maxQi / baseAttack；
- nextBasicAttackBeat；
- 临时状态；
- 最多 4 个本场配置招式；
- cooldown ready beat；
- 回气丹本场次数；
- 护心镜是否已触发；
- 本拍是否已换武器；
- 青竹灵弓 opening 是否已处理；
- 敌人 telegraph；
- 最大单次受击；
- 最近战斗日志。

CombatState **不复制**：

- inventory 数量；
- equipment ownership；
- knownTechniqueIds；
- permanent injury；
- lifespan；
- secret realm 主状态。

---

# 三、R20 静态战斗数据

新增：

```text
src/types/combat.ts
src/data/combat.ts
src/core/combatEngine.ts
src/components/CombatPanel.tsx
src/combat.css
```

C20 第 37 节仍是数值唯一内容真源。

## 玩家 HP / Qi / baseAttack

```text
炼气1  100 /  60 / 10
炼气2  110 /  70 / 12
炼气3  120 /  80 / 14
炼气4  130 /  90 / 16
炼气5  140 / 100 / 18
炼气6  150 / 110 / 20
炼气7  160 / 120 / 22
炼气8  170 / 130 / 24
炼气9  180 / 140 / 26
筑基前 230 / 180 / 38
筑基中 280 / 220 / 48
筑基后 340 / 270 / 60
筑基圆 410 / 330 / 74
金丹    650 / 500 / 110
```

凡人只保留 R20 兼容底线 `100 HP / 0 Qi / 10 baseAttack`，不是新增一套凡人战斗成长系统。

---

# 四、10 件装备正式进入 R20 数值

`src/data/items.ts` 已补齐 C20 阶品：

| 装备 | 阶品 | 战斗身份 |
|---|---|---|
| 青锋剑 | 一阶下品 | ×1.00，1 beat 基准 |
| 黑铁重剑 | 一阶中品 | ×1.55，2 beats，12pp 穿甲 |
| 赤纹刀 | 一阶中品 | ×1.05，fire active ×1.12 |
| 青竹灵弓 | 一阶中品 | 正常开战先手 ×1.15；近身 ×0.65 |
| 黑铁护甲 | 一阶中品 | 20% 减伤；逃跑 -12pp |
| 青狼软甲 | 一阶中品 | 12% 减伤；无移动惩罚 |
| 护心镜 | 一阶上品 | 重伤级命中 ×0.50；每战一次 |
| 镇灵玉 | 一阶中品 | mind / spirit +30pp hook；R20 不强造心神敌人 |
| 流云靴 | 一阶上品 | 逃跑 +15pp |
| 寻灵盘 | 一阶上品 | combat 0；继续探索用途 |

R15 原本“10 件装备品阶未标定”的测试已改为锁住以上最终阶品。

---

# 五、R20 beat 与伤害

一个 combat beat 是一次完整决策窗口，不推进 worldDay。

实际顺序：

```text
当前预兆 / 状态
→ 玩家可免费换主武器一次
→ 玩家一个 beat action / 普攻
→ 玩家结算，敌方 HP=0 则结束
→ 敌方普通攻击 / 已预兆特殊动作 / 低血量行为
→ beat + 1
→ 生成下一拍 telegraph
```

黑铁重剑：

```text
basicInterval = 2
```

切武器不会重置 `nextBasicAttackBeat`，测试已锁住。

伤害：

```text
普通：baseAttack × weaponBasicMultiplier
武器招式：baseAttack × weaponBasicMultiplier × moveMultiplier
纯术法：baseAttack × spellMultiplier
```

护甲：

```text
effectiveArmor = clamp(0, 35%, armor - penetration)
```

临时护体累计减伤上限 55%。

无 crit / hit / dodge / 随机伤害波动。

---

# 六、R20 主动招式

本场配置来自真实：

```text
knownTechniqueIds
+ auxiliaryTechniqueIds
+ proficiency / move unlock
```

最多取 4 个，不自动发放。

当前精确值继续沿用 C20：

```text
刺        Qi8  ｜武器×1.20｜5pp穿甲｜cd0
斩        Qi14 ｜武器×1.55｜cd1
御剑追击  Qi18 ｜武器×1.35；retreating×1.65｜小成｜cd2
火弹      Qi12 ｜术法×1.35｜cd0
炎爆      Qi24 ｜术法×1.85｜cd2
缠束      Qi14 ｜70/40/90% 束缚｜cd2
荆刺      Qi16 ｜术法×1.25；束缚目标×1.55｜cd1
水幕      Qi18 ｜下一次命中×0.65｜cd2
石甲护体  Qi20 ｜3拍额外20%减伤；逃跑-15pp｜cd3
金芒      Qi16 ｜术法×1.45｜18pp穿甲｜cd1
```

剑诀主动招式需要真实剑类主武器；当前青锋剑 / 黑铁重剑视为剑类。

---

# 七、状态效果

R20 已实际承载：

- 束缚；
- 迟缓；
- 护体；
- 暴露；
- 狂暴；
- retreating（只用于追击窗口）。

效果：

```text
暴露：下一次受伤 ×1.25 后消耗
狂暴：造成伤害 ×1.20；受到伤害 ×1.10
水幕：下一次命中 ×0.65
石甲：持续护体 +20%
```

中毒没有在 R20 偷做 runtime；留给 C21 / R21。

---

# 八、真实战斗物品

R20 正式登记并使用真实 inventory stack：

```text
huiqi_dan             回气丹
fire_talisman         火符
golden_blade_talisman 金刃符
protective_talisman   护身符
lightness_talisman    轻身符
spirit_breaking_awl   破灵锥
thunderfire_orb       雷火珠
beast_binding_rope    困兽索
```

使用统一走 `removeItem()`，没有 CombatState 内第二份数量。

规则：

```text
回气丹：+40 Qi，每战最多2
火符：baseAttack×1.45
金刃符：baseAttack×1.30，20pp穿甲
护身符：下一次命中×0.55
轻身符：3拍逃跑+25pp，并解除迟缓
破灵锥：破临时护体并暴露；无可破防护时×0.60
雷火珠：min(baseAttack×2.20, targetHP×35%)，10pp穿甲
困兽索：只对妖兽，按境界差85/50/20%
```

R20 **没有实现这些物品的商店 / 掉落来源**；它们的来源仍必须由后续真实世界内容负责。

---

# 九、逃跑

UI 显示准确成功率与主要修正。

```text
fleeChance = clamp(10%, 90%, 50% + modifiers)
```

已读取：

- 境界 / 阶段带；
- 最高已启用身法；
- 身轻步稳；
- 流云靴；
- 轻身符；
- 黑铁护甲；
- 石甲；
- R18 light / severe / meridian；
- 迟缓 / 束缚；
- 敌人明确 flee hook。

束缚直接禁止逃跑。

逃跑概率使用 combat RNG；失败后敌人正常获得行动机会，后续还能再逃。

---

# 十、R20 四个骨架敌人

只实现 C20 指定样本，不代表 R22 妖兽内容完成。

### 青背狼

```text
炼气2量级
HP105 / attack12 / armor0
撕咬×1.00
扑击×1.60，提前预兆
HP≤25%尝试逃
玩家逃跑 -8pp
```

### 成年岩甲蜥

```text
炼气4量级
HP155 / attack16 / armor22%
咬击×1.00
扫尾×1.70，提前预兆
扫尾后自身暴露
沉脉石室个体不逃
玩家逃跑 +5pp
```

### 赤鬃山猿

```text
炼气8量级
HP210 / attack26 / armor8%
重拳×1.00
蓄力砸击×2.00，提前预兆
HP≤30%狂暴
玩家逃跑 -5pp
```

### 普通散修

```text
炼气5
HP140 / Qi100 / attack18 / armor12%
青锋剑
可用火弹
测试模板可使用1张火符
HP≤30%尝试逃跑
```

R22 才补：8 种妖兽全量 combat data、真实战利品、刷新、妖丹 / 精血、named / unique death。

---

# 十一、沉脉石室正式战斗替换

实际 UI 现在为：

```text
确认进入脉心室
→ SecretRealmPanel 显示“迎战岩甲蜥”
→ START_COMBAT(adult-rock-lizard, sunken-vein-core)
→ CombatPanel
→ 正式胜利
→ secretRealm.sunkenVeinChamber.encounter = victory
→ 返回脉心室
→ 泄压并离开
```

沉脉石室核心来源：

```text
flee = 禁止
```

因此不会用新逃跑系统穿过 C13 已冻结的不可回头点。

R13 `resolve-core-encounter` 旧命令仍保留历史 replay / 旧测试语义，但玩家 UI 已停止调用；不要再扩张旧概率战斗。

---

# 十二、战斗结束、伤势与死亡

HP = 0：

- 立即进入唯一 `dead` 状态；
- 写明实际对手；
- 增加克制的 Chronicle 死亡记录；
- 清除 CombatState；
- `applyPersistentCommand()` 按既有流程归档人生。

存活结束时继续复用 R18 injury：

```text
最终HP ≤10% 或单次命中 ≥35% maxHP
→ severe / 45日

否则最终HP ≤30% 或单次命中 ≥25% maxHP
→ light / 10日
```

severe 优先；R20 四个测试敌人不会随机制造 meridian。

这里的 10 / 45 日沿用现有 R18 恢复尺度，不是新建第二套 wound runtime。

C21 / R21 需要继续解决：

- 中毒；
- 战后持续恶化；
- 止血散 / 清毒散 / 养脉丹；
- 更完整的治疗与未处理死亡。

---

# 十三、save / replay

`saveRepository` 已深拷贝 active CombatState：

- player / opponent；
- status objects；
- configuredMoveKeys；
- cooldown map；
- telegraph；
- log。

旧存档没有 combat 继续合法。

Combat RNG：

- 开战从主 `rngState` 消耗一次确定性 step；
- 再派生独立 combat rng；
- 战斗控制 / 逃跑 / 困兽等只消费 combat rng；
- 同一 state + command 序列确定性一致。

正式动作通过 `game-action` 写入 debug log / digest；专项测试已验证 Session 序列确定性。

---

# 十四、R20 提交与验证

主功能提交：

```text
8dfb65fbcbaacbd8201cf389694eaa6e8fe80dea
V2 R20: implement formal semi-auto combat runtime
```

首次 CI：

```text
run 32019571712
verify 95356202762
Typecheck ✅
Test ✅
Build ✅
```

审查后补的战斗门禁 FIX：

```text
7e502ba01c0741172dcd85eb57ef35ed8c45b486
V2 R20 FIX: lock persistent commands during combat
```

FIX CI：

```text
run 32019755211
verify 95356762407
Typecheck ✅
Test ✅
Build ✅
```

GitHub Pages：

```text
run 32019755157
build ✅
deploy ✅
source = main
public = true
```

Pages API 当前地址：

```text
https://baileykv75-netizen.github.io/Restarting-life/
```

当前工具执行环境对 `github.io` DNS 解析失败，因此本轮没有伪称做过外部 HTTP 200 浏览器探测；GitHub 自身 Pages build / deploy 均成功。

---

# 十五、仍待正确时机补齐的内容

继续保留，不在 R20 顺手填：

1. 8～12 个正式随机子地点模板；
2. 如首版确实需要，再冻结第 2 个小秘境；
3. 8～12 个重大机缘具体内容，C30 前补；
4. 30 个普通事件正式正文；
5. 高阶功法、抱元丹、延寿物的真实世界获取入口；
6. **C21 / R21：中毒、恶化、止血散 / 清毒散 / 养脉丹精确治疗闭环；**
7. **C22 / R22：妖兽正式 combat data、掉落、妖丹 / 精血、刷新与 unique death；**
8. R23：战斗能力进入区域危险判断、强大妖兽领地与区域变化。

已关闭：

- 10 件装备阶品；
- R20 基础战斗数值；
- 玩家正式战斗双真源问题；
- 沉脉石室临时概率战斗的玩家 UI 路径。

---

# 十六、为什么下一步先是 C21

路线文档原本直接写 R21「伤势与治疗」，但当前 Content Bible 只冻结了：

- injury 种类；
- 止血散 / 清毒散 / 养脉丹的世界定位；
- 中毒会恶化的方向。

尚未冻结：

- 第一版 poison runtime 的最小分级；
- 恶化发生在什么时间阈值；
- 每种治疗物到底处理什么、一次处理多少；
- severe / meridian 是否一次就能完全治疗；
- 未处理到何种条件会死亡；
- 战斗 / 探索 / 修炼分别读取哪些伤势修正。

如果直接进入 R21，Codex / 实现层必然需要临时猜这些值。

因此下一轮先做一个短内容检查点：

> **C21｜伤势 / 中毒 / 治疗内容冻结**

只更新内容真源，不写 `src/`；冻结后立即进入 R21。

---

# 十七、当前迁移主线

```text
出生 / 童年 / 成年 ✅
→ 世界 / 知识 / 旅行 / 探索 ✅
→ 子地点 / 沉脉石室 ✅
→ 背包 / 装备 ✅
→ 修炼 / 功法 / 筑基 ✅
→ 寿元 / 延寿 / 金丹 ✅
→ C20 战斗数值 ✅
→ R20 半自动战斗 ✅
→ C21 伤势 / 中毒 / 治疗内容冻结 ← 下一轮
→ R21 伤势与治疗
→ C22 妖兽 / 生态内容冻结
→ R22 妖兽与战利品
→ R23 危险判断 / 强大妖兽领地
→ 宗门 / NPC / 职业 / 世界事件
```
