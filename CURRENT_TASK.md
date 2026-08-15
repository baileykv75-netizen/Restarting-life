# 当前任务：V2 R16 - 基础修炼

## 本轮唯一目标

在 C16 已冻结的世界内容上，实现首版真正可玩的基础修炼闭环：

```text
已有真实功法传授入口
→ 初始化本世修炼实践状态
→ 选择已掌握主修
→ 选择修炼 1 / 3 / 10 / 30 日
→ 读取灵根 / 主修 / 当前地点环境 / 已有相关天赋体质
→ 推进唯一 worldDay
→ 累积修为进度
→ 引气入体 / 炼气 1～9 层自然推进
→ 炼气九层 100% 停在筑基准备入口
```

本轮只解决**基础修炼**。

**不实现 R17 完整功法获取 / 转修 / 熟练度，不实现 R18 筑基突破，不消耗凝基丹，不实现 R19 金丹，不做战斗或宗门系统。**

---

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md` 的时间、修炼、寿元、透明度规则
3. `V2_CONTENT_BIBLE.md` 第 6、7、8、10、11、16、35 节
4. `HANDOFF.md` 的 R15 / C16
5. `V2_GITHUB_ROADMAP.md` 的 R16 / R17
6. `src/data/adultEntries.ts`
7. `src/data/spiritRoots.ts`
8. `src/data/worldLocations.ts`

若代码中的旧 legacy 修炼逻辑与本任务冲突，只允许保护兼容，不得把旧全局 ActionPanel 修炼扩成 V2 正式玩法。

---

# 一、兼容与唯一状态原则

R16 必须保护 R05～R15 已有 replay digest。

## 1. 不创建第二套角色状态

继续使用唯一 `GameState`。

允许在现有：

```ts
state.cultivation
```

上增加 optional 的 R16 字段，例如：

```ts
mainTechniqueId?: string | null
knownTechniqueIds?: string[]
practiceInitialized?: true
```

或等价最小结构。

要求：

- 旧 `createInitialGameState()` 不得因为 R16 自动补这些字段；
- 通过显式 `initialize-cultivation` SessionCommand 第一次 materialize；
- bootstrap 不推进时间、不消耗 RNG；
- 不创建长期并行 `CultivationStateV2`；
- R17 必须继续扩展这套字段，而不是另起第二套 TechniqueState。

`resources.cultivation` 继续作为唯一“当前小阶段修为进度”真源，不复制一个第二进度条。

## 2. 只在正式 V2 成年人生启用

R16 正式修炼入口只对：

```text
lifeStage === adult
status === playing
```

开放。

`legacy-adult` 继续走旧兼容逻辑，不主动迁移成 R16 修炼状态，避免改变旧人生 digest。

---

# 二、R07 功法入口如何接入

R07 已经区分：

- 真正得到基础功法初步传授：`cultivation_method_access_seed`
- 只有宗门 / 修士 / 坊市门路：普通 `adult_access_seed`

R16 必须尊重这个区别。

## 1. 有明确功法传授 seed

当前直接可用于 R16 的 seed：

```text
xiaozhoutian_tuna
qingyuan_yinqi
xie_basic_qi_method
lu_basic_qi_method
```

处理规则：

- `xiaozhoutian_tuna` → 已掌握《小周天吐纳法》；
- `qingyuan_yinqi` → 已掌握《青元引气诀》；
- `xie_basic_qi_method` 是 R07 的家族基础吐纳入口，不新增“谢氏神功”。R16 兼容映射到本地最常见的《小周天吐纳法》基础运转；
- `lu_basic_qi_method` 是 R07 的陆家基础培养入口，不新增未冻结功法。R16 先兼容映射到《小周天吐纳法》；《春木养元功》等陆家更容易获得的正式路线等 R17 的真实功法获取 / 学习系统接入。

这两个兼容映射只是把 R07 的泛化 seed 落到已经冻结的现有基础功法，**不得反向新增新的正式功法名称。**

## 2. 只有门路但没有功法

例如：

- 青云宗招录机会；
- 坊市修士接触；
- wandering cultivator contact；
- blackwind anomaly contact；
- loose cultivator network。

这些**不能在 R16 自动变成功法**。

UI 应自然显示：

> 你还没有一门真正可以开始吐纳的主修功法。

不要显示“系统尚未解锁 R17”之类开发文案。

实际购买、拜师、宗门传功、遗迹得法等由 R17 / 后续地点事务真正解决。

## 3. 无灵根

`spiritRootId === none` 时：

- `initialize-cultivation` 可以保持合法；
- 不能选择普通吐纳法开始修炼；
- 不出现“修炼 30 日然后修为 +0”的假按钮；
- UI 说明现有普通吐纳无法引气即可；
- 不提供保底改根。

---

# 三、R16 首批 TechniqueDefinition

建立静态 data 定义，不把整份定义写进存档。

本轮只登记以下 **6 门**已冻结基础主修，用于建立可扩展计算结构：

1. 《小周天吐纳法》
2. 《青元引气诀》
3. 《春木养元功》
4. 《赤阳诀》
5. 《寒水经》
6. 《厚土养气篇》

其中 R16 新人生正常通过 R07 直接掌握的主要仍是《小周天吐纳法》与《青元引气诀》；其余四门先作为正式静态定义与测试样本，不新增购买 / 掉落 / 家族赠送来源。

R17 再把《庚金锐气诀》《风行吐纳篇》《雷引诀》《阴髓录》残篇及完整学习来源正式接入。

最小字段可包含：

```ts
id
name
baseEfficiency
preferredElements
universal
stabilityTags / ruleTags
```

禁止加入技能树、招式解锁、熟练度等级、随机词条。

### R16 基础效率锚点

仅用于本轮修炼速度：

| 功法 | baseEfficiency |
|---|---:|
| 小周天吐纳法 | 1.00 |
| 青元引气诀 | 1.08 |
| 春木养元功 | 1.04 |
| 赤阳诀 | 1.08 |
| 寒水经 | 1.04 |
| 厚土养气篇 | 1.02 |

这些是修炼效率锚点，不代表战斗强度，不生成“功法战力”。

---

# 四、修为进度唯一语义

R16 正式把成年 V2 人生中的：

```ts
resources.cultivation
```

解释为**当前小阶段修为点**。

统一：

```text
1000 修为点 = 当前阶段 100.0%
```

UI 显示百分比到 1 位小数，例如：

```text
炼气三层 · 64.7%
```

但状态仍存整数修为点，避免浮点漂移。

## 1. 凡人有灵根 + 主修

正式修炼开始时：

```text
凡人 / 引气入体 0～100%
```

达到 1000 后：

```text
realm = qi
stage = 1
```

溢出的修为继续进入炼气一层进度。

这就是 R16 的正常“入道”，不另加一次抽卡成功率或强制剧情。

## 2. 炼气 1～8 层

每累计 1000 点：

```text
stage += 1
resources.cultivation -= 1000
```

允许一次 30 日修炼跨越一个小层，但结果必须清楚显示前后境界 / 进度。

## 3. 炼气九层

炼气九层最多：

```text
resources.cultivation = 1000
```

即 100%。

达到后不再继续累积隐藏修为，不自动筑基、不调用旧突破事件。

UI 显示自然文案：

> 炼气九层已经圆满。继续提升需要准备筑基。

R18 再实现真正筑基动作。

---

# 五、基础修炼公式

R16 需要一套透明、确定性的基础公式，不使用 RNG。

## 1. 基础日进度

```text
basePointsPerDay = 4
```

本次修为：

```text
gain = floor(
  days
  × 4
  × spiritRootMultiplier
  × techniqueEfficiency
  × affinityMultiplier
  × environmentMultiplier
  × traitMultiplier
)
```

所有乘数来源必须能在当前 GameState / 静态定义中解释。

## 2. 灵根

直接复用 `src/data/spiritRoots.ts` 已存在的：

```ts
cultivationMultiplier
```

不得再复制第二套单双三四五灵根速度表。

无灵根 multiplier = 0，并由行动可用性提前拦截。

## 3. 功法契合

### 通用功法

- 小周天吐纳法：`1.00`
- 青元引气诀：`1.00`

### 属性功法

若灵根 elements 包含功法主属性：

```text
affinityMultiplier = 1.15
```

否则：

```text
affinityMultiplier = 0.85
```

寒水经额外把 `ice` 视为契合。

R16 不做复杂多属性配比，不计算“木 37% / 水 24%”。

## 4. 地点环境

优先复用现有 `WorldLocationDefinition.qiDensity`，第一版换算：

| qiDensity | environmentMultiplier |
|---|---:|
| none | 0.55 |
| thin | 0.70 |
| low | 0.80 |
| medium | 1.00 |
| high | 1.15 |

要求：

- 黑风山 / 万兽岭当前 static data 都是 medium，本轮不因为“危险”额外加速修炼；
- R16 不随机制造野外经脉伤；
- 青霞坊当前只使用公共环境，不把静修院付费房间偷偷免费算进去；
- 静修院 3 / 8 灵石每 10 日的房间内容已经在 C16 冻结，但等真正的地点子设施 / 付费修炼动作接入时再用；
- 青云宗 `high` 只有已有正式宗门修炼权限的状态才能完整使用；如果当前 V2 还没有正式弟子权限事实，按 `medium` 结算“宗门外围环境”，不得让普通访客白用核心灵脉；
- 不新增“上佳”假地点节点。

## 5. 天赋与体质

R16 只接已经有明确修炼职责的内容，避免所有天赋都硬塞数值：

### 静心守一

若拥有 `still_mind` 且本次修炼时长 ≥10 日：

```text
traitMultiplier *= 1.08
```

短修炼不加成。

### 赤阳灵体

修《赤阳诀》：

```text
traitMultiplier *= 1.10
```

### 玄阴灵体

修《寒水经》：

```text
traitMultiplier *= 1.10
```

其他体质 / 天赋在 R16 不强行加修炼速度；例如举一反三更适合 R17 学习 / 转修，百草灵体属于炼丹 / 探索。

## 6. 伤势

C16 已冻结伤势会影响修炼与突破，但当前仓库尚没有完整 authoritative injury runtime。

R16 **不得用 narrative flag 临时伪造第二套伤势系统**。

因此本轮基础公式只读取当前已经真实结构化存在的因素；完整轻伤 / 重伤 / 经脉伤修炼惩罚在正式伤势状态进入 GameState 后接入。

在 HANDOFF 中明确记录此连接点，不得忘记。

---

# 六、修炼时间

玩家本轮提供四个真实时长：

```text
1 日
3 日
10 日
30 日
```

要求：

- 全部推进唯一 `worldDay`；
- 不建立“修炼月份”第二时钟；
- 一次修炼就是一次完整 SessionCommand；
- 不逐日弹普通事件；
- R16 不实现长行动世界事件中断；
- 选了 30 日就是投入 30 日，即使期间刚好跨入下一小层，剩余时间继续用于下一层；
- 如果到炼气九层 100%，多余修为丢弃，不储存在隐藏字段里。

## 寿元优先

必须复用已有寿元 / 时间死亡规则。

如果角色在这次修炼期间寿终：

- 死亡优先；
- 不伪造“闭关完成”；
- 不在死亡之后再晋小层；
- 不生成成功修炼结果卡。

---

# 七、SessionCommand

新增正式命令，建议：

```text
initialize-cultivation
select-main-technique(techniqueId)
cultivate-days(days)
```

全部走：

```text
SessionCommand
→ cultivation resolver
→ GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

### initialize-cultivation

- 一世一次；
- 从已有 R07 `cultivation_method_access_seed` 解析初始 `knownTechniqueIds`；
- `mainTechniqueId` 初始为 null；
- 不推进时间 / RNG；
- 没有功法 seed 也能初始化为空 known list，表示“目前没学到能修的功法”。

### select-main-technique

- 只能选择 `knownTechniqueIds` 中的正式 definition；
- R16 第一次选主修不收转换成本；
- 切换到另一门已知功法在 R16 可以直接改引用，但**不得设计完整转功成本**；R17 接手后再实现正式切换成本；
- 不推进时间 / RNG。

### cultivate-days

必须检查：

1. adult / playing；
2. 有灵根；
3. cultivation 已初始化；
4. mainTechniqueId 非空且属于 known；
5. days 只能是 1 / 3 / 10 / 30；
6. 当前不在 active secret realm；
7. 当前没有 pending event / action / result；
8. 炼气九层已 100% 时拒绝继续普通修炼。

不得调用 legacy `performPlayerAction('cultivate')`。

---

# 八、UI

新增一个轻量 `CultivationPanel` 或等价组件，放在正式成年世界界面中，不恢复旧四按钮。

## 已有功法

显示：

- 当前境界；
- 当前修为百分比；
- 已掌握主修列表；
- 当前主修；
- 当前地点灵气环境；
- 当前能解释的效率来源；
- 1 / 3 / 10 / 30 日修炼按钮。

示例应接近：

```text
主修：《青元引气诀》
炼气二层 · 36.4%
当前位置：青霞坊市｜灵气普通

修炼 10 日
预计推进：约 5.2%
```

预计值必须用和 resolver **同一个纯计算函数**，不能 UI 自己复制公式。

## 没有主修

自然显示：

> 你还没有一门真正可以开始吐纳的主修功法。

不显示无效“修炼”按钮。

## 无灵根

自然显示普通吐纳无法引气，不做失败进度条。

## 炼气九层圆满

显示：

> 炼气九层已经圆满。继续提升需要准备筑基。

本轮没有筑基按钮。

## 禁止出现

- “修炼系统解锁中”；
- “R17 将开放”；
- 推荐功法；
- 战力；
- 自动挂机；
- 修炼加速广告；
- 隐藏概率；
- 凝基丹 / 抱元丹使用按钮；
- 突破按钮。

---

# 九、结果与 Chronicle

## 1. 结果卡

修炼完成后结果只写实际发生内容，例如：

```text
闭关十日
你按《青元引气诀》运转周天，十日后结束吐纳。

时间：+10日
修为：36.4% → 42.1%
```

跨小层时：

```text
境界：炼气二层 → 炼气三层
修为：96.8% → 4.7%
```

不要写“命运”“代价已经落下”一类句子。

## 2. Chronicle

普通 1 / 3 / 10 / 30 日修炼**不逐次写 Chronicle**，避免《此世传》被闭关流水淹没。

只允许本轮两个明显节点单列：

- 首次成功引气入体、进入炼气一层；
- 如现有 Chronicle 聚合能力足够，可记录一次炼气后期关键阶段；否则不新增，留给后续一生聚合。

R16 不为每个小层自动写人生大事。

---

# 十、保存 / replay

- optional 修炼实践字段需要 save / clone 深拷贝；
- 没有 R16 字段的旧存档保持没有；
- initialize / select-main / cultivate 进入 debug log；
- 同 snapshot + 同 commands 得到同 digest；
- 修炼不使用 RNG；
- 不改变无关 inventory / equipment / knowledge / relationships / exploration / secret realm 数据。

---

# 十一、必须测试

至少覆盖：

1. R05～R15 旧 V2 state 没有 R16 optional 字段仍合法；
2. cultivation bootstrap 只执行一次；
3. bootstrap 不推进时间、不改 RNG；
4. R07 `xiaozhoutian_tuna` 正确解析为小周天；
5. R07 `qingyuan_yinqi` 正确解析为青元引气诀；
6. R07 `xie_basic_qi_method / lu_basic_qi_method` 不生成新功法名，兼容落到已有小周天；
7. 只有 adult_access 而无 cultivation method seed 不会凭空获得功法；
8. 无灵根不能普通修炼；
9. 未掌握功法不能设为主修；
10. 六门 R16 technique definitions 名称全部来自 Content Bible；
11. 灵根直接读取现有 cultivationMultiplier；
12. 属性功法契合 / 不契合修为不同；
13. 静心守一只在 ≥10 日长修炼生效；
14. 赤阳灵体 + 赤阳诀、玄阴灵体 + 寒水经生效；
15. 不相关天赋不会莫名提高修炼速度；
16. 不同 qiDensity 地点产生不同修炼推进；
17. 黑风山 / 万兽岭危险不会被当作额外修炼加成；
18. 无正式宗门权限不能白用青云宗核心 high 修炼倍率；
19. 1 / 3 / 10 / 30 日世界时间正确推进；
20. mortal 1000 点正确进入炼气一层；
21. 一次长修炼可跨小层并正确保留溢出；
22. 炼气 1～8 层正常升级；
23. 炼气九层封顶 1000，不自动筑基；
24. 达到九层圆满后普通 cultivate 被拒绝；
25. 寿终途中死亡优先，不伪造完成 / 升层；
26. 普通修炼不逐次污染 Chronicle；
27. 首次引气入体可留下克制的一条 notable Chronicle；
28. 预计修为与实际 resolver 使用同一函数；
29. initialize / select-main / cultivate save / reload 保持；
30. initialize / select-main / cultivate replay digest 稳定；
31. R13 秘境、R14 背包、R15 装备测试不回归；
32. legacy ActionPanel 行为不扩张；
33. UI 不出现突破 / 凝基丹 / 抱元丹 / 战力 / 挂机假功能；
34. `npm run typecheck` 通过；
35. `npm test` 通过；
36. `npm run build` 通过。

---

# 十二、本轮允许修改

- `src/types/game.ts`
- `src/types/command.ts`
- 可新增最小 cultivation types
- `src/data/techniques.ts`
- `src/core/cultivationEngine.ts`
- `src/core/sessionEngine.ts`
- persistence clone / normalize 的最小兼容修改
- `src/App.tsx`
- 一个 `CultivationPanel` + 对应 CSS
- R16 tests
- `HANDOFF.md`
- R16 完成后再修改 `CURRENT_TASK.md`

如果需要修改其它文件，必须是完成 R16 的最小必要依赖。

---

# 十三、本轮禁止

- 不做 R17 完整功法学习 / 买卖 / 抢夺 / 师承；
- 不做正式功法熟练度四阶段；
- 不做转功代价；
- 不做辅修 / 战斗招式；
- 不做 R18 筑基 resolver；
- 不做凝基丹使用；
- 不做破障丹突破使用；
- 不做 R19 结丹；
- 不做抱元丹；
- 不做常规金丹雷劫；
- 不做完整伤势系统；
- 不做聚气丹 / 丹毒；
- 不实现静修院付费房间交易；
- 不实现青云宗正式弟子权限系统；
- 不实现世界事件中断闭关；
- 不补装备具体品阶；
- 不补延寿物；
- 不补随机子地点模板；
- 不补重大机缘 / 普通事件正文；
- 不接 LLM API；
- 不扩 legacy `ActionPanel`。

---

# 十四、验收标准

1. 一个已经真实得到基础功法、且有灵根的成年角色，可以选择主修并修炼 1 / 3 / 10 / 30 日；
2. 修炼真实推进唯一 worldDay 和唯一修为进度；
3. 灵根、功法契合、地点环境、静心守一与两种相关体质真实改变效率；
4. 凡人可通过修炼自然完成引气入体并进入炼气一层；
5. 炼气 1～9 层可以通过修炼自然推进；
6. 九层 100% 准确停住，不提前筑基；
7. 没功法 / 无灵根时不伪造可修行为；
8. 结果自然、透明，不污染 Chronicle；
9. save / reload / replay 稳定；
10. 旧 R05～R15 与 legacy 行为不回归；
11. typecheck / test / build 全通过；
12. 更新 `HANDOFF.md`；
13. 成功后再把 `CURRENT_TASK.md` 切到 R17，并立即停下。
