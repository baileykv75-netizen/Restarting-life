# 当前任务：V2 R18 - 炼气 → 筑基突破系统

## 本轮唯一目标

在 C16 已冻结的筑基内容、R16 基础修炼和 R17 功法系统之上，实现首版真正可玩的**炼气九层 → 筑基**闭环：

```text
炼气九层 100%
→ 查看当前筑基成功率与主要修正
→ 选择是否使用破障丹 / 凝基丹
→ 选择 0 / 30 / 60 灵石投入
→ 确认 14 日正式冲关
→ 消耗已选资源
→ 推进唯一 worldDay
→ seeded 成功 / 轻度失败 / 严重失败 / 极端失败
→ 成功进入筑基前期，或真实受伤 / 修为倒退 / 死亡
```

本轮同时补齐突破已经真实依赖的**最小 authoritative injury runtime**，让经脉伤 / 重伤进入唯一 `GameState`，并把它接回 R16 基础修炼。

本轮只做**炼气 → 筑基**。

**不实现筑基期继续修炼、不实现筑基后功法获取、不实现 R19 结丹、不补延寿物、不做完整治疗 / 医疗系统、不做战斗。**

---

# 一、必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md` 的突破、失败、寿元、透明度与真死亡规则
3. `V2_CONTENT_BIBLE.md` 第 7、15、16、35 节，尤其 35.5「炼气 → 筑基」
4. `HANDOFF.md` 的 C16、R16、R17 与仍待补缺口
5. `V2_GITHUB_ROADMAP.md` 的 R18 / R19
6. `src/core/cultivationEngine.ts`
7. `src/core/techniqueEngine.ts`
8. `src/data/techniques.ts`
9. `src/data/items.ts`
10. `src/core/inventoryEngine.ts`
11. `src/core/lifespanEngine.ts`
12. `src/core/sessionEngine.ts`

旧 `breakthroughEngine.ts` 属于 legacy 兼容边界。R18 不得把新 V2 筑基逻辑塞回 legacy 四按钮突破。

---

# 二、内容真源：C16 已冻结，不重新设计

R18 必须直接使用 C16 已冻结事实：

## 前置

最低条件：

1. 炼气九层；
2. `resources.cultivation === 1000`；
3. 已有一门能完成炼气阶段运转的当前主修；
4. 当前没有重伤或未恢复的严重经脉伤；
5. 当前地点可以维持连续 14 日冲关。

轻伤、普通环境、没有丹药、没有灵石准备**不能硬锁按钮**，只成为负面或缺失修正。

## 可选准备

只使用已冻结内容：

- 破障丹；
- 凝基丹（二阶下品）；
- 30 / 60 下品灵石；
- 当前主修与灵根契合；
- 主修熟练度；
- 静心守一；
- 当前地点环境；
- 真实已有的筑基及以上指点事实；
- 当前伤势 / 经脉状态。

破障丹与凝基丹每次突破各最多使用 1 份；多颗不叠加。

## 时间

正式筑基固定：

```text
14 日
```

不拆成“调息 3 日 + 摆阵 2 日 + 吞丹 1 日”等碎步骤。

## 失败尺度

必须保持 C16 范围：

- 轻度失败：炼气九层进度回到 70%～85%，短期气机紊乱 / 轻伤；
- 严重失败：回到 40%～60%，明确经脉伤，通常恢复 30～60 日；
- 极端失败：存活者回到 20%～40%，重伤 + 严重经脉破裂；极端失败内部约 50% 直接死亡。

所有本次已主动投入并实际使用的丹药 / 灵石，在成功或失败后都消耗。

---

# 三、R18 必须建立最小正式伤势 runtime

截至 R17，仓库没有 authoritative injury runtime。R18 不允许继续使用 `flags.meridian_injury = true` 之类临时第二套伤势语义。

## 1. 状态结构

允许新增：

```ts
state.injuries?: InjuryState
```

建议最小结构：

```ts
type InjuryKind = 'light' | 'severe' | 'meridian'

interface InjuryCondition {
  id: string
  kind: InjuryKind
  sourceId: string
  startedDay: number
  recoveryDay: number
}

interface InjuryState {
  conditions: InjuryCondition[]
}
```

要求：

- `injuries` optional，旧 R05～R17 状态不被被动写空对象；
- 只在真实受伤时 materialize；
- active condition 由 `recoveryDay > worldDay` 派生；
- 不同时保存 `active: true` 与 `recoveryDay` 两份真源；
- save / reload 深拷贝；
- 未来战斗 / 医疗继续复用这套状态，不另起 InjuryStateV2。

## 2. R18 失败对应伤势

首版固定：

### 轻度失败

```text
修为 = 780 / 1000
新增 light injury
自然恢复尺度 = 10 日
```

### 严重失败

```text
修为 = 500 / 1000
新增 severe injury + meridian injury
自然恢复尺度 = 45 日
```

### 极端失败但存活

```text
修为 = 300 / 1000
新增 severe injury + meridian injury
自然恢复尺度 = 90 日
```

这些固定点都落在 C16 已冻结区间内，避免为了失败再抽“修为退 73% / 51%”这种没有玩法价值的小随机数。

## 3. 伤势与再次突破

- active `severe` 或 active `meridian`：不能再次筑基；
- active `light`：可以再次准备，但成功率有明确负修正；
- 没有额外 breakthrough cooldown；
- 条件恢复后可再次尝试。

## 4. 伤势与 R16 修炼连接

R18 必须最小回接正式基础修炼：

- active light：R16 cultivation gain ×0.90；
- active severe 或 meridian：普通 `cultivate-days` 暂时拒绝；
- UI 自然说明当前伤势不适合运转周天；
- 不用 flags 建第二套惩罚。

## 5. 最小调养动作

为了让严重失败后角色不必靠“去探索 45 天”这种怪操作纯粹过时间，R18 允许增加最小：

```text
recuperate-days(10 | 30)
```

作用只有：

- 推进唯一 `worldDay`；
- 让 `recoveryDay` 自然接近 / 到达；
- 不加修为；
- 不加属性；
- 不掉资源；
- 不逐次写 Chronicle。

R18 不实现养脉丹、医馆、医生治疗、伤口 HP、毒素等完整医疗系统；这些后续接到同一 InjuryState。

---

# 四、突破所需物品只登记已冻结内容

R18 可以把以下两个已有世界丹药登记到 `src/data/items.ts`：

```text
破障丹
凝基丹
```

要求：

- category = pill；
- 正确阶品只在 Content Bible 已冻结时填写；
- 凝基丹明确二阶下品；
- 破障丹如果逐件阶品仍未冻结，就不擅自猜 tier / quality；
- 不新增商店、购买、掉落、炼丹配方；
- 当前正常人生若没有真实获得它们，只能看到“未持有”，不能免费使用；
- 测试可以构造真实 inventory 持有来验证消耗。

R18 不新增抱元丹；抱元丹到 R19 结丹才接入物品数据。

---

# 五、筑基成功率：第一版确定公式

玩家必须看到**最终准确百分比**和主要修正来源。

本轮使用可解释加法模型，最终：

```text
successPercent = clamp(5, 95, 30 + modifiers)
```

基础：

```text
健康 + 普通安全地点 + 基本可用主修 + 无额外准备 = 30%
```

## 1. 灵根 / 主修契合

使用 R16 已有主修 definition：

- universal 主修：`+0%`
- 属性主修且灵根契合：`+5%`
- 属性主修且不契合：`-10%`

不得再建第二套灵根属性表。

## 2. 主修熟练度

读取 R17 派生阶段：

```text
入门  +0%
熟练  +4%
小成  +8%
大成 +12%
```

如果状态是旧 R16、尚无 R17 techniquePractice，则按入门处理，不凭空补熟练度。

## 3. 功法稳定性

若当前主修已有：

```text
cultivation:stable
```

则：

```text
+3%
```

只读取已有 ruleTag，不按功法名字硬编码第二份表。

## 4. 静心守一

拥有 `still_mind`：

```text
+4%
```

## 5. 当前伤势

- active light：`-8%`
- active severe / meridian：直接不允许尝试，而不是继续叠负数。

## 6. 地点 / 环境

用现有地点和世界事实，不新建“筑基圣地”。

基础环境修正：

```text
qiDensity none   -10%
qiDensity thin    -7%
qiDensity low     -4%
qiDensity medium  +0%
qiDensity high    +6%
```

继续遵守 R16 青云宗权限：没有正式青云身份事实的访客，即使人在 `qingyun_sect`，只按 medium 计算外围环境。

额外稳定性：

- `blackwind_mountain`：额外 `-5%`（灵气紊乱）；
- `beast_ridge`：没有真实 `breakthrough_shelter:beast_ridge` 事实时，不满足连续 14 日安静地点前置，直接不可尝试；
- `lingxi_valley`：不额外奖励，当前 medium 已表达正常环境；
- 其他 fixed safe / settlement / market / clan / sect 地点按 qiDensity 处理。

高危险不自动等于高成功率。

## 7. 丹药

本次真实持有并选择消耗：

```text
破障丹 +12%
凝基丹 +20%
```

每种最多一次，不叠加。

## 8. 灵石投入

```text
0 灵石   +0%
30 灵石  +8%
60 灵石 +14%
```

不支持输入 47、100、500 灵石；超过 60 不继续线性叠加。

## 9. 筑基以上针对性指点

只读取真实已有事实：

```text
breakthrough_guidance:foundation
```

或当前架构中等价的正式 tag / flag。

有：`+8%`。

没有真实来源就不显示、不自动给。

R18 不实现拜师 / 宗门请教入口。

## 10. 成功率尺度验收

公式必须至少能落入 C16 锚点：

- 健康、普通环境、无额外准备：约 25%～35%；
- 破障丹 + 30 灵石：大致进入 45%～60%；
- 凝基丹 + 良好环境 + 合适功法 + 高熟练 / 指点 / 60 灵石：可进入 70%～85% 以上；
- 普通路线最高 95%，永不正常准备 100%。

---

# 六、失败严重度

只有第一次成功判定失败后，才进行失败严重度 seeded 判定。

严重度与当前最终成功率挂钩：准备越差，严重 / 极端权重越高。

## successPercent ≥ 70

```text
轻度 65%
严重 30%
极端  5%
```

## 45 ≤ successPercent < 70

```text
轻度 50%
严重 38%
极端 12%
```

## successPercent < 45

```text
轻度 35%
严重 45%
极端 20%
```

极端失败后再做一次 seeded 生死判定：

```text
50% 死亡
50% 存活但重伤 + 严重经脉伤
```

玩家在确认突破前应看到：

- 最终成功率；
- 失败可能分轻 / 严重 / 极端；
- 当前准备对应的严重度分布；
- “极端失败可能直接死亡”。

这是主动大境界突破，不需要把可解释风险藏成模糊后台概率。

---

# 七、RNG 与时间顺序

R18 必须使用已有 seeded RNG / `rngState`，禁止 `Math.random()`。

每次正式突破：

1. 校验全部前置与资源；
2. 计算并冻结本次 preview；
3. 原子扣除已选丹药 / 灵石；
4. 推进 14 日唯一 `worldDay`；
5. 若途中自然寿终：死亡优先，资源保持已消耗，不再做突破 RNG；
6. 若仍存活：从主 `rngState` 做成功 roll；
7. 成功则进入筑基；
8. 失败再做 severity roll；
9. 若 extreme，再做 death roll；
10. 每次实际抽取后把新 `rngState` 写回唯一 GameState。

同 snapshot + 同 command 必须得到同结果与 digest。

不要为了“结果更随机”额外抽无意义 RNG。

---

# 八、成功结果

成功时：

```text
cultivation.realm = 'foundation'
cultivation.stage = 1
resources.cultivation = 0
```

要求：

- 不自动获得《青元归真经》《归元守一篇》或《阴髓录·凝煞篇》；
- 不自动加入青云宗；
- 不自动改变 faction；
- 不自动给装备 / 灵石；
- 寿元上限继续通过现有 realm → lifespan 规则自然变为筑基寿元尺度；
- 新增 1 条 major / notable Chronicle：筑基成功；
- R18 成功后没有“继续修筑基”的按钮，因为筑基后完整修炼与传承衔接留给 R19 / 后续任务。

UI 自然提示：

> 你已经筑基。下一步需要解决筑基阶段的主修延续与后续修炼。

不要写“R19 未开发”。

---

# 九、失败结果与 Chronicle

## 轻度

- 修为回到 78.0%；
- `light` injury 至 `worldDay + 10`；
- 记录一次 notable Chronicle：筑基失败 / 气机紊乱；
- 不额外加系统冷却。

## 严重

- 修为回到 50.0%；
- `severe` + `meridian` injury 至 `worldDay + 45`；
- 记录 major / notable Chronicle：筑基失败 / 经脉受创；
- active severe / meridian 期间不能再冲关。

## 极端存活

- 修为回到 30.0%；
- `severe` + `meridian` injury 至 `worldDay + 90`；
- 记录 major Chronicle；
- 不附赠任何补偿。

## 极端死亡

- `status = dead`；
- endReason 写清“筑基反噬 / 经脉崩裂”一类直接因果；
- 进入现有人生结束入口；
- 不伪造成功、不给资源回滚。

普通失败不要每次写长篇仙侠文学，文本保持事实导向。

---

# 十、SessionCommand

建议新增：

```ts
{ type: 'attempt-foundation-breakthrough'; usePozhangDan: boolean; useNingjiDan: boolean; spiritStoneInvestment: 0 | 30 | 60 }
{ type: 'recuperate-days'; days: 10 | 30 }
```

全部经过：

```text
SessionCommand
→ R18 resolver
→ unique GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

若当前有：

- pendingResult；
- pendingAction；
- active event；
- active secret realm；

则普通筑基 / 调养命令不得静默吞掉前序状态。

R18 不调用 legacy `resolveBreakthroughAttempt()`。

---

# 十一、UI

在正式成年修炼区域加入 `FoundationBreakthroughPanel` 或等价组件。

只在：

```text
realm === qi
stage === 9
resources.cultivation === 1000
```

时显示“筑基准备”。

## 必须显示

- 当前最终成功率；
- 每条主要加减修正；
- 当前失败严重度分布；
- 当前地点；
- 当前主修与熟练度；
- 当前 active injuries；
- 是否持有破障丹 / 凝基丹；
- 0 / 30 / 60 灵石三档；
- 14 日时间成本；
- 极端失败可能死亡。

丹药只在 inventory 真实拥有时可勾选。

## 确认按钮文案

使用行为语言，例如：

```text
开始筑基｜14日｜成功率 58%
```

不要写：

- “高风险按钮”；
- “推荐配置”；
- “战力不足”；
- “最佳方案”；
- “保底”；
- “看广告提高成功率”。

## 伤势页

存在 active injuries 时，修炼区域显示：

- 伤势类型；
- 预计自然恢复还需多少日；
- 调养 10 日 / 30 日。

不显示“HP -30%”等尚未有真源的数字。

---

# 十二、兼容要求

R18 必须保护 R05～R17 replay：

- `GameState.injuries` optional；
- `createInitialGameState()` 不写空 InjuryState；
- 不改 R17 之前命令的历史语义；
- 不让旧 `choice(attempt)` 突破命令突然调用 R18；
- R18 新命令才触发新伤势 / 筑基语义；
- save clone 只在 injuries 存在时深拷贝；
- R16 cultivation 只有在 injuries 真正存在时读取影响；旧没有 injuries 的状态计算结果必须保持一致。

---

# 十三、必须测试

至少覆盖：

1. 旧 R05～R17 state 没有 `injuries` 仍合法；
2. 非炼气九层 100% 不能筑基；
3. 无主修不能筑基；
4. active severe / meridian 阻止筑基；
5. light 不阻止但降低成功率；
6. beast ridge 无 shelter 不允许冲关；
7. 基础健康普通环境成功率约 30%；
8. 属性契合 / 不契合正确修正；
9. R17 入门 / 熟练 / 小成 / 大成正确修正；
10. stable ruleTag 正确修正；
11. still_mind 正确修正；
12. 青云访客不能白用 high 环境；
13. 破障丹真实持有才可选；
14. 凝基丹真实持有才可选；
15. 丹药每次最多各 1 份并真实扣除；
16. 灵石只允许 0 / 30 / 60；
17. 灵石不足原子拒绝，不部分扣；
18. 成功率 clamp 最高 95%；
19. 低 / 中 / 高准备对应三组失败严重度权重；
20. 突破固定推进 14 日；
21. 途中寿终优先，资源已消耗但不做成功 RNG；
22. 同 snapshot + command seeded 结果一致；
23. 成功进入 foundation stage 1、修为归 0；
24. 成功不自动发高阶功法 / faction / 装备；
25. 轻败修为 780 + 10 日 light injury；
26. 严重失败修为 500 + 45 日 severe / meridian；
27. 极端存活修为 300 + 90 日 severe / meridian；
28. 极端失败 death roll 可真实死亡；
29. 极端死亡 endReason 直接；
30. active light 让 R16 cultivation ×0.90；
31. active severe / meridian 阻止 R16 cultivation；
32. recuperate 10 / 30 只推进 worldDay，不加修为 / 属性 / 灵石；
33. injury active 状态由 recoveryDay 派生，过期后不再阻止；
34. save / reload 深拷贝 injuries；
35. attempt / recuperate Session replay 稳定；
36. pendingResult 不被突破命令吞掉；
37. legacy breakthrough tests 不回归；
38. R13 / R14 / R15 / R16 / R17 tests 不回归；
39. UI 不出现金丹 / 延寿 / 自动学习高阶功法 / 广告 / 保底；
40. `npm run typecheck` 通过；
41. `npm test` 通过；
42. `npm run build` 通过。

---

# 十四、本轮允许修改

- `src/types/game.ts`
- 可新增 `src/types/injury.ts`
- `src/types/command.ts`
- `src/data/items.ts`
- 可新增 `src/core/injuryEngine.ts`
- 可新增 `src/core/foundationBreakthroughEngine.ts`
- `src/core/cultivationEngine.ts`（只接正式 injury influence）
- `src/core/sessionEngine.ts`
- `src/store/saveRepository.ts`
- `src/App.tsx`
- 一个突破 / 伤势 UI 组件与 CSS
- R18 tests
- `HANDOFF.md`
- R18 成功后再切 `CURRENT_TASK.md`

其它文件仅允许最小必要依赖修改。

---

# 十五、本轮禁止

- 不做 R19 筑基 → 金丹；
- 不做筑基期 1 / 3 / 10 / 30 日继续修炼；
- 不自动授予《青元归真经》《归元守一篇》《阴髓录·凝煞篇》；
- 不做抱元丹；
- 不做延寿物；
- 不做金丹雷劫；
- 不做完整 HP / 战斗伤害伤势；
- 不做毒素；
- 不做养脉丹使用 / 医馆 / 医者治疗；
- 不做宗门贡献 / 师父指导获取；
- 不做商店购买凝基丹；
- 不做炼丹制作凝基丹；
- 不补装备具体品阶；
- 不补随机子地点模板；
- 不补重大机缘；
- 不补普通事件正文；
- 不接 LLM；
- 不扩 legacy ActionPanel。

---

# 十六、验收标准

1. 炼气九层 100% 角色可以看到准确筑基成功率与修正来源；
2. 玩家可决定是否使用真实持有的破障丹 / 凝基丹和 0 / 30 / 60 灵石；
3. 正式冲关消耗 14 日并真实消耗所选资源；
4. seeded 成功 / 失败可以 replay；
5. 成功进入筑基前期；
6. 失败会真实造成修为倒退、结构化伤势或死亡；
7. 严重 / 经脉伤真正阻止再次冲关，并能通过时间调养恢复；
8. injury runtime 回接 R16 修炼，不存在 flags 第二套伤势；
9. 没有额外突破冷却；
10. 旧 replay 与 legacy 突破不回归；
11. typecheck / test / build 全通过；
12. 更新 `HANDOFF.md`；
13. R18 成功后**不要直接进入 R19**：先把 `CURRENT_TASK.md` 切到 **C19｜延寿物与 R19 前内容冻结**，补齐 2～3 个具体延寿物，再立即停下。
