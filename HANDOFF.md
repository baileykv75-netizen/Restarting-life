# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R21「伤势 / 中毒 / 治疗闭环」已完成；C22「妖兽 / 生态内容冻结」已完成；下一轮执行 R22「妖兽与战利品」。**
- R00.1～R15：迁移、唯一 GameState、出生、童年、成年、世界、知识、旅行、探索、子地点、沉脉石室、背包与装备完成。
- C16 / R16～R17：修炼内容、炼气修炼、功法 / 熟练 / 改修完成。
- R18：authoritative injury runtime 与炼气→筑基完成。
- C19 / R19：寿元、延寿、筑基后修炼、结丹与金丹完成。
- C20 / R20：战斗数值冻结、唯一正式 Combat runtime、半自动 beat、装备 / 物品 / 招式 / 逃跑、伤势 / 死亡、save / replay、沉脉石室正式岩甲蜥战斗完成。
- C21 / R21：injury action gates、optional poison runtime、worldDay 毒性恶化、三种治疗物、Combat health penalties、UI / save / replay 完成。
- **C22：首版 8 种妖兽正式 combat data、真实战利品、妖丹 / 精血来源、ordinary population pressure、寒潭鳞蟒 special death、独角苍狼 unique death 与生态后果已经冻结到 `V2_CONTENT_BIBLE.md` 第 39 节。**

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

当前 authoritative truths：

- inventory：R14；
- equipment：R15；
- cultivation / technique：R16～R17；
- injury：R18；
- lifespan：R19；
- combat：R20；
- poison / treatment：R21；
- beast combat / loot / ecology：**R22 下一轮接入，必须复用现有 Combat / Inventory / worldDay，不得再建第二套敌人、背包或时间系统。**

legacy Action/Event/Result/End 与 R13 旧概率岩甲蜥 resolver 只做历史兼容；实际玩家战斗继续只走正式 CombatEngine。

---

# 二、R21 已完成

R21 提交链：

```text
d22fdeb9763c68a0aaa33d348a6c5bf03e0107ce  V2 R21: implement injury poison and treatment loop
2c1699b...                                      R21 compatibility FIX
61ce3101c0ce43004728394a3b054f6bbc465331  R21 regression / compatibility FIX
3839ca9185703e6984faf282f464a6140853cf54  switch CURRENT_TASK to C22
```

R21 现有行为必须保留：

### injury

- `light / severe / meridian` 继续由 R18 `startedDay / recoveryDay` 唯一计时；
- light：旅行 / wilderness 可做，修炼 ×0.90，Combat 不改 HP/Qi；
- severe：禁止新 wilderness / 新秘境 / 修炼 / 突破；Combat maxHP ×0.70；
- meridian：禁止修炼 / 突破；Combat maxQi ×0.65；
- severe 与 serious poison 的 maxHP penalty 只取更强项，不相乘。

### poison

optional authoritative runtime：

```text
mild → 10日 → serious → 10日 → death
```

canonical first family：

```text
bishui_venom
```

- 所有恶化统一由 `worldDay` milestone 驱动；
- 长行动不能跨过 poison death 继续结算奖励；
- Combat beat 内不做 poison DOT；
- serious poison Combat maxHP ×0.85。

### treatment

```text
zhixue_san   止血散：light -7日 / severe -5日，每条 injury 一次
qingdu_san   清毒散：mild 清除；serious → mild +10日，再一包可清
 yangmai_dan 养脉丹：meridian -30日，每条 injury 一次
```

使用真实 inventory；战斗中不可绕过 Combat gate 使用；无有效目标拒绝且不消耗。

---

# 三、C22 第 39 节：8 种妖兽正式 Combat data

canonical ids：

```text
greenback_wolf           青背狼
redtail_fox              赤尾狐
ironhide_boar            铁甲猪
bishui_snake             碧水蛇
rock_armored_lizard      岩甲蜥
red_maned_ape            赤鬃山猿
cold_pool_scale_python   寒潭鳞蟒
one_horned_azure_wolf    独角苍狼
```

核心数值：

| 妖兽 | 量级 | HP | attack | armor | 核心机制 |
|---|---|---:|---:|---:|---|
| 青背狼 | 炼气2 | 105 | 12 | 0% | 扑击×1.60；低血量一次65%撤退；玩家逃跑-8pp |
| 赤尾狐 | 炼气2 | 90 | 11 | 0% | HP≤55%急遁；预兆后85%脱离；玩家逃跑+5pp |
| 铁甲猪 | 炼气3 | 150 | 15 | 18% | 冲撞×1.80；结算后自身暴露；不逃 |
| 碧水蛇 | 炼气3 | 125 | 14 | 4% | 毒袭×1.25；真实伤害后记录 bishui exposure |
| 成年岩甲蜥 | 炼气4 | 155 | 16 | 22% | 扫尾×1.70；自身暴露；普通个体可逃；秘境个体不逃 |
| 赤鬃山猿 | 炼气8 | 210 | 26 | 8% | 砸击×2.00；护身；HP≤30%狂暴 |
| 寒潭鳞蟒 | 筑基前～中 | 300 | 46 | 12% | 缠杀束缚 / 寒息迟缓；寒潭地形强化 |
| 独角苍狼 | 筑基中 | 340 | 52 | 10% | 狼啸3拍增伤 / 裂风扑杀；低血量狂暴；unique不逃 |

青背狼、岩甲蜥、赤鬃山猿的 C20 核心数值不改，R22 必须锁住回归。

---

# 四、碧水蛇 poison 正式接口

C22 冻结：普通咬击不自动施毒；只有“毒袭”造成最终实际伤害 > 0 时：

```text
pendingPoisonExposures.bishui_venom += 1
```

Combat beat 内不扣毒伤。

战斗以玩家存活方式结束时，在清除 CombatState 前按 exposure 次数顺序调用 R21 poison resolver：

```text
clean +1 → mild
clean +2 → serious
mild +1 → serious
serious + any → serious，且不刷新死亡期限
```

玩家已 Combat HP=0 死亡时不再额外写长期 poison。

---

# 五、真实战利品

共同规则：

- 妖兽不掉灵石；
- 不掉装备箱、随机词条、经验球；
- 只掉真实身体材料；
- 普通 Combat 不随机打坏皮 / 鳞 / 甲；
- future explicit `damaged-carcass` 才能让皮鳞甲数量减半；
- loot RNG seeded，save / replay 必须一致。

主要 canonical material ids：

```text
greenback_wolf_pelt
greenback_wolf_fang
redtail_fox_pelt
redtail_fox_tail_fur
ironhide_boar_hide
ironhide_boar_tusk
beast_bone
bishui_venom_sac
bishui_snake_gall
bishui_snake_skin
rock_lizard_carapace
rock_lizard_mineral_crystal
red_maned_ape_tendon
low_grade_beast_essence
immature_beast_core
mature_first_tier_beast_core
cold_pool_python_scale
cold_pool_python_tendon
cold_pool_python_cold_sac
complete_second_tier_beast_core
high_grade_beast_essence
azure_wolf_pelt
azure_wolf_horn
```

精确数量与条件以 Content Bible §39.6 为唯一真源。

### C19 邪道结丹资源

稳定 `complete_second_tier_beast_core + high_grade_beast_essence` 只来自：

1. 本世生成并击杀的寒潭鳞蟒；
2. 独角苍狼。

低阶妖兽不得刷出二阶妖丹；赤鬃山猿强个体最多一阶成熟妖丹。

---

# 六、ordinary population pressure

ordinary respawnable：

- 青背狼；
- 赤尾狐；
- 铁甲猪；
- 碧水蛇；
- 普通岩甲蜥；
- 普通赤鬃山猿。

每个 `region + species`：

```text
populationPressure: 0 | 1 | 2 | 3
baseline = 2
```

```text
0 → 普通 encounter 不生成
1 → encounter weight ×0.50
2 → ×1.00
3 → ×1.50
```

玩家真实击杀 ordinary：

```text
pressure = max(0, pressure -1)
```

每跨过 30 worldDays 聚合检查：

```text
pressure < baseline → +1
pressure == baseline → 不变
pressure > baseline → 不自动下降
```

这是其他个体重新进入区域，不是死去妖兽复活。

---

# 七、special / unique world truth

## 寒潭鳞蟒

- 非每世生成；
- seeded 决定；
- 生成后有稳定 instance id / alive；
- 只在灵溪谷深处对应寒潭；
- 死亡本世不刷新；
- loot 一次；
- lair-cleared；
- 区域危险变化留 R23。

## 独角苍狼

- 首版每世存在 1 只 unique world-truth；
- 玩家可能终生不知道 / 没遇见；
- known/discovered 与 world truth 分离；
- NPC / 世界事件未来也可处理它；
- 死亡永久 `alive=false`，loot 一次；
- Chronicle / 《此世传》资格；
- E03 读取死亡事实；
- 万兽岭青背狼 `baseline: 2 → 1`；当前 pressure 压到 `min(current,1)`；
- R23 再把该事实换算成区域危险。

狼群不会灭绝，会恢复到新的 baseline=1。

---

# 八、R22 必须注意的兼容点

1. **不要建立第二套 BeastCombatEngine。** 8 种妖兽必须扩展现有 CombatEngine / combat definitions。
2. **Inventory 仍是唯一所有权真源。** loot 必须进入 R14 inventory。
3. **容量不足不能回滚已经胜利的战斗。** R22 应使用明确 pending-loot / claim 语义，不能因为背包满了把敌人复活。
4. **沉脉石室岩甲蜥不得重复掉两份身体材料。** 当前秘境已有 R13/R14 奖励链；`source = sunken-vein-core` 时，要么继续以秘境既有 claim 为 authoritative，要么做一次显式迁移，但绝不能 generic beast loot + secret realm reward 双发。
5. poison exposure 在玩家胜利 / 玩家逃跑 / 妖兽逃跑时都要正确落入 R21 poison；Combat death 则不再写 poison。
6. ordinary 30 日恢复必须进入现有 worldDay 时间推进，不做 React timer / 第二时钟。
7. 寒潭鳞蟒 / 独角苍狼 world truth 与玩家知识分离；UI 不得提前泄露 hidden unique。
8. R22 不修改 R23 的区域危险评分。

---

# 九、当前待办与边界

`CURRENT_TASK.md` 下一轮必须是：

> **V2 R22 - 妖兽与战利品**

R22 只实现：

```text
§39 8种妖兽正式 Combat data
→ telegraph / special / escape AI
→ bishui poison exposure
→ deterministic real loot
→ inventory claim
→ population pressure
→ 30日恢复
→ cold-pool python special state
→ unique azure wolf death / once loot
→ save / replay / UI
```

R23 才实现：

- 区域危险读取正式 combat capability / population pressure；
- 强大妖兽领地；
- 独角苍狼死亡后的危险展示；
- W02 等世界事件修改 pressure / baseline。

远期仍保留：

1. 8～12 个正式随机子地点模板；
2. 如首版确实需要，第 2 个小秘境；
3. 8～12 个重大机缘具体内容；
4. 30 个普通事件正式正文；
5. 高阶功法、抱元丹、延寿物的真实世界获取入口；
6. 宗门 / NPC / 关系深化；
7. 炼丹 / 炼器 / 御兽职业闭环；
8. 世界事件 / 邪修 / 黑市 / 通缉。

---

# 十、当前主线

```text
出生 / 童年 / 成年 ✅
→ 世界 / 知识 / 旅行 / 探索 ✅
→ 子地点 / 沉脉石室 ✅
→ 背包 / 装备 ✅
→ 修炼 / 功法 / 筑基 ✅
→ 寿元 / 延寿 / 金丹 ✅
→ C20 / R20 战斗 ✅
→ C21 / R21 伤势 / poison / 治疗 ✅
→ C22 妖兽 / 生态内容冻结 ✅
→ R22 妖兽与战利品 ← 下一轮
→ R23 危险判断 / 强大妖兽领地
→ 宗门 / NPC / 职业 / 世界事件
```
