# 当前任务：V2 R23 - 危险判断 + 强大妖兽领地

## 本轮唯一目标

完成路线图规定的核心体验：

> **我知道这里危险，但我仍可以进去。**

R22 / R22-FIX 已经让普通野外探索形成真实闭环：

```text
区域探索
→ ordinary beast encounter
→ CombatEngine
→ injury / poison
→ corpse loot
→ inventory / treatment
→ ecology change
```

R23 不再重做这条链，而是在它之上补齐：

```text
world truth
+ player knowledge
+ 当前真实战斗能力
→ 有用但不全知的危险判断
→ 强大妖兽领地线索 / 入口
→ 玩家自行决定进入或撤退
```

---

# 一、必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
   - 自由；
   - 风险与收益；
   - 未知感；
   - 单局核心循环；
   - 长行动与真死亡。
3. `V2_CONTENT_BIBLE.md`
   - 黑风山 / 灵溪谷 / 万兽岭；
   - 妖兽内容；
   - 寒潭鳞蟒；
   - 独角苍狼；
   - §37 Combat；
   - §38 poison；
   - §39 妖兽 / loot / ecology。
4. `V2_GITHUB_ROADMAP.md` 的 R23。
5. `HANDOFF.md`，特别是 R22-FIX 的 encounter / replay 兼容边界。
6. 现有重点代码：
   - `src/core/regionExplorationEngine.ts`
   - `src/core/wildernessEncounterEngine.ts`
   - `src/core/beastEngine.ts`
   - `src/core/beastEcologySelectors.ts`
   - `src/core/combatEngine.ts`
   - `src/core/locationKnowledgeEngine.ts`
   - `src/core/sublocationEngine.ts`
   - `src/data/worldLocations.ts`
   - `src/data/combat.ts`
   - `src/components/WorldMapPanel.tsx`
   - `src/types/game.ts`
   - `src/types/beast.ts`
   - 相关 R11 / R20 / R22 / R22-FIX tests。

---

# 二、最高设计原则

## 2.1 风险只负责帮助判断，不替玩家做决定

系统可以明确提示：

- 这里总体危险；
- 以你现在的状态很危险；
- 已知某种强大妖兽可能活动；
- 某条路线 / 领地风险明显更高。

但只要没有明确世界规则禁止进入，就不能因为“数值不够”直接锁死按钮。

禁止：

```text
战力不足，无法进入
等级不足，无法挑战
推荐等级 XX，未达到不可进入
```

玩家允许明知危险仍然进去送死。

## 2.2 world truth 与 knowledge 必须继续分离

隐藏事实不能因为后台存在就直接显示。

尤其禁止 UI 在玩家未发现时泄露：

```text
本世寒潭鳞蟒已生成
独角苍狼仍然存活
独角苍狼就在万兽岭某坐标
寒潭必有二阶妖丹
```

危险提示只能读取角色已经合理获得的信息。

## 2.3 不建立“综合战力 12345”

R23 可以建立内部 risk comparison / capability selector，但不要把角色与敌人压成手游式战力数字展示。

玩家看到的应是自然语言风险层级，例如：

```text
大致可控
需要谨慎
明显危险
极可能送命
```

后台可以读取真实 Combat stats、伤势、poison、装备、身法等，但 UI 不显示一个虚假的总战力值。

---

# 三、区域危险与角色风险

当前 R11 `getCurrentRegionRisk()` 主要使用：

```text
固定 WorldDanger
- 角色境界粗分
```

R23 应在不破坏旧 world definition 的前提下，把判断升级为更接近真实当前状态。

至少考虑：

- 当前境界 / 阶段；
- R20 玩家 Combat HP / Qi / baseAttack 基线；
- severe / meridian injury；
- serious poison；
- 已装备武器 / 护甲 / 支援法器；
- 已启用身法 / 相关真实 combat hook；
- 当前区域 ordinary ecology pressure；
- **已经被玩家知道的**强大妖兽 presence / territory information。

注意：

- 不重新发明装备数值；
- 不调整 R20 / R22 combat balance；
- risk selector 只读现有 authoritative truth。

---

# 四、信息层级

危险信息必须区分：

## 4.1 客观区域危险

描述区域整体环境，例如：

```text
安全
较低
一般
较高
危险
```

可在 R23 读取已知 ecology / 已知 strong territory 后进行有限动态修正，但不要把所有细节塞进一个等级。

## 4.2 角色自身判断

表达：

> “以我现在的状态，进去大概是什么感觉？”

应该受到伤势 / poison / 当前装备等实时影响。

例如同一个角色：

```text
健康 + 完整装备 → 需要谨慎
重伤 → 明显危险
严重中毒 → 极可能送命
```

## 4.3 已知威胁

只有角色确实得到线索后，才显示类似：

```text
近期有人在深处发现大型蛇类活动痕迹。
这里存在明显强于外围妖兽的领地痕迹。
猎户确认某一带狼群会主动避让一个更强个体。
```

不直接把后台 instance id / HP / loot table 暴露给玩家。

---

# 五、强大妖兽领地

R23 首版只处理已经存在的两类 special / unique：

```text
cold_pool_scale_python
one_horned_azure_wolf
```

不新增第 9 种妖兽。

## 5.1 寒潭鳞蟒

R22 已有 world truth：

```text
generated
instanceId
alive
lootClaimed
lairCleared
```

R23 负责建立玩家侧的：

```text
线索 / knowledge
→ 寒潭类地点或领地入口
→ 危险提示
→ 玩家确认进入
→ START_COMBAT cold_pool_scale_python + cold-pool context
```

若本世没有生成鳞蟒：

- 不得伪造一只；
- 地点可以存在，但对应强敌内容必须按 world truth 处理；
- UI 不能提前告诉玩家“本世没生成”。

死亡后 `lairCleared` 与现有 world truth 必须继续生效。

## 5.2 独角苍狼

R22 已有唯一 world truth：

```text
uniqueId
instanceId
alive
lootClaimed
```

R23 负责建立合理的发现链：

```text
狼群 / 足迹 / 传闻 / 兽巢等已知信息
→ 确认存在强大个体领地
→ 风险提示
→ 玩家主动进入
→ START_COMBAT one-horned-azure-wolf
```

独角苍狼死亡后：

- 不刷新；
- 已有 R22 baseline 2→1 后果继续保持；
- 领地 UI / 描述必须能读取死亡事实并变化；
- 不在 R23 额外实现完整世界事件链。

---

# 六、与 R22-FIX encounter 的边界

普通探索继续只随机遇到 ordinary pool：

```text
黑风山：青背狼 / 赤尾狐 / 铁甲猪 / 普通岩甲蜥
灵溪谷：赤尾狐 / 碧水蛇
万兽岭：青背狼 / 赤鬃山猿
```

R23 禁止把寒潭鳞蟒 / 独角苍狼直接塞回 ordinary random pool。

强大个体必须通过：

```text
knowledge / territory / explicit entry
```

进入玩家路径。

这样才能让：

> “我知道那边可能有东西，而且很危险，我还是决定进去。”

成为真实选择，而不是随机抽中 Boss。

---

# 七、UI 最小要求

`WorldMapPanel` / 对应 territory UI 至少需要让玩家看懂：

1. 区域客观危险；
2. 以当前角色状态判断的风险；
3. 当前已知的主要威胁 / 线索；
4. 进入强大妖兽领地的动作；
5. 进入前的自然语言风险警告；
6. 玩家仍然可以确认进入。

不要显示：

- 精确 Boss HP；
- 精确攻击力；
- 精确 loot chance；
- hidden generated/alive flag；
- SSR / 推荐战力 / 红色战力差数字。

---

# 八、必须回归

至少覆盖：

1. R22-FIX ordinary exploration encounter 不退化；
2. 1 / 3 / 10 日探索仍可被普通 encounter 中断；
3. old replay compatibility 不退化；
4. risk judgement 对伤势 / poison / equipment 的变化有真实响应；
5. 高风险不会无理由 hard block；
6. unknown strong beast truth 不泄露；
7. discovered territory 才显示可进入入口；
8. cold-pool python absent world truth 不会凭空开战；
9. cold-pool combat 正确带 `cold-pool` context；
10. unique wolf 死亡后不可再次开战；
11. unique wolf death 后领地状态可变化；
12. sunken-vein-core 兼容不退化；
13. save / reload / replay deterministic；
14. Typecheck / Test / Build 全绿。

---

# 九、本轮禁止

- 不实现 R24 宗门；
- 不做 NPC 全量系统；
- 不做 W02 兽群南迁；
- 不新增妖兽；
- 不做多怪实时队伍战；
- 不做完整狩猎系统；
- 不做完整采集系统；
- 不做商店 / 出售；
- 不做御兽；
- 不改 R20 / R22 Combat 数值；
- 不改 R21 poison 数值；
- 不建立综合战力面板；
- 不让 UI 泄露 hidden special / unique world truth。

---

# 十、验收标准

R23 完成必须满足：

```text
玩家看到有意义的危险信息
→ 知道某个已发现领地非常危险
→ 系统不替玩家做决定
→ 玩家仍可主动进入
→ 进入后复用现有正式 CombatEngine
→ 胜负 / 伤毒 / loot / world truth 全沿用现有链
```

并且：

```text
npm run typecheck
npm test
npm run build
```

全部通过。

完成后更新 `HANDOFF.md`，立即停止，不在同轮开始 R24。
