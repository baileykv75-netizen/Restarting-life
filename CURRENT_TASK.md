# 当前任务：V2 R22 - 妖兽与战利品

## 本轮唯一目标

C22 已经把首版 8 种妖兽的正式 Combat data、真实战利品、poison 接口、ordinary population pressure、寒潭鳞蟒 special death 与独角苍狼 unique death 冻结到 `V2_CONTENT_BIBLE.md` 第 39 节。

本轮只把这些规则接入现有 V2 authoritative state：

```text
§39 8种妖兽定义
→ 现有 CombatEngine
→ special / telegraph / escape AI
→ 碧水蛇 poison exposure
→ deterministic real loot
→ 正式 inventory claim
→ ordinary population pressure
→ 30日恢复
→ 寒潭鳞蟒 special alive/dead
→ 独角苍狼 unique alive/dead + once loot
→ save / replay / UI
```

**本轮不实现 R23 的区域危险动态评分、强大妖兽领地、W02 兽群南迁，也不扩御兽 / 商店 / 猎妖任务。**

完成后更新 `HANDOFF.md`，Typecheck / Test / Build 全绿后立即停止。

---

# 一、必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`：战斗、妖兽、真实战利品、世界变化、真死亡原则
3. `V2_CONTENT_BIBLE.md`：
   - 第 13 节妖兽材料原则；
   - 第 18 节 8 种妖兽；
   - 第 23 节御兽边界；
   - 第 27 / 28 节兽群南迁、独角苍狼；
   - 第 37 节 Combat 执行数值；
   - 第 38 节 poison / injury / treatment；
   - **第 39 节 C22 妖兽 / 战利品 / 生态执行规则（唯一数值真源）。**
4. `HANDOFF.md`
5. `V2_GITHUB_ROADMAP.md` 的 R22 / R23
6. 现有实现重点：
   - `src/types/combat.ts`
   - `src/data/combat.ts`
   - `src/core/combatEngine.ts`
   - `src/core/poisonEngine.ts`
   - `src/core/inventoryEngine.ts`
   - `src/core/persistentGameEngine.ts`
   - `src/core/worldEngine.ts`
   - `src/core/secretRealmEngine.ts`
   - `src/types/game.ts`
   - `src/types/gameAction.ts`
   - `src/types/command.ts`
   - `src/store/saveRepository.ts`
   - `src/components/CombatPanel.tsx`
   - R13 / R14 / R20 / R21 tests。

如果与现有架构冲突，只做最小兼容扩展，不借 R22 重构全项目。

---

# 二、最高架构原则

## 2.1 不建立第二套妖兽战斗引擎

正式 8 种妖兽必须扩展：

```text
existing combat definitions
+ existing CombatEngine
```

禁止：

- `BeastCombatEngineV2`；
- 另一套 HP / Qi / beat；
- 妖兽专用独立实时循环；
- 另一个 battle RNG 真源。

C20 / R20 已有青背狼、成年岩甲蜥、赤鬃山猿数值必须回归保持。

## 2.2 Inventory 继续是唯一物品所有权真源

妖兽战利品只能进入 R14 inventory。

禁止：

- `beastBag`；
- `lootInventory` 作为第二所有权；
- 战斗胜利直接给一个无法追踪的数字奖励；
- 妖兽掉灵石。

## 2.3 worldDay 继续只有一个

ordinary population 30 日恢复必须通过现有世界时间推进结算。

禁止：

- React timer；
- 现实分钟；
- combat beat 当天数；
- 打开页面自动随机刷新妖兽。

## 2.4 world truth 与玩家 knowledge 分离

寒潭鳞蟒 / 独角苍狼的 alive / generated 属于 world truth。

玩家没发现时 UI 不得显示：

- “本世独角苍狼仍存活”；
- 隐藏寒潭鳞蟒；
- 未知巢穴坐标；
- 隐藏战利品价值。

---

# 三、8 种正式妖兽

严格读取 Content Bible §39.2：

```text
greenback_wolf
redtail_fox
ironhide_boar
bishui_snake
rock_armored_lizard
red_maned_ape
cold_pool_scale_python
one_horned_azure_wolf
```

每个 definition 至少承载：

- realm / stage band；
- maxHP / maxQi / baseAttack；
- armorReduction；
- basicInterval；
- basic move multiplier；
- special action；
- telegraph；
- cooldown；
- lowHP behavior；
- flee / pursuit hook；
- optional context hook。

不得调整 §39 精确数值来“顺手平衡”。

---

# 四、enemy AI 最小实现

继续沿用 R20 简单可读行为，不做行为树平台。

每拍只需：

```text
已有 telegraph 到期 → 执行特殊动作
否则若满足低血量一次性行为 → 触发撤退 / 狂暴 / 急遁
否则若特殊动作 ready 且满足最小条件 → 生成 telegraph
否则 → basic attack
```

所有概率：

- 青背狼 65% 撤退；
- 赤尾狐 85% 急遁；
- 碧水蛇 40% 撤退；
- 普通岩甲蜥 35% 撤退；
- 其他 §39 概率；

必须使用 combat seeded RNG。

### 敌人成功逃跑

敌人成功脱离时：

- 玩家不获得尸体战利品；
- 不降低 ordinary population pressure；
- 碧水蛇若此前毒袭已产生 exposure，仍必须在 CombatState 清除前结算 poison；
- 战斗正常结束，不算玩家击杀。

---

# 五、碧水蛇 poison 接口

严格按 §39.4：

普通咬击：**不施毒**。

只有“毒袭”最终实际伤害 > 0：

```text
pendingPoisonExposures.bishui_venom += 1
```

Combat beat 内不做 poison DOT。

玩家以存活方式结束战斗时，在清除 CombatState 前按 exposure 次数依次调用 R21 authoritative poison resolver。

必须覆盖：

```text
victory
player flee success
bishui snake escape success
```

Combat HP=0 已死亡时不再写长期 poison。

同 family serious 状态不能因新 exposure 延长死亡期限。

---

# 六、寒潭鳞蟒地形

`cold_pool_scale_python` 基础定义按离潭状态。

只有 combat source / context 明确包含 `cold-pool` 时：

```text
damage ×1.10
armorReduction +5pp
player fleeChance -10pp
```

不做格子水域、游泳、实时距离。

如果未来事件已成功把鳞蟒引离寒潭，combat context 不带该 tag，即自然失去强化。

---

# 七、真实战利品

严格使用 §39.6 canonical ids / 数量。

R22 应建立静态 beast loot definition + pure seeded resolver，例如等价：

```ts
resolveBeastLoot(beastId, variant, rngState, context)
→ { items, nextRngState }
```

要求：

1. 同一输入确定性一致；
2. 不使用 `Math.random()`；
3. 不掉灵石；
4. 不掉装备；
5. strong / 二阶条件必须来自真实 encounter variant，不可结算时临时随机把普通怪升级；
6. `damaged-carcass` 只有明确 source/context 才读取；普通 Combat 不产生。

### 二阶结丹资源

`complete_second_tier_beast_core` + `high_grade_beast_essence` 稳定来源只允许：

- 寒潭鳞蟒；
- 独角苍狼。

赤鬃山猿强个体只能出 `mature_first_tier_beast_core`，绝不能被 C19 邪道结丹当二阶妖丹使用。

---

# 八、战利品领取与背包满

战斗胜利已经发生后，**背包容量不足绝不能回滚战斗或让妖兽复活。**

建立一个最小 optional pending loot 状态，名称可按代码风格，例如：

```ts
state.pendingBeastLoot?: {
  lootId: string
  sourceBattleId: string
  beastId: string
  remaining: Record<ItemId, number>
}
```

语义：

- 胜利后 seeded loot 只生成一次；
- pending loot 不是“第二背包所有权”，只是地面 / 尸体上尚未拿走的物品；
- 玩家可以按 item / quantity 领取；
- `addItem()` / inventory capacity 继续唯一检查；
- 拿不下时拒绝该次领取，不改变 remaining；
- 可以明确“放弃剩余战利品”，随后清除 pending；
- 同一 lootId 不可重复生成 / 重领；
- pending 未处理时禁止启动另一场会覆盖 loot 的战斗，或必须先明确放弃；不得静默覆盖。

UI 至少显示：

- 妖兽名称；
- 每种 remaining；
- 背包占用 / 容量；
- 领取；
- 放弃剩余。

不做复杂尸体剥取小游戏。

---

# 九、沉脉石室岩甲蜥不得双重掉落

这是 R22 必须专门回归的兼容点。

当前沉脉石室已有 R13 / R14 奖励链，并且历史 replay 已存在。

因此 R22 最小方案固定为：

> **当 Combat source = `sunken-vein-core` 时，不生成 generic beast corpse loot；继续由现有 secret-realm reward / claim 路径作为该核心岩甲蜥本世唯一身体材料来源。**

普通世界中的 `rock_armored_lizard` 才使用 §39.6 generic loot。

禁止：

```text
secret realm existing reward
+ generic rock lizard loot
= 双份背甲 / 结晶
```

不要为了统一 loot 在 R22 反向重写 R13 历史 replay。

---

# 十、ordinary population pressure

建议 optional：

```ts
state.beastEcology?: {
  populations: Record<regionSpeciesKey, {
    pressure: 0|1|2|3
    baseline: 0|1|2|3
    lastRecoveryCheckDay: number
  }>
  specialIndividuals: ...
}
```

字段形式可调整，但必须保持：

- 旧存档没有 `beastEcology` 合法；
- 不在 `createInitialGameState()` 强塞与玩家无关的大空对象；
- 第一次真实需要时 deterministic materialize；
- baseline 初始 2；
- pressure 初始 2。

### 玩家击杀 ordinary

只有真正 victory + kill：

```text
pressure = max(0, pressure -1)
```

敌人逃走、玩家逃跑都不降低。

### 30 worldDays 恢复

每跨过一个 30 日聚合 milestone：

```text
pressure < baseline → +1
pressure == baseline → unchanged
pressure > baseline → unchanged
```

一次长行动跨过多个 30 日必须按跨过的 milestone 次数恢复，但不能超过 baseline。

该时间结算必须与 R21 poison milestone / lifespan 现有统一时间推进兼容，不另建 timer。

---

# 十一、寒潭鳞蟒 special individual

必须支持：

```text
seeded generated or absent
stable instance id
alive
lootClaimed / pending loot identity
```

规则：

- 非每世生成；
- 生成后死亡不刷新；
- 对应寒潭 `lair-cleared`；
- loot 只生成一次；
- R22 不因此直接重算整个灵溪谷危险度。

玩家未发现时 UI 不泄露。

---

# 十二、独角苍狼 unique individual

首版每世 world truth 存在 1 只：

```text
uniqueId = one_horned_azure_wolf
alive
lootClaimed / pending loot identity
```

knowledge / discovery 必须独立。

死亡后原子结算：

1. `alive=false`；
2. unique loot 只生成一次；
3. Chronicle / 《此世传》写入资格；
4. E03 可读取死亡事实；
5. 万兽岭青背狼 baseline 2→1；
6. 当前青背狼 pressure = min(current,1)。

后续 30 日只能恢复到新 baseline=1。

R22 不把该事实进一步换算成 UI 区域危险评分；那是 R23。

NPC / 世界事件未来如果杀死它，也必须走同一 world truth death resolver，但 R22 不提前实现那些事件。

---

# 十三、save / replay

必须确保：

- beastEcology optional 深拷贝；
- pendingBeastLoot optional 深拷贝；
- special / unique alive/dead 不丢；
- combat special cooldown / telegraph 状态可保存；
- poison exposure 若 CombatState 需要保存则可 replay；
- loot RNG 确定；
- population recovery 确定；
- 同一 state + commands 得到同一 digest；
- 旧 R05～R21 save / replay 不要求补新字段。

---

# 十四、UI 最小要求

CombatPanel：

- 显示真实妖兽名；
- telegraph 文案自然；
- 狂暴 / 束缚 / 迟缓 / 护身等复用现有状态展示；
- 碧水蛇毒袭不显示后台 exposure 数字；只在真正战后中毒后进入 R21 Poison UI；
- 敌人成功逃走要有明确结果。

Loot UI：

- 显示真实材料名与数量；
- 背包满明确提示；
- 允许领取 / 放弃；
- 不显示“稀有度 SSR”“掉率 10%”等后台概率。

Ecology：

R22 不需要给玩家显示 `populationPressure=1` 这种后台数字。只需要状态真实存在，R23 再转为危险 / 稀疏度语言。

---

# 十五、必须测试

至少覆盖：

1. 8 种 beast definition 全部存在且 §39 精确；
2. C20 青背狼 / 岩甲蜥 / 赤鬃山猿核心值无回归；
3. 特殊动作提前 telegraph；
4. cooldown 语义正确；
5. movement-required 可被束缚打断；
6. 赤尾狐急遁一次性；
7. enemy flee 使用 combat seeded RNG；
8. enemy flee 不掉 loot、不减 pressure；
9. 碧水蛇普通咬击不 poison；
10. 毒袭真实伤害才记录 exposure；
11. victory / player flee / snake flee 都结算 exposure；
12. Combat death 不重复 poison；
13. serious poison 不被 exposure 延长 deadline；
14. 寒潭 context 精确加成 / 离潭无加成；
15. loot deterministic；
16. 所有妖兽 loot 无 spirit stone；
17. 各 canonical material / 数量边界；
18. 普通怪绝不掉二阶妖丹；
19. red ape strong 最多一阶成熟妖丹；
20. python / azure wolf 二阶核心与高品质精血正确；
21. pending loot 只生成一次；
22. 背包满不回滚 victory；
23. claim 容量不足 atomic reject；
24. 放弃 remaining 后不能重领；
25. sunken-vein-core 不生成 generic lizard loot；
26. ordinary kill pressure -1；
27. flee 不减 pressure；
28. 30d 恢复到 baseline，不超；
29. 长时间跨多个 30d milestone 正确；
30. 独角苍狼死亡 baseline 2→1 + current cap1；
31. unique 死亡不刷新、loot once；
32. 寒潭鳞蟒 absent / generated deterministic；
33. python death no respawn；
34. old saves no beastEcology legal；
35. save / reload deep clone；
36. Session / digest / replay deterministic；
37. R22 没有提前改区域危险评分；
38. 现有全部测试不退化。

---

# 十六、本轮禁止

- 不实现 R23；
- 不修改区域危险算法；
- 不实现 W02 兽群南迁；
- 不新增第 9 种妖兽；
- 不做多妖兽队伍实时战；
- 不做元素抗性大表；
- 不做御兽；
- 不做猎妖任务系统；
- 不做商店 / 拍卖；
- 不做怪物图鉴收集系统；
- 不做尸体剥皮小游戏；
- 不做随机装备掉落；
- 不给妖兽掉灵石；
- 不重构 CombatEngine；
- 不改 C21 poison 数值；
- 不改 C20 玩家战斗数值；
- 不重写 R13 历史 replay。

---

# 十七、验收标准

R22 完成必须满足：

1. 8 种妖兽全部使用正式 CombatEngine；
2. §39 数值 / special / flee 全部可执行；
3. 碧水蛇正式接入 R21 poison；
4. 妖兽尸体产生真实 deterministic loot；
5. 背包满不会回滚胜利；
6. 沉脉石室不双掉落；
7. ordinary pressure / 30 日恢复可执行；
8. 寒潭鳞蟒 special death 永久；
9. 独角苍狼 unique death / once loot / wolf baseline 后果永久；
10. world truth 与 knowledge 分离；
11. save / replay 全通过；
12. 旧存档 / 旧 replay 合法；
13. Typecheck / Test / Build 全通过；
14. 更新 `HANDOFF.md`；
15. **立即停止，不在 R22 同轮开始 R23。**
