# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R22-FIX「成年野外循环验收」已完成实现；下一轮进入 R23「危险判断 + 强大妖兽领地」。**
- R00.1～R15：统一状态、出生 / 童年 / 成年、世界 / 知识 / 旅行 / 探索、子地点、沉脉石室、背包与装备完成。
- R16～R17：修炼、功法、熟练度与改修完成。
- R18：伤势与筑基完成。
- R19：寿元、延寿、筑基后修炼、结丹与金丹完成。
- R20：唯一正式 Combat runtime、beat、装备 / 物品 / 招式 / 逃跑、伤势 / 死亡、沉脉石室正式岩甲蜥战斗完成。
- R21：poison、治疗、伤势行动门禁、worldDay 毒性恶化完成。
- R22：8 种妖兽、真实战利品、pending corpse loot、ordinary population pressure、30 日恢复、special / unique world truth 完成。
- **R22-FIX：普通野外探索已经真正接入 R22 妖兽战斗；长探索会被真实遭遇中断。**
- R23 尚未实现动态危险判断、强大妖兽领地入口与领地状态变化。

---

# 一、长期架构纪律

继续保持唯一链路：

```text
React UI
→ SessionCommand
→ resolver / GameAction
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

当前 authoritative truths：

- `worldDay`：唯一世界时间；
- inventory：R14；
- equipment：R15；
- cultivation / technique：R16～R17；
- injury：R18；
- lifespan：R19；
- combat：R20；
- poison / treatment：R21；
- beast combat / loot / ecology：R22；
- ordinary wilderness encounter：R22-FIX `wildernessEncounterEngine.ts`。

禁止后续新增：

```text
GameStateV2
BeastCombatEngineV2
第二套 inventory
第二套 world timer
第二套 encounter RNG 真源
```

---

# 二、R22-FIX 为什么必须做

R22 合并后，8 种妖兽、CombatEngine、loot 与 ecology 都已经存在，但 R11 `resolveRegionExploration()` 仍然只做：

```text
推进 worldDay
→ 增加 exploredDays
→ 发现子地点
```

普通玩家从地图上的“探索 1 / 3 / 10 天”没有任何路径进入 R22 妖兽战斗。

因此此前是：

```text
系统完成 ≠ 玩家可玩
```

R22-FIX 只修这条断链，不扩 R23。

---

# 三、R22-FIX 新增 authoritative encounter 层

新增：

```text
src/core/wildernessEncounterEngine.ts
src/core/wildernessEncounterEngine.test.ts
```

它不创建新的战斗系统，只负责：

```text
当前 wilderness
+ 玩家选择的探索时长
+ ordinary population pressure
+ deterministic seed
→ 是否发生普通妖兽遭遇
→ 遭遇发生在本次探索第几天
→ 调用现有 resolveCombatStart()
```

所有实际战斗继续进入 R20 / R22 `CombatEngine`。

---

# 四、普通野外 encounter pool

R22-FIX 只把 Content Bible 已明确属于固定区域的 **ordinary** 妖兽放入随机探索池。

## 黑风山

```text
greenback_wolf
greenback-wolf

redtail_fox
redtail-fox

ironhide_boar
ironhide-boar

rock_armored_lizard
adult-rock-lizard
```

即：青背狼、赤尾狐、铁甲猪、普通岩甲蜥。

## 灵溪谷

```text
redtail_fox
bishui_snake
```

即：赤尾狐、碧水蛇。

## 万兽岭

```text
greenback_wolf
red_maned_ape
```

即：青背狼、赤鬃山猿。

### 明确不进入 ordinary random pool

```text
cold_pool_scale_python
one_horned_azure_wolf
```

寒潭鳞蟒和独角苍狼仍是 hidden special / unique world truth。

R22-FIX 不允许玩家因为按了普通探索按钮，就在完全没有任何地点 / 线索铺垫的情况下随机撞见它们。

它们的明确领地 / 地点入口留给 R23。

---

# 五、遭遇概率与 ecology

R22-FIX 使用简单的 exploration exposure，而不是再造一套“区域危险模拟器”。

未受 ecology 压力修正前：

```text
试探 1 天  → 25%
巡探 3 天  → 50%
深入 10 天 → 80%
```

随后读取 R22 已存在的 ordinary population encounter weight：

```text
pressure 0 → ×0
pressure 1 → ×0.50
pressure 2 → ×1.00
pressure 3 → ×1.50
```

实现上使用当前区域 ordinary pool 的相对总 presence 修正 encounter chance，最终上限 95%。

注意：

- 这是 R22-FIX 的“探索期间碰见普通妖兽”节奏；
- **不是 R23 的区域危险评分**；
- 不向 UI 显示后台精确遭遇概率；
- 不改变 R22 妖兽 combat 数值。

ordinary 被杀后 pressure 下降，因此后续探索会真实更难再碰见同类；30 worldDays 恢复仍只走 R22 已接好的统一时间推进。

---

# 六、长探索现在可以被真实风险中断

玩家选择：

```text
深入 · 10 天
```

并不保证系统把 10 天一次性安全结算完。

若 seeded encounter 落在第 3 天：

```text
计划探索 10 天
→ worldDay 只推进 3 天
→ exploredDays 只增加 3 天
→ 这 3 天内满足的子地点发现照常结算
→ 第 3 天遭遇妖兽
→ 立即进入现有 CombatEngine
→ 剩余 7 天不自动继续
```

Combat log 会明确写：

> 本次探索进行到第 X 天时，前路被妖兽截断。

玩家战斗结束后回到正常世界状态，再自行决定：

- 继续探索；
- 处理战利品；
- 返回安全地点；
- 治疗；
- 修炼；
- 改变装备 / 准备。

这比“先结算十天，再附送一场战斗”更符合一世一局的风险感。

---

# 七、旧 save / replay 兼容

这是本轮的重要兼容设计。

新野外遭遇通过已有 `SET_FLAG` 显式启用：

```text
wilderness_encounters_initialized = true
```

真实玩家第一次在 R22-FIX 版本点击区域探索时，`App.persistExplore()` 会：

```text
初始化既有 sublocations / secret realm / inventory（如需要）
→ 若 encounter flag 尚未存在，走 SessionCommand + SET_FLAG 写入
→ 再执行 explore-region
```

因此：

### 旧 replay

历史 R11～R22 replay 中没有这条 flag command：

```text
explore-region
→ 保留旧“纯探索”语义
```

不会因为更新代码而改变历史 digest。

### 新 replay

新游戏 / 更新后继续玩的存档：

```text
SET_FLAG wilderness_encounters_initialized
→ explore-region
→ deterministic encounter
```

flag 本身进入 debug log，因此 replay 可以完整复现。

没有新增 schemaVersion，也没有偷偷根据“当前软件版本”改变 resolver。

---

# 八、玩家 UI 改动

`WorldMapPanel` 的三个探索按钮不再只是机械数字：

```text
试探 · 1天
巡探 · 3天
深入 · 10天
```

页面明确告诉玩家：

- 探索时间越长，更容易发现子地点；
- 也越可能在行动结束前碰上此地活动的普通妖兽；
- 遭遇会中断本次探索；
- 玩家可以在正式战斗里再决定硬拼还是撤退。

仍然只展示角色合理知道的信息：

- 当前区域客观危险；
- 以角色当前境界计算的粗略风险；
- 已发现地点 / 子地点。

不会展示：

- 精确 encounter roll；
- pressure 数字；
- 未发现的寒潭鳞蟒；
- 未发现的独角苍狼；
- hidden loot 概率。

---

# 九、战后闭环审查结果

当前 App 主流程优先级保持：

```text
pending result
→ death
→ combat
→ pendingBeastLoot
→ secret realm / world map
```

因此野外 ordinary encounter 后可以真实形成：

```text
区域探索
→ 妖兽打断
→ CombatPanel
→ 胜利 / 撤退 / 敌人逃跑 / 死亡
→ injury / bishui poison（如发生）
→ 胜利时 deterministic corpse loot
→ BeastLootPanel
→ 背包容量取舍
→ InventoryPanel 治疗 / 丢弃 / 装备
→ WorldMap 旅行 / 再探索
→ 修炼 / 休养
```

现有 R22 BeastLootPanel 已满足：

- 显示真实材料；
- 显示背包占用 / 容量；
- 领取 1 / 全部领取；
- 容量不足 atomic reject；
- 显式放弃剩余材料。

现有 InventoryPanel 已满足：

- 轻伤 / 重伤 / 经脉伤状态；
- 碧水蛇毒状态；
- 止血散 / 清毒散 / 养脉丹；
- 10 / 30 日休养；
- 装备与背包整理。

所以本轮没有再复制一个“战后菜单”。

---

# 十、R22-FIX 验收覆盖

专项测试至少覆盖：

1. 三个 wilderness 的 ordinary pool 正确；
2. cold-pool python / unique azure wolf 不进入普通随机探索；
3. 旧状态没有 enable flag 时仍保持原 R11 探索语义；
4. 1 / 3 / 10 日基础 exposure；
5. ecology pressure 会真实修改 encounter exposure；
6. 区域全部 ordinary pressure=0 时不生成普通妖兽；
7. 长探索 encounter day deterministic；
8. 遭遇发生时 worldDay 只推进到中断日；
9. exploredDays 只增加实际已经走过的时间；
10. 遭遇直接进入已有 CombatEngine；
11. encounter variant 为 ordinary；
12. encounter-bearing Session replay deterministic；
13. 旧 R11/R20/R21/R22 回归测试继续通过；
14. Typecheck / Test / Build 必须全绿才允许合并。

---

# 十一、R22-FIX 后目前真正成立的成年野外主链

```text
地点
→ 粗略风险信息
→ 选择试探 / 巡探 / 深入
→ worldDay 推进
→ 发现子地点，或被 ordinary 妖兽中断
→ telegraph / Combat / flee
→ injury / poison
→ corpse loot
→ inventory capacity 取舍
→ 返回 / 治疗 / 装备 / 修炼
→ 再次进入世界
→ ordinary ecology 随击杀与 worldDay 改变
```

这解决了此前最大的“系统都有，但互相不发生作用”问题。

---

# 十二、仍然明确没有做的内容

R22-FIX 没有实现：

- R23 动态危险判断；
- 强大妖兽明确领地；
- 寒潭鳞蟒地点发现 / 挑战入口；
- 独角苍狼领地发现 / 挑战入口；
- W02 兽群南迁；
- 多妖兽群体实时战斗；
- 狩猎专用系统；
- 采集系统；
- 商店 / 出售兽材；
- 御兽；
- NPC 猎妖任务；
- 新增第 9 种妖兽。

不要用 R23 去顺手补这些更远的系统。

---

# 十三、下一轮：R23「危险判断 + 强大妖兽领地」

路线图唯一目标：

> **“我知道这里危险，但我仍可以进去。”**

R23 应建立在已经成立的 R22-FIX 主链之上，而不是重写 exploration / combat。

重点：

1. 让“客观危险”更多读取真实 world truth / ecology / known strong presence；
2. 让“对当前角色风险”更多读取当前真实 combat capability，而不是只有境界粗分；
3. 已获得合理情报时，给强大妖兽领地自然、模糊但有用的风险提示；
4. 寒潭鳞蟒 / 独角苍狼通过明确地点 / 领地 / knowledge 入口进入玩家路径；
5. 风险提示不能泄露玩家尚不知道的 hidden truth；
6. **高风险只警告，不因数值差距无理由禁止玩家进入。**

具体施工范围以更新后的 `CURRENT_TASK.md` 为准。

---

# 十四、当前主线

```text
出生 / 童年 / 成年 ✅
→ 世界 / 知识 / 旅行 / 基础探索 ✅
→ 子地点 / 沉脉石室 ✅
→ 背包 / 装备 ✅
→ 修炼 / 功法 / 筑基 ✅
→ 寿元 / 延寿 / 金丹 ✅
→ R20 战斗 ✅
→ R21 injury / poison / 治疗 ✅
→ R22 妖兽 / 战利品 / ecology ✅
→ R22-FIX 成年野外循环 ✅
→ R23 危险判断 / 强大妖兽领地 ← 下一轮
→ R24～R26 宗门 / 身份
→ R27～R29 炼丹 / 炼器 / 御兽
→ R30～R32 NPC / 世界事件 / 结局
```
