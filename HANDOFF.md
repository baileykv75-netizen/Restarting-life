# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**C20「战斗 / 装备数值冻结」已完成；下一轮进入 R20「半自动战斗骨架」。**
- R00.1～R00.3：迁移、V3 存档、开发纪律完成。
- R01～R04：唯一 GameState、SessionCommand / replay、单档自动保存、V2 Game Shell 完成。
- R05～R07：出生三选一、童年关键节点、成年 / 入道入口完成。
- R08～R13：固定世界、地点知识、旅行、区域探索、随机子地点、首版秘境「沉脉石室」完成。
- R14～R15：正式背包、储物袋、四槽装备结构完成。
- C16 / R16～R17：修炼内容冻结、基础修炼、功法 / 熟练度 / 改修完成。
- R18：正式 injury runtime 与炼气→筑基完成。
- C19 / R19：寿元、延寿、筑基后修炼、60 日结丹与金丹完成。
- **C20：10 件装备阶品、战斗基础数值、combat beat、伤害 / 护甲 / 逃跑公式、首批招式与消耗品、4 个 R20 测试敌人已全部冻结到 `V2_CONTENT_BIBLE.md` 第 37 节。**
- legacy Action/Event/Result/End 仍只为旧档 / 旧测试 / 迁移兼容保留，不得继续扩张。

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

禁止：

- React 直接改核心状态；
- 页面直接写 localStorage；
- 第二套 GameState / inventory / equipment / injury / lifespan / combat truth；
- implementation round 临时编造未冻结数值；
- 为新功能破坏 R05～R19 replay 语义。

R20 新 combat runtime 应优先做成 `GameState` 的 optional 正式字段，让旧状态继续合法；不要为了 R20 重写整个 GameState。

---

# 二、R19 当前可依赖基础

R20 可以直接依赖现有：

- `inventory`：R14 正式背包与真实物品数量；
- `equipment`：R15 四装备槽与换装 / 卸装；
- `cultivation`：当前 realm / stage、known techniques、main / auxiliary、proficiency；
- `injuries`：R18 authoritative injury runtime；
- `lifespan`：R19 authoritative lifespan runtime；
- `SessionCommand / debugLog / digest / replay / saveRepository`；
- `secretRealm.sunkenVeinChamber`：R13 沉脉石室状态。

R20 不应复制上述数据到 CombatState 形成第二真源。CombatState 只保存一场战斗真正需要的瞬时状态与引用。

---

# 三、C20 内容真源

C20 提交：

```text
e6cfeed25cb19c236cd36edcbcc95de9b14c1a14
V2 C20: freeze combat and equipment balance
```

该提交只修改：

```text
V2_CONTENT_BIBLE.md
```

未修改任何 `src/`。

C20 CI：

```text
run 31992012512
verify 95277128409
Typecheck ✅
Test ✅
Build ✅
```

实现时以 `V2_CONTENT_BIBLE.md` **第 37 节**为战斗数值唯一内容真源。

---

# 四、10 件装备已冻结

| 装备 | 阶品 | R20 核心效果 |
|---|---|---|
| 青锋剑 | 一阶下品 | 普攻 ×1.00，1 beat |
| 黑铁重剑 | 一阶中品 | 普攻 ×1.55，2 beats，12pp 穿甲 |
| 赤纹刀 | 一阶中品 | 普攻 ×1.05；火属性主动最终伤害 ×1.12 |
| 青竹灵弓 | 一阶中品 | 正常开战先手 ×1.15；近身普攻 ×0.65 |
| 黑铁护甲 | 一阶中品 | 20% 护甲减伤；逃跑 -12pp |
| 青狼软甲 | 一阶中品 | 12% 护甲减伤；无移动惩罚 |
| 护心镜 | 一阶上品 | 重伤级命中 ×0.50；R20 每战一次 |
| 镇灵玉 | 一阶中品 | mind / spirit 抵抗 +30pp |
| 流云靴 | 一阶上品 | 逃跑 +15pp |
| 寻灵盘 | 一阶上品 | 战斗数值 0；保持探索用途 |

小型储物袋不属于这 10 件战斗 / 装备平衡对象。

---

# 五、HP / Qi / baseAttack

正式表：

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

顺序为：

```text
maxHP / maxQi / baseAttack
```

`baseAttack` 是境界 / 小阶段提供的基础攻击尺度；R20 不临时把 constitution / comprehension 再接进第二套攻击公式。

HP / Qi 属于战斗 runtime。战斗 beat 不推进 `worldDay`；长期代价由 injury / world state 承接。

---

# 六、伤害与护甲

```text
普通攻击：
rawDamage = baseAttack × weaponBasicMultiplier

武器招式：
rawDamage = baseAttack × weaponBasicMultiplier × moveMultiplier

纯术法：
rawDamage = baseAttack × spellMultiplier
```

纯术法不乘武器普攻倍率；赤纹刀 fire-active +12% 是明确例外。

护甲：

```text
effectiveArmorReduction
= clamp(0, 35%, armorReduction - armorPenetration)

afterArmor
= round(rawDamage × (1 - effectiveArmorReduction))
```

穿甲按百分点扣减。

首版无：暴击 / 命中 / 闪避 / 随机伤害浮动。

`暴露`：下一次受伤 ×1.25，然后消耗。

---

# 七、combat beat

一个 beat 是一个完整决策窗口，不是实时秒数。

顺序：

```text
到期状态 / 上一拍预兆动作
→ 免费换主武器一次
→ 玩家一个 beat action；否则自动普攻
→ 玩家结算，目标死亡则立刻结束
→ 敌人结算
→ cooldown / 状态推进 / 生成下一拍预兆
```

占 beat：主动招式、丹药、符箓、一次性法器、逃跑。

换武器不占 beat，但每 beat 最多一次。

黑铁重剑普攻间隔 2 beats；切武器不能重置 `nextBasicAttackBeat`。

逃跑成功后敌人本 beat 不追补攻击；失败则玩家损失本 beat 行动，敌人照常行动。

强招必须提前一 beat 预兆。

---

# 八、首批主动招式

```text
刺        Qi 8  ｜武器×1.20｜+5pp穿甲｜cd0
斩        Qi14  ｜武器×1.55｜cd1
御剑追击  Qi18  ｜武器×1.35；追击目标×1.65｜小成｜cd2
火弹      Qi12  ｜术法×1.35｜cd0
炎爆      Qi24  ｜术法×1.85｜cd2
缠束      Qi14  ｜同境70% / 高一境40% / 低一境90% 束缚1beat｜cd2
荆刺      Qi16  ｜术法×1.25；束缚目标×1.55｜cd1
水幕      Qi18  ｜下一次命中×0.65；2beats后过期｜cd2
石甲护体  Qi20  ｜3beats额外减伤20%；逃跑-15pp｜cd3
金芒      Qi16  ｜术法×1.45｜18pp穿甲｜cd1
```

控制使用 seeded combat RNG。

战前最多配置 4 个主动招式；是否真实已学继续读取 R17 known technique + move unlock。

不要自动发招式。

---

# 九、战斗消耗品

```text
回气丹：+40 Qi，1 beat，每战最多2枚
火符：baseAttack×1.45，1 beat
金刃符：baseAttack×1.30，20pp穿甲，1 beat
护身符：下一次命中×0.55，最长3beats，1 beat
轻身符：3beats逃跑+25pp，移除1个迟缓，1 beat
破灵锥：破可破护体 + 暴露；无护体仅 baseAttack×0.60
雷火珠：min(baseAttack×2.20, targetMaxHP×35%)，10pp穿甲
困兽索：妖兽同/低大境85%束缚2；高一50%束缚1；高二+20%束缚1
```

清障符、传音符不加战斗伤害。

---

# 十、逃跑

```text
fleeChance = clamp(10%, 90%, 50% + modifiers)
```

关键修正：

- 同大境界按阶段带，每档 ±5pp；
- 低 / 高一大境界：-20 / +20pp；
- 差两大境界以上：±35pp；
- 轻身术 +8；流云步 +15；踏风行 +20，只取最高身法；
- 身轻步稳 +8；
- 流云靴 +15；
- 轻身符 +25；
- 黑铁护甲 -12；
- 石甲 -15；
- light / severe / meridian injury = -5 / -15 / -10，伤势合计最低 -20；
- 迟缓 -20；
- 束缚直接不能逃。

敌人 / 地形 hook 只有内容明确时才读，不造 speed 属性。

UI 必须显示准确逃跑率与主要修正来源。

---

# 十一、R20 只允许的 4 个测试敌人

### T-01 青背狼

```text
炼气2量级｜HP105｜Qi0｜attack12｜armor0
咬×1.00
扑击×1.60，提前一beat预兆
HP≤25%可逃
玩家逃跑-8pp
```

### T-02 成年岩甲蜥

```text
炼气4量级｜HP155｜Qi0｜attack16｜armor22%
咬×1.00
扫尾×1.70，提前预兆
扫尾后自身暴露一次
沉脉石室个体不逃
玩家逃跑+5pp
```

### T-03 赤鬃山猿

```text
炼气8量级｜HP210｜Qi0｜attack26｜armor8%
重拳×1.00
蓄力砸击×2.00，提前预兆
HP≤30%进入狂暴
玩家逃跑-5pp
```

### T-04 普通散修

```text
炼气5｜HP140｜Qi100｜attack18｜armor12%
青锋剑
可用火弹
最多1张真实火符作为测试携带物
HP≤30%优先逃跑
```

C20 没有冻结这 4 个样本的正式掉落；R22 才负责。

---

# 十二、R13 临时战斗必须在 R20 被替换

当前沉脉石室仍有旧的：

```text
encounterChance()
resolveCoreEncounter()
```

它们按境界 + RNG 直接决定岩甲蜥胜负，只是 R13 在 CombatEngine 出现前的临时占位。

R20 必须：

```text
进入脉心室
→ 创建正式 Combat runtime
→ 对手使用 T-02 成年岩甲蜥
→ 正式 combat victory
→ secretRealm encounter = victory
→ 才能继续泄压 / 离开
```

HP ≤ 0 走唯一死亡流程。

旧概率 resolver 必须删除或停止调用，不允许长期保留两套战斗真源。

---

# 十三、R20 与 R18 injury 接口

R20 不造第二套伤势。

战斗结束：

- HP ≤ 0：直接死亡；
- 存活且最终 HP ≤10%，或单次最终命中 ≥35% maxHP：severe；
- 否则最终 HP ≤30%，或单次最终命中 ≥25% maxHP：light；
- severe 优先于 light；
- meridian 只由明确经脉 / 丹田伤害生成；R20 四测试敌人不随机生成。

恢复时间继续走 R18 injury 规则。

R21 才实现 poison runtime、清毒 / 止血 / 养脉与伤势恶化。

---

# 十四、R20 / R21 / R22 / R23 范围边界

R20：

```text
CombatState
HP / Qi
离散 beat
自动普攻
最多4主动招式
真实丹药 / 符 / 一次性法器
快速换武器
精确逃跑率
胜 / 负 / 逃 / 死
Session / save / replay
沉脉石室正式战斗替换
```

R21：poison、完整伤势恶化与治疗。

R22：8 妖兽正式 combat data、掉落、刷新、named death、妖丹 / 精血来源。

R23：危险判断、强妖兽领地、独特妖兽死亡后的区域危险变化。

R20 禁止顺手实现后面三轮。

---

# 十五、仍待正确时机补齐的内容缺口

1. 8～12 个正式随机子地点模板；
2. 如首版确实需要，再冻结第 2 个小秘境；
3. 8～12 个重大机缘具体内容，C30 前补；
4. 30 个普通事件正式正文；
5. 高阶功法、抱元丹、延寿物的真实世界获取入口，在宗门 / NPC / 商店 / 机缘对应轮实现；
6. R21 完整治疗 / 中毒；
7. R22 妖兽掉落与二阶妖丹 / 精血来源。

**已关闭缺口：首版 10 件装备的具体阶 + 品与 R20 基础战斗数值。**

---

# 十六、当前迁移主线

```text
出生三选一 ✅
→ 童年 ✅
→ 成年 / 入道 ✅
→ 世界 / 地点知识 / 旅行 / 探索 ✅
→ 随机子地点 ✅
→ 沉脉石室 ✅
→ 背包 / 装备结构 ✅
→ 修炼 / 功法 / 筑基 ✅
→ 寿元 / 延寿 / 金丹 ✅
→ C20 战斗 / 装备数值冻结 ✅
→ R20 半自动战斗 ← 下一轮
→ R21 伤势与治疗
→ R22 妖兽与战利品
→ R23 危险判断 / 强大妖兽领地
→ 宗门 / NPC / 职业 / 世界事件
```

---

# 十七、下一步

执行：

> **R20｜半自动战斗骨架**

只依据 `V2_CONTENT_BIBLE.md` 第 37 节实现，不再改战斗内容数值，不提前做 R21～R23。