# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**C21「伤势 / 中毒 / 治疗内容冻结」已完成；下一轮执行 R21「伤势 / 中毒 / 治疗闭环」。**
- R00.1～R04：迁移、唯一 GameState、Session / replay、V3 单档存档、V2 Game Shell 完成。
- R05～R07：出生三选一、童年、成年 / 入道完成。
- R08～R13：固定世界、地点知识、旅行、区域探索、随机子地点、首版秘境「沉脉石室」完成。
- R14～R15：正式背包、储物袋、四槽装备完成。
- C16 / R16～R17：修炼内容、炼气修炼、功法 / 熟练 / 改修完成。
- R18：authoritative injury runtime 与炼气→筑基完成。
- C19 / R19：寿元、延寿、筑基后修炼、结丹与金丹完成。
- C20 / R20：战斗数值冻结、唯一正式 Combat runtime、半自动 beat、装备 / 物品 / 招式 / 逃跑、伤势 / 死亡、save / replay、沉脉石室正式岩甲蜥战斗完成。
- **C21：light / severe / meridian 行动影响、mild / serious poison、worldDay 恶化、止血散 / 清毒散 / 养脉丹精确治疗与死亡边界已冻结到 `V2_CONTENT_BIBLE.md` 第 38 节。**

legacy Action/Event/Result/End 与 R13 旧概率岩甲蜥 resolver 仍只承担历史兼容；正式玩家战斗只走 R20 CombatEngine。

---

# 一、继续保持的唯一状态纪律

```text
UI / feature
→ SessionCommand
→ resolver / GameAction
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

当前 authoritative truths：

- inventory：R14；
- equipment：R15；
- cultivation / technique：R16～R17；
- injury：R18；
- lifespan：R19；
- combat：R20；
- poison：**R21 新增时必须做 optional authoritative state，不得另建第二套伤势或 HP。**

R20 已有 combat command gate：active `state.combat` 时只允许正式 `COMBAT_ACTION` 通过；R21 的治疗不能绕过该门禁在战斗内直接改长期状态。

---

# 二、R18 injury 历史语义不可推翻

现有 injury：

```text
light
severe
meridian
```

每条记录已有：

```text
startedDay
recoveryDay
```

active 判定仍是：

```text
recoveryDay > worldDay
```

C21 的关键决定：**不建立第二个“累计静养天数”计时器。**

安全休养只是主动推进 worldDay；治疗药通过缩短某条 injury 的 `recoveryDay` 起效。

已有来源继续合法：

- R20 普通 light：10 日；
- R20 普通 severe：45 日；
- 突破极端来源可以已有 90 日 severe / meridian；
- 旧记录不补历史字段、不重写旧 command replay。

---

# 三、C21 三类 injury 最终职责

## light

- 旅行：允许；
- wilderness 探索：允许；
- 普通修炼：继续现有 `×0.90`；
- 大境界突破：不单独硬锁，但继续已有可见负修正；
- Combat：不改 maxHP / maxQi / baseAttack；
- flee：继续 `-5pp`；
- 普通活动不会恶化；
- 普通战斗来源仍为 10 日。

## severe

- 正常节点旅行 / 寻医：允许；
- 新开启 wilderness 系统探索：禁止；
- 新进入秘境 / 明确高风险探索：禁止；
- 已在不可回头地点时，必须允许离开 / 泄压 / 返回安全处，不能锁死；
- 普通修炼：禁止；
- 筑基 / 结丹：禁止；
- Combat：允许，但开战时 `maxHP ×0.70`，向下取整；baseAttack 不变；
- flee：继续 `-15pp`；
- 普通安全旅行 / 休养不随机恶化；
- 普通来源 45 日，明确极端来源可为 90 日。

若已经 severe，又在一场新战斗结束时再次满足 R20 severe 判定：

```text
existing severe recoveryDay +15日
但从当前 worldDay 算的剩余 severe 恢复时间最多90日
```

不新增 critical injury。

## meridian

- 普通生活 / 旅行：允许；
- wilderness 探索：本身不禁止；
- 普通修炼：禁止；
- 所有大境界突破：禁止；
- Combat：`maxQi ×0.65`，向下取整；招式 Qi cost 不变；baseAttack 不变；
- flee：继续 `-10pp`；
- 普通走路 / 旅行不随机恶化；
- 继续读取真实来源已有 recoveryDay。

### 组合规则

- severe `maxHP ×0.70` 与 serious poison `maxHP ×0.85` 同时存在时只取更强的 `×0.70`，不相乘；
- meridian `maxQi ×0.65` 可以与 maxHP penalty 同时存在；
- light 与 mild poison 都为修炼 `×0.90` 时只取最强单项，不叠成 `×0.81`；
- R20 flee injury 合计仍最低只计到 `-20pp`。

---

# 四、C21 poison runtime 已冻结

首版只做：

```text
mild → serious → death
```

canonical 碧水蛇 poison family：

```text
bishui_venom
```

每个 active poison family 至少保存：

```text
poisonId / family
severity
appliedDay
nextWorsenDay
```

字段名可按现有风格调整，语义不可改。

## 首次中毒

```text
mild
appliedDay = current worldDay
nextWorsenDay = current worldDay +10
```

## 同 family 再中毒

- mild：立即升级 serious；`nextWorsenDay = current worldDay +10`；
- serious：不叠第三层，也**不能刷新 / 延后死亡期限**。

## worldDay 恶化

```text
mild 到期
→ serious
→ 再给10日

serious 到期
→ 非战斗死亡
```

因此一次未经处理的 mild 碧水蛇毒最长约 20 日后死亡；重复中毒可提前进入 serious。

长行动跨多个 milestone 时必须按时间顺序处理；若死亡发生在动作中途，`worldDay` 停在真正死亡日，后续时间与奖励不再结算。

---

# 五、poison 对行动 / Combat 的影响

## mild

- 旅行：允许；
- wilderness 探索：允许；
- 普通修炼：`×0.90`；
- 筑基 / 结丹：禁止；
- Combat：只显示中毒状态，不做每 beat DOT，不改 maxHP / maxQi。

## serious

- 正常旅行寻医：允许，但路上仍可能到死亡期限；
- wilderness 系统探索 / 新秘境进入：禁止；
- 普通修炼：禁止；
- 筑基 / 结丹：禁止；
- Combat：`maxHP ×0.85`，向下取整；
- **不做每 beat poison DOT。**

UI 必须显示距离下一次恶化 / 死亡还有多少 worldDays。

安全休养不会清毒，只会推进 worldDay；使用 `recuperate-days` 前必须显示 poison 风险。

---

# 六、三种治疗物精确效果

R21 canonical item ids：

```text
zhixue_san   止血散
qingdu_san   清毒散
yangmai_dan  养脉丹
```

三种均：

- 使用真实 inventory stack；
- 使用本身不推进 worldDay；
- active combat 中不可直接使用；
- 没有有效治疗目标时拒绝且不消耗；
- 已知无效目标要在消耗前拒绝。

## 止血散

对一个选定 active injury：

```text
light  → remaining recovery -7日
severe → remaining recovery -5日
```

如果缩短后到期，立即恢复。

- 不治 meridian；
- 不治 poison；
- 每条 injury record 最多受益一次。

## 清毒散

首版 `bishui_venom` 属于可治疗 common low-grade poison。

```text
mild
→ 1包直接清除

serious
→ 1包降为 mild
→ nextWorsenDay = current worldDay +10
```

降为 mild 后第 2 包可直接清除，因此 serious 低阶毒想当场彻底解决需要真实消耗 2 包。

未知 / 高阶 poison 没有明确可治疗 tag 时，清毒散不可用且不消耗。

## 养脉丹

对一个选定 active meridian injury：

```text
remaining recovery -30日
```

如果缩短后到期，立即恢复。

- 不治 light / severe / poison；
- severe + meridian 同时存在时只处理 meridian；
- 每条 meridian injury record 最多受益一次。

典型：

```text
45日经脉伤 → 剩15日
90日极端经脉伤 → 剩60日
```

一枚一阶中品丹药不能清空严重丹田 / 经脉损伤。

---

# 七、治疗渠道边界

R21 只实现：

1. 自己用真实药；
2. 既有 10 / 30 日安全休养。

休养只按时间自然推进，不额外 ×2 恢复。

医者 / 青云宗 / 家族治疗只留 authoritative hook；实际谁能治、价格、地点、关系由后续 NPC / 宗门内容承载。R21 不造免费医生菜单。

---

# 八、死亡与恶化边界

继续：

```text
Combat HP = 0 → 立即死亡
```

R21 新的通用非战斗死亡：

```text
serious poison 到达 death milestone → 死亡
```

severe **不会仅因日历流逝随机暴毙**。它的真实危险来自 maxHP penalty、行动限制、带伤再战、以及再次 severe 后延长恢复。

未来某个明确事件若提前写清“带重伤执行可能致死”，再按该事件规则处理；R21 不做每走一天随机死亡。

---

# 九、R21 与 R22 边界

R21 负责 generic：

```text
injury action gates
poison optional runtime
worldDay poison milestones
三个治疗物
Combat injury/poison penalties
UI
Session / save / replay
```

R22 才负责：

- 8 种妖兽正式 Combat data；
- 碧水蛇正式攻击如何施加 `bishui_venom`；
- 妖兽真实掉落；
- 毒囊 / 妖丹 / 精血来源；
- 普通妖兽刷新；
- named / unique death；
- 生态变化。

R21 可以用 generic resolver / test action 验证 `bishui_venom`，但不得把碧水蛇提前做成正式野外敌人。

---

# 十、R20 可依赖提交

R20 主功能：

```text
8dfb65fbcbaacbd8201cf389694eaa6e8fe80dea
```

Combat command gate FIX：

```text
7e502ba01c0741172dcd85eb57ef35ed8c45b486
```

R20 最终交接 / C21 task：

```text
5a51f5cb20acdd03ff4b186e4f1be6211769eae7
```

R20 最终 CI 已绿；C21 本轮只改文档，不修改 `src/`。

---

# 十一、仍待后续的内容缺口

继续保留：

1. 8～12 个正式随机子地点模板；
2. 如首版确实需要，再冻结第 2 个小秘境；
3. 8～12 个重大机缘具体内容，C30 前补；
4. 30 个普通事件正式正文；
5. 高阶功法、抱元丹、延寿物的真实世界获取入口；
6. C22 / R22 妖兽全量 combat / 掉落 / 刷新 / unique death；
7. R23 危险判断 / 强大妖兽领地。

已关闭：

- R20 战斗数值与双真源；
- R21 开工前的 injury / poison / treatment 数值缺口。

---

# 十二、当前主线

```text
出生 / 童年 / 成年 ✅
→ 世界 / 知识 / 旅行 / 探索 ✅
→ 子地点 / 沉脉石室 ✅
→ 背包 / 装备 ✅
→ 修炼 / 功法 / 筑基 ✅
→ 寿元 / 延寿 / 金丹 ✅
→ C20 战斗数值 ✅
→ R20 半自动战斗 ✅
→ C21 伤势 / 中毒 / 治疗内容冻结 ✅
→ R21 伤势 / 中毒 / 治疗 ← 下一轮
→ C22 妖兽 / 生态内容冻结
→ R22 妖兽与战利品
→ R23 危险判断 / 强大妖兽领地
→ 宗门 / NPC / 职业 / 世界事件
```

下一轮严格执行 `CURRENT_TASK.md` 的 R21，不提前做 R22。