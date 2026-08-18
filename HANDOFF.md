# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R22「妖兽与战利品」已完成实现与专项回归；下一步先做 R22-FIX「成年野外循环验收」，不要直接扩 R23。**
- R00.1～R15：迁移、唯一 GameState、出生、童年、成年、世界、知识、旅行、探索、子地点、沉脉石室、背包与装备完成。
- C16 / R16～R17：修炼内容、炼气修炼、功法 / 熟练 / 改修完成。
- R18：authoritative injury runtime 与炼气→筑基完成。
- C19 / R19：寿元、延寿、筑基后修炼、结丹与金丹完成。
- C20 / R20：唯一正式 Combat runtime、半自动 beat、装备 / 物品 / 招式 / 逃跑、战斗伤势 / 死亡、save / replay、沉脉石室正式岩甲蜥战斗完成。
- C21 / R21：injury action gates、optional poison runtime、worldDay 毒性恶化、三种治疗物、Combat health penalties、UI / save / replay 完成。
- C22 / R22：首版 8 种妖兽、telegraph / escape AI、碧水蛇 poison exposure、真实战利品、pending corpse loot、ordinary population pressure、30 日恢复、寒潭鳞蟒 special world truth、独角苍狼 unique world truth 与生态后果完成。
- R23 **尚未开始**：本轮没有修改区域危险评分、强大妖兽领地或世界事件。

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
- beast combat：继续扩展 R20 CombatEngine；
- beast loot：R22 `resolveBeastLoot()` + `pendingBeastLoot`，真正所有权仍只在 R14 inventory；
- beast ecology：R22 optional `beastEcology`；
- ecology recovery：继续只由统一 `worldDay` 驱动。

禁止后续新增：

```text
BeastCombatEngineV2
第二套 inventory
第二套 world timer
GameStateV2
独立的“怪物掉落背包”
```

---

# 二、R22 主要实现文件

```text
src/types/beast.ts
src/data/beasts.ts
src/data/beastItems.ts
src/core/beastEngine.ts
src/core/beastEcologySelectors.ts
src/components/BeastLootPanel.tsx
src/beast-loot.css
```

并扩展：

```text
src/types/game.ts
src/types/combat.ts
src/types/gameAction.ts
src/data/combat.ts
src/data/items.ts
src/core/combatEngine.ts
src/core/gameActionReducer.ts
src/core/worldEngine.ts
src/App.tsx
```

专项测试：

```text
src/core/beastEngine.test.ts
src/core/beastEcologySelectors.test.ts
```

---

# 三、首版 8 种妖兽

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

核心数值严格按 Content Bible §39：

| 妖兽 | 量级 | HP | attack | armor | 核心机制 |
|---|---|---:|---:|---:|---|
| 青背狼 | 炼气2 | 105 | 12 | 0% | 扑击×1.60；HP≤25% 一次 65% 撤退；玩家逃跑-8pp |
| 赤尾狐 | 炼气2 | 90 | 11 | 0% | HP≤55% 急遁预兆；下一拍 85% 脱离；玩家逃跑+5pp |
| 铁甲猪 | 炼气3 | 150 | 15 | 18% | 冲撞×1.80；movement-required；结算后自身暴露 |
| 碧水蛇 | 炼气3 | 125 | 14 | 4% | 毒袭×1.25；真实伤害后写入 bishui exposure |
| 成年岩甲蜥 | 炼气4 | 155 | 16 | 22% | 扫尾×1.70；自身暴露；普通个体一次 35% 撤退；秘境个体不逃 |
| 赤鬃山猿 | 炼气8 | 210 | 26 | 8% | 蓄力砸击×2.00；护身 2 beats；HP≤30% 狂暴 |
| 寒潭鳞蟒 | 筑基前～中 | 300 | 46 | 12% | 缠杀 / 寒息；寒潭 context 强化；special 不逃 |
| 独角苍狼 | 筑基中 | 340 | 52 | 10% | 狼啸 3 beats 增伤 / 裂风扑杀；HP≤30% 狂暴；unique 不逃 |

C20 三个既有妖兽样本的 HP / attack / armor 保持原值，没有为 R22 改写旧战斗基线。

---

# 四、敌方 AI / telegraph 顺序

R22 继续使用 CombatState 的离散 beat，不建第二套 AI runtime。

敌方行动顺序：

```text
已有 telegraph 结算
→ 首次低血量行为
→ 正常特殊动作 / 普攻
```

关键规则：

- movement-required 特殊动作可被当拍束缚打断；
- cooldown 使用 `opponentSpecialReadyBeat`；
- 青背狼 / 碧水蛇 / 普通岩甲蜥的低血量逃跑只判定一次；
- 赤尾狐先展示急遁预兆，玩家获得反应窗口，下一拍才做 seeded 85% 脱离；
- 赤鬃山猿 / 独角苍狼低血量进入既有狂暴，不逃；
- 沉脉石室岩甲蜥不执行普通个体逃跑。

---

# 五、碧水蛇 poison 接口

普通咬击不施毒。

只有毒袭造成最终实际伤害 > 0 时：

```text
combat.pendingPoisonExposures.bishui_venom += 1
```

Combat beat 内没有 poison DOT。

玩家以存活方式结束战斗时——胜利、玩家逃跑、碧水蛇逃跑——在清除 CombatState 前按 exposure 次数调用 R21 poison resolver：

```text
clean +1 → mild
clean +2 → serious
mild +1 → serious
serious + any → serious，且不刷新死亡期限
```

Combat HP=0 死亡则不再写长期 poison。

---

# 六、寒潭 context

`cold-pool` 只通过明确 combat context tag 生效：

```text
damage ×1.10
armorReduction +5pp
player fleeChance -10pp
```

离潭后不传该 tag，即自然失去三项强化。

R22 没有新增格子水域、游泳条、实时距离或区域危险评分。

---

# 七、真实战利品

静态 definitions：`src/data/beasts.ts`

pure seeded resolver：

```ts
resolveBeastLoot(beastId, variant, rngState, context)
→ { items, nextRngState }
```

规则：

- 不使用 `Math.random()`；
- 妖兽不掉灵石；
- 不掉装备箱 / 随机词条 / 经验球；
- `strong` 条件只读真实 encounter variant；
- 普通 Combat 不自动制造 `damaged-carcass`；
- explicit `damaged-carcass` 才会让皮 / 鳞 / 甲数量减半向下取整；
- 同一 battleId 的 loot seed 确定性一致。

canonical material ids：

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

C19 稳定二阶资源来源仍只有：

1. 寒潭鳞蟒；
2. 独角苍狼。

普通妖兽绝不掉完整二阶妖丹 / 高品质精血；赤鬃山猿 strong 最多是一阶成熟妖丹。

---

# 八、pending corpse loot / 背包满

胜利结算与拾取分离：

```text
combat victory
→ world truth / population 先结算
→ seeded loot 只生成一次
→ pendingBeastLoot
→ 玩家按 item / quantity 领取
→ addItem() 继续作为唯一容量检查
```

关键兼容：

- 背包满时领取失败是 atomic reject；
- 不修改 remaining；
- 不回滚战斗；
- 不让已死妖兽复活；
- pending 未处理时禁止开启下一场会覆盖尸体 loot 的战斗；
- 玩家可显式放弃全部剩余战利品；
- `pendingBeastLoot` 不是第二背包，只表示地面 / 尸体上尚未取得的材料。

UI 已显示：妖兽名、remaining、背包占用 / 容量、领取 1、全部领取、放弃剩余。

---

# 九、沉脉石室岩甲蜥兼容

`source = sunken-vein-core` 的成年岩甲蜥：

```text
继续走既有 R13 / R14 secret-realm reward / claim
不生成 R22 generic beast corpse loot
```

因此不会出现：

```text
secret-realm reward + generic rock-lizard loot
```

旧 R13 replay 不需要反向迁移。

---

# 十、ordinary population pressure

ordinary 六种：

```text
greenback_wolf
redtail_fox
ironhide_boar
bishui_snake
rock_armored_lizard
red_maned_ape
```

每个 `location + species` optional materialize：

```text
pressure: 0 | 1 | 2 | 3
baseline: 0 | 1 | 2 | 3
lastRecoveryCheckDay: number
```

初始：

```text
pressure = 2
baseline = 2
```

真实击杀 ordinary：

```text
pressure = max(0, pressure - 1)
```

敌人逃跑 / 玩家逃跑不降低。

encounter weight selector 已冻结：

```text
pressure 0 → 0
pressure 1 → 0.50
pressure 2 → 1.00
pressure 3 → 1.50
```

30 worldDays 恢复继续接统一 `advanceWorldTime()`：

```text
pressure < baseline → 每跨一个 30 日 milestone +1，最多到 baseline
pressure == baseline → unchanged
pressure > baseline → unchanged
```

长动作跨多个 milestone 会聚合恢复；如果 poison / lifespan 在中途终止动作，只按真实到达的 `worldDay` 结算。

---

# 十一、寒潭鳞蟒 special world truth

optional ecology 第一次真实需要时 deterministic materialize。

状态：

```text
generated
instanceId
alive
lootClaimed
lairCleared
```

规则：

- 非每世生成；
- 当前实现用 `runSeed` deterministic 50/50 presence 作为执行概率，因为 C22 冻结了“seeded generated or absent”但没有额外冻结出现率；
- 生成后 instance id 稳定；
- 死亡本世不刷新；
- 死亡即 `lairCleared=true`；
- pending loot 处理完 / 放弃后 `lootClaimed=true`；
- UI 不提前展示其是否生成。

如果后续内容冻结给出明确出现率，只调整 seeded presence rule，不改变 world-truth 结构。

---

# 十二、独角苍狼 unique world truth

每世始终存在唯一 world truth：

```text
uniqueId = one_horned_azure_wolf
instanceId
alive
lootClaimed
```

玩家 knowledge / discovery 没有和该 truth 绑定，未发现时 UI 不泄露。

玩家斩杀后原子结算：

1. `alive=false`，本世永久不刷新；
2. unique loot 只生成一次；
3. 写入 major Chronicle「斩杀独角苍狼」；
4. `flags.killed_one_horned_azure_wolf=true`，并保留 `beastEcology.specialIndividuals.oneHornedAzureWolf.alive=false` 作为 E03 / 后续世界逻辑的权威死亡事实；
5. `beast_ridge + greenback_wolf` baseline 永久改为 1；
6. 当前 pressure 同时压到 `min(current,1)`；
7. 后续 30 日只能恢复到 baseline=1。

R22 不把死亡事实转换成地图危险评分；R23 再读取。

---

# 十三、save / replay / 兼容

- `beastEcology` 与 `pendingBeastLoot` 都是 GameState optional；
- 旧 schema-3 save 没有这两个字段仍合法；
- 旧 active combat save 没有 R22 combat optional fields 仍合法；
- persistent JSON save/reload 保留并深拷贝 ecology / pending loot / combat nested runtime；
- loot RNG 只读 deterministic seed；
- population recovery 只读 worldDay；
- R20/R21 既有测试仍必须通过。

---

# 十四、R22 验证结果

开发分支：

```text
agent/r22-beast-loot
```

Draft PR：

```text
#11  V2 R22: implement beast combat, loot and ecology
```

CI 验证路径：

```text
npm run typecheck
npm test
npm run build
```

在 R22 核心实现与专项测试加入后，GitHub Actions 已跑通 Typecheck + Test；最终文档提交后仍需以该 PR 最新 head 的 CI 为合并门槛。

专项覆盖至少包括：

- 8 种 canonical combat definitions；
- C20 三个妖兽 anchor 数值不变；
- strong / 一阶 / 二阶妖丹来源；
- deterministic loot；
- `damaged-carcass`；
- ordinary kill / enemy flee pressure；
- 30 / 60 / 90 日恢复与新 baseline；
- pending loot 容量不足 atomic reject；
- partial claim / abandon；
- secret-realm rock lizard no double loot；
- cold-pool python seeded truth；
- unique azure wolf permanent death / Chronicle / baseline consequence；
- old state optional compatibility；
- save/reload deep clone；
- movement telegraph + bind interrupt；
- Bishui poison victory / player flee / snake flee / combat death；
- serious poison deadline no refresh；
- cold-pool armor / flee context；
- population encounter weight 0 / 0.5 / 1 / 1.5。

---

# 十五、下一步：R22-FIX 成年野外循环验收

不要直接开始堆 R23 内容。

按新的整体开发计划，先从玩家视角检查：

```text
地点
→ 情报
→ 准备
→ 探索
→ 风险
→ 妖兽遭遇
→ telegraph / 战斗 / 逃跑
→ 伤势 / poison
→ 尸体真实材料
→ 背包取舍
→ 返回 / 治疗 / 修炼
→ worldDay 推进
→ population / unique world truth 改变
```

重点不是再增加怪物，而是确认这些已完成系统能否组成一个真实可玩的“成年野外循环”。

R22-FIX 应优先发现并修：

1. 玩家是否有真实入口遇到 R22 妖兽，而不是只有 engine data；
2. 探索与 encounter 是否仍过于抽象；
3. 风险信息是否足够支持玩家做取舍，但不提前泄露 hidden truth；
4. 战斗结束后的背包 / 治疗 / 返回节奏是否顺畅；
5. 是否存在重复点击、无意义 1/3/10 日机械操作；
6. 天赋 / 出身 / 装备是否真的影响成年野外选择；
7. 是否出现系统都“完成”但彼此不发生作用的问题。

完成 R22-FIX 验收后，再进入 R23「危险判断 / 强大妖兽领地」。

---

# 十六、当前主线

```text
出生 / 童年 / 成年 ✅
→ 世界 / 知识 / 旅行 / 探索 ✅
→ 子地点 / 沉脉石室 ✅
→ 背包 / 装备 ✅
→ 修炼 / 功法 / 筑基 ✅
→ 寿元 / 延寿 / 金丹 ✅
→ C20 / R20 战斗 ✅
→ C21 / R21 伤势 / poison / 治疗 ✅
→ C22 / R22 妖兽 / 战利品 / 生态 ✅
→ R22-FIX 成年野外循环验收 ← 下一步
→ R23 危险判断 / 强大妖兽领地
→ 宗门 / NPC / 职业 / 世界事件
```
