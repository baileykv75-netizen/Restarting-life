# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- **R23「危险判断 + 强大妖兽领地」实现已完成，等待最终 head CI 作为合并门槛。**
- R00.1～R15：统一状态、出生 / 童年 / 成年、世界 / 知识 / 旅行 / 探索、子地点、沉脉石室、背包与装备完成。
- R16～R17：修炼、功法、熟练度与改修完成。
- R18：伤势与筑基完成。
- R19：寿元、延寿、筑基后修炼、结丹与金丹完成。
- R20：唯一正式 Combat runtime、beat、装备 / 物品 / 招式 / 逃跑、伤势 / 死亡完成。
- R21：poison、治疗、伤势行动门禁、worldDay 毒性恶化完成。
- R22：8 种妖兽、真实战利品、pending corpse loot、ordinary population pressure、30 日恢复、special / unique world truth 完成。
- R22-FIX：普通野外探索已接入 R22 妖兽战斗；1 / 3 / 10 日探索会被真实 ordinary encounter 中断。
- **R23：区域风险改为读取真实当前状态；寒潭鳞蟒 / 独角苍狼改为通过已知线索与明确领地入口进入正式 CombatEngine。**
- R24 尚未实现。

---

# 一、长期架构纪律

继续保持：

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
- ordinary wilderness encounter：R22-FIX；
- **risk assessment：R23 `riskAssessmentEngine.ts`，只读现有真源，不保存第二份“战力”；**
- **strong territory：R23 `strongBeastTerritoryEngine.ts`，发现状态由已有 knowledge + exploredDays 派生。**

禁止后续新增：

```text
GameStateV2
BeastCombatEngineV2
第二套 inventory
第二套 world timer
第二套 encounter RNG
第二份 territory knowledge state
手游式综合战力值
```

---

# 二、R22-FIX 已成立的成年野外主链

```text
地点
→ 选择试探 / 巡探 / 深入
→ worldDay 推进
→ 子地点发现或 ordinary 妖兽中断
→ CombatEngine
→ injury / poison
→ corpse loot
→ inventory capacity 取舍
→ 治疗 / 装备 / 修炼 / 返回
→ ecology 随击杀和 worldDay 改变
```

ordinary random pool 仍固定：

```text
黑风山：青背狼 / 赤尾狐 / 铁甲猪 / 普通岩甲蜥
灵溪谷：赤尾狐 / 碧水蛇
万兽岭：青背狼 / 赤鬃山猿
```

R23 **没有**把以下强个体塞进 ordinary pool：

```text
cold_pool_scale_python
one_horned_azure_wolf
```

---

# 三、R23 风险判断

新增：

```text
src/core/riskAssessmentEngine.ts
src/core/riskAssessmentEngine.test.ts
```

UI 不显示一个虚假的“战力 12345”。

对区域与已知强敌只输出四档自然语言：

```text
大致可控
需要谨慎
明显危险
极可能送命
```

后台只读取现有 authoritative 数据：

- `getPlayerCombatStats()` 的 R20 境界 / 阶段 Combat 基线；
- 已装备主武器及 `WEAPON_COMBAT`；
- 已装备护甲及 `ARMOR_COMBAT`；
- 护心镜；
- 流云靴；
- 已启用身法；
- `light_foot` 的真实逃跑倾向；
- severe / meridian injury；
- serious poison；
- R22 ordinary population pressure；
- **只有玩家已经确认的**强大妖兽领地信息。

它不修改任何 R20 / R21 / R22 Combat 数值。

### 已兑现的天赋

- `danger_sense`：高风险时增加更明确的自然语言警告，**不暗加战力**；
- `observant`：更早确认寒潭 / 强兽痕迹；
- `beast_handler`：更早从万兽岭狼群行为中确认异常强个体领地；
- `light_foot`：风险判断会识别它已有的撤离优势。

---

# 四、R23 强大妖兽领地

新增：

```text
src/types/territory.ts
src/core/strongBeastTerritoryEngine.ts
src/core/strongBeastTerritoryEngine.test.ts
```

没有新增第 9 种妖兽，也没有新增第二份 territory 存档。

领地是否已经被角色确认，由：

```text
location knowledge
+ exploredDays
+ relevant talent
```

派生。

## 4.1 灵溪谷深处寒潭

普通角色：

```text
灵溪谷累计探索 >= 15 日
→ 能确认寒潭这处高风险地点
```

`observant`：

```text
累计探索 >= 5 日
→ 可更早从异常水道 / 鳞痕确认地点
```

### 本世鳞蟒真实存在且存活

玩家只会在领地已确认后看到角色能实际观察到的：

- 新鲜大型拖痕；
- 被压倒的水草；
- 水下沉重暗影；
- “明显强于外围普通妖兽”的判断。

玩家主动进入：

```text
ENTER_BEAST_TERRITORY lingxi_cold_pool
→ resolveStrongBeastTerritoryEntry()
→ existing resolveCombatStart()
→ cold-pool-scale-python
→ variant = special
→ contextTags = ['cold-pool']
```

因此继续复用 R22 已有寒潭强化：

```text
damage ×1.10
armorReduction +5pp
player fleeChance -10pp
```

### 本世鳞蟒没有生成

系统不会伪造一只。

领地发现前 UI 不说“本世没有鳞蟒”；发现寒潭后也只显示“无法确认水下现在有什么”。

玩家实际进入检查后：

```text
cold_pool_checked_empty = true
```

此时才把角色已经亲自确认的结果展示为：

> 没有发现仍在活动的大型妖兽。

这一事实经过 PersistentGame save / reload 专项测试，刷新后不会丢失。

### 鳞蟒死亡

继续读取 R22：

```text
alive = false
lairCleared = true
```

领地 UI 转为 cleared，不再重复开战。

---

# 五、独角苍狼领地

普通角色：

```text
万兽岭累计探索 >= 15 日
→ 确认狼群主动避让的一段山脊
```

`observant` 或 `beast_handler`：

```text
累计探索 >= 5 日
→ 更早读懂大型爪痕 / 气味标记 / 狼群避让
```

玩家知道的是：

> 有一个明显强于普通炼气妖兽的独占个体在这里活动。

不会展示后台 instance id、HP、attack 或 loot table。

主动进入：

```text
ENTER_BEAST_TERRITORY azure_wolf_range
→ existing resolveCombatStart()
→ one-horned-azure-wolf
→ variant = unique
```

即使角色弱到极可能送命，只要世界规则允许，按钮仍可执行。

独角苍狼死亡后继续读取 R22 world truth：

```text
alive = false
万兽岭 greenback_wolf baseline = 1
```

R23 的领地描述随之变成：

- 原先的强大个体已经死亡；
- 青背狼重新向原领地活动；
- 不再出现第二次 unique fight。

---

# 六、WorldMap UI

`WorldMapPanel` 现在同时区分：

1. **客观区域危险**：地点静态世界定义；
2. **以当前状态判断**：境界、装备、伤毒、身法、生态和已知威胁综合后的四档判断；
3. **判断依据**：只展示角色自身和已经确认的信息；
4. **已确认高风险地点**：寒潭 / 苍狼领地；
5. **主动进入按钮**：明确提示高风险不会成为系统硬门禁。

禁止泄露内容保持：

- 未发现的 strong territory；
- cold python generated / absent hidden flag；
- unique instance id；
- Boss 精确 HP / attack；
- loot chance；
- 后台 encounter roll。

---

# 七、统一 Action / replay

新增唯一玩家动作：

```ts
{ type: 'ENTER_BEAST_TERRITORY'; territoryId }
```

链路仍是：

```text
WorldMapPanel
→ App.persistEnterTerritory()
→ commandAndSave()
→ SessionCommand { type: 'game-action' }
→ GameAction ENTER_BEAST_TERRITORY
→ strongBeastTerritoryEngine
→ existing CombatEngine / world truth
```

没有 UI 直接改核心状态。

显式领地进入已经覆盖 Session replay deterministic 测试。

---

# 八、R23 回归 / 验收覆盖

专项测试覆盖：

1. 旧境界风险 anchor 不退化；
2. 武器 / 护甲 / 护身法器 / 辅助法器 / 身法能改变风险判断；
3. severe / meridian injury 与 serious poison 会提高风险；
4. ordinary ecology pressure 会影响区域判断；
5. unknown strong world truth 不在 UI selector 泄露；
6. `observant` / `beast_handler` 更早识别对应领地；
7. `danger_sense` 只增加警告，不暗改风险数值；
8. cold python absent 不会凭空生成战斗；
9. 实际检查空寒潭后结果可 save / reload；
10. cold python live 正确带 `cold-pool` context；
11. 极弱角色仍可主动进入高危领地；
12. unique wolf dead 后不可再次开战；
13. unique wolf dead 后领地状态改变；
14. territory entry 走现有 Session / replay；
15. R22-FIX ordinary encounter、R20/R21/R22、sunken-vein-core 既有回归继续由全量测试覆盖。

PR #13 第一轮实现 CI #299 已通过 Typecheck + Test + Build；新增 save/reload 与最终文档收口后，**必须以 PR 最新 head 的最终 CI 为合并门槛。**

---

# 九、R23 明确没有做

- R24 宗门加入 / 身份；
- R25 贡献 / 宗门任务；
- R26 拜师 / 违规 / 叛宗；
- W02 兽群南迁；
- 新妖兽；
- 多怪队伍战；
- 完整狩猎；
- 完整采集；
- 商店 / 出售；
- 御兽；
- Combat 数值重平衡；
- 第二份 territory state。

---

# 十、下一轮：R24 宗门加入与身份

路线图唯一目标：

> **实现最小宗门路线。**

只进入：

```text
正常入门 / 少量特殊入门
→ 杂役 / 外门 / 内门 / 真传身份
→ 身份写入唯一 GameState
→ 不同身份对应不同访问权限
```

R24 禁止提前做：

- R25 宗门贡献与任务闭环；
- R26 拜师 / 违规 / 叛宗；
- 多宗门；
- 宗门派系政治。

当前主线：

```text
出生 / 童年 / 成年 ✅
→ 世界 / 旅行 / 探索 ✅
→ 背包 / 装备 ✅
→ 修炼 / 筑基 / 金丹 ✅
→ Combat / injury / poison ✅
→ 妖兽 / 战利品 / ecology ✅
→ ordinary wilderness encounter ✅
→ 风险判断 / 强兽领地 ✅ R23
→ 宗门加入与身份 ← R24 下一轮
→ 宗门贡献 / 任务
→ 拜师 / 违规 / 叛宗
→ 炼丹 / 炼器 / 御兽
→ NPC / 世界事件
→ 《此世传》/ 重开
```
