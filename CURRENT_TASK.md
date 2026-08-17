# 当前任务：V2 R19 - 寿元 / 延寿 / 筑基后修炼 / 金丹

## 本轮唯一目标

把 C16 + C19 已冻结的内容接成一个 authoritative 的时间压力闭环：

```text
筑基成功
→ 真正获得筑基后主修后继续修炼
→ 筑基前 / 中 / 后 / 圆满
→ 寿元持续推进、可真实使用稀有延寿物
→ 筑基圆满 100% 后准备结丹
→ 60 日 seeded 结丹
→ 成功进入金丹 / 失败受创或死亡
→ 金丹 450 年基础寿元成为首版终局寿元
```

本轮要实现 R19 本身，但**不得**顺手进入 C20 / R20 战斗，不实现延寿物获取商店、宗门贡献、重大机缘、完整治疗 / 中毒系统。

---

# 一、开始前必须阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`：寿元、真死亡、修炼、大境界突破规则
3. `V2_CONTENT_BIBLE.md`：
   - 第 35 节 C16 修炼 / 筑基后传承 / 结丹；
   - 第 36 节 C19 寿元 / 延寿 / 三门筑基后主修最低执行数值；
4. `HANDOFF.md`：R18 injury runtime 与 C19 交接
5. `V2_GITHUB_ROADMAP.md`：R19
6. 当前相关代码：
   - `src/core/lifespanEngine.ts`
   - `src/core/cultivationEngine.ts`
   - `src/core/techniqueEngine.ts`
   - `src/core/foundationBreakthroughEngine.ts`
   - `src/core/injuryEngine.ts`
   - `src/core/sessionEngine.ts`
   - `src/data/items.ts`
   - `src/data/techniques.ts`
   - save / replay / UI 相关文件

若实现与旧 legacy breakthrough 数据冲突，优先保持旧 replay 语义，用新的 R19 resolver / optional runtime 解决，不重写旧 V1/V2 历史命令。

---

# 二、兼容性最高原则

R05～R18 已经存在大量 snapshot digest / replay。

因此：

1. **不得**在 `createInitialGameState()` 给旧状态无条件补空 lifespan runtime；
2. 如果 R19 新增结构化寿元运行态，只在第一次真实产生延寿效果 / 永久减寿事实时 materialize；
3. 大境界基础寿元从 realm 静态定义派生，不重复存一个 `maxLifespanYears` 真源；
4. 不允许 `flags`、UI local state、inventory 与 lifespan runtime 各保存一份冲突的“是否已经吃过”真相；
5. 老 save 没有 R19 optional 字段仍必须合法；
6. 新字段若是 nested object / array，save load 必须深拷贝；
7. 新命令必须进入 Session debug log / digest / replay；
8. 不改 R18 `attempt-foundation-breakthrough` 的既有 RNG 顺序与 digest 语义。

推荐最小 authoritative runtime（字段名可按现有架构微调）：

```ts
interface LifespanState {
  appliedEffectKeys: string[]
  permanentPenaltyKeys: string[]
}
```

只保存“发生过哪些唯一效果 / 代价”。年数从 C19 静态定义表派生，不再同时保存 bonusYears / penaltyYears 第二真源。

---

# 三、基础寿元必须正式统一

C19 已冻结：

```text
凡人     80 年
炼气    120 年
筑基    220 年
金丹    450 年
```

修改现有 `lifespanEngine`：

- 金丹不能再返回 `null`；
- 四个大境界都返回有限寿元；
- 小阶段不加寿元；
- 年龄 = `worldDay - birthDay`；
- 到有效最大寿元当天寿终；
- 无年龄 debuff。

统一公式：

```text
有效最大寿元
= realm 基础最大寿元
+ applied lifespan effect 年数
- permanent lifespan penalty 年数
```

突破只替换 realm 基础项，已有 bonus / penalty 全部继续保留。

任何永久减寿效果结算后都必须再次执行寿元判定：如果当前年龄已经达到新的有效上限，立即寿终。

---

# 四、玩家可见年龄 / 寿元

R19 后正式 UI 必须至少能看到：

```text
年龄：67 / 120 岁
```

如果存在延寿 / 减寿，允许用简洁二级信息说明：

```text
基础 120 年｜延寿 +15｜永久代价 -10
```

不要做复杂寿命属性页。

剩余寿元可以派生显示，但不要把它保存成第二个核心状态。

---

# 五、三种延寿物

只能登记 C19 已冻结的 3 个：

## 1. 延元丹

```text
延元丹｜二阶下品
category: pill
+10 年
key: lifespan_effect:yanyuan_dan
```

## 2. 百年灵参

```text
百年灵参｜二阶中品
category: material
用于延寿时 +15 年
key: lifespan_effect:century_spirit_ginseng
```

## 3. 黑风地髓

```text
黑风地髓｜二阶上品
category: material
+30 年
key: lifespan_effect:blackwind_earth_marrow
```

R19 只登记正式物品 / 使用规则，**不实现它们的获取来源**。

不得：

- 自动送玩家；
- 添加常驻商店；
- 把黑风地髓塞进沉脉石室；
- 新增第四种延寿物。

---

# 六、延寿使用命令与同类一次

新增正式 SessionCommand，例如：

```text
use-lifespan-item(itemId)
```

要求：

1. 玩家背包里真实拥有物品；
2. item 必须有已冻结 lifespan effect；
3. 对应 `effectKey` 未在本世角色上生效；
4. 校验全部通过后才消耗 1 个真实物品；
5. 消耗后记录 effect key；
6. 重新计算有效最大寿元；
7. 产生简洁 pending result / Chronicle 重要记录；
8. save / reload / replay 后仍然只生效一次。

如果 effect key 已经存在：

- 命令必须拒绝；
- **不得消耗物品**；
- UI 明确写“此类延寿效果已经生效，再次使用不会继续延寿”。

百年灵参如果选择“用于延寿”，必须真实消耗整株；R19 不同时给它结丹恢复效果。

已死亡角色不能使用延寿物复活。

---

# 七、筑基后主修正式登记

只新增 C19 已冻结的 3 门：

| 功法 | baseEfficiency | universal | preferredElements | 规则 |
|---|---:|---|---|---|
| 《青元归真经》 | 1.05 | true | 无 | `cultivation:stable` |
| 《归元守一篇》 | 1.00 | true | 无 | 中性基准 |
| 《阴髓录·凝煞篇》 | 1.10 | false | water / ice | `cultivation:evil` / cold |

必须增加明确的 realm support / max realm 语义，使：

- R16 炼气基础功法可以完成炼气，但**不能无条件从筑基一路修到金丹**；
- 这三门高阶主修才能驱动筑基正常修炼；
- 它们都只在 `knownTechniqueIds` 真实存在时可选择 / 改修；
- R19 绝不自动发放任何一门。

不得顺手补：

- 《庚金锐气诀》；
- 《风行吐纳篇》；
- 《雷引诀》；
- 《阴髓录》残篇

当前仍 pending 的低阶精确效率。

---

# 八、《阴髓录·凝煞篇》永久代价

真正第一次转入《阴髓录·凝煞篇》时，记录稳定 penalty key，例如：

```text
lifespan_penalty:yinsui_ningcha_entry = -10 年
```

规则：

- 只结算一次；
- 改走别的功法以后不返还寿元；
- 再次改回不重复 -10；
- 执行改修前必须显示“永久减少 10 年最大寿元”以及结算后的寿元上限；
- 结算后立刻重新做自然死亡判断。

不要用一个会被重复覆盖的 flag 伪造这条永久代价。

---

# 九、筑基阶段修炼

R19 把正式修炼扩展到：

```text
筑基前期 → 筑基中期 → 筑基后期 → 筑基圆满
```

实现锚点：

- `stage 1` = 前期；
- `stage 2` = 中期；
- `stage 3` = 后期；
- `stage 4` = 圆满；
- 每一小阶段仍以 `resources.cultivation` 0～1000 表示 0～100%；
- 每累计 1000 点推进一个筑基小阶段；
- 到 `stage 4 + 1000` 后硬停，进入结丹准备；
- 不自动金丹。

继续复用 R16 的：

- 1 / 3 / 10 / 30 日修炼；
- 灵根；
- 功法效率；
- 环境；
- 相关天赋；
- R18 伤势；
- `worldDay`；
- 主修熟练度增长。

筑基可以降低整体日修炼速度，但只能使用一个明确的 realm factor，不另做第二套修炼引擎。

### 伤势

继续使用 R18：

- active 轻伤降低修炼效率；
- active 重伤 / 经脉伤阻止普通修炼。

R19 不实现中毒生成、伤势恶化、治疗丹药闭环；这些留给 R21。

---

# 十、抱元丹与结丹准备物

登记 C16 已冻结：

```text
抱元丹｜二阶上品
常见价值 650～900 下品灵石
```

不加入首版七张玩家炼丹配方，不实现获取商店。

邪道替代路线所需的资源可以使用统一真实物品定义：

```text
完整二阶妖丹
高品质妖兽精血
```

它们是 C16 已冻结的真实妖兽资源类别，R19 可以登记最小 inventory definition 供结丹 resolver 使用；**不得**因此实现 R22 妖兽掉落系统或新妖兽。

后续 R22 可以让寒潭鳞蟒、独角苍狼等实际战利品产出这些标准资源。

---

# 十一、金丹前置

正式结丹最低条件：

1. `status === playing`；
2. adult；
3. realm = foundation；
4. stage = 4；
5. `resources.cultivation === 1000`；
6. 当前主修真实已知；
7. 当前主修为 C19 三门之一并拥有明确结丹段；
8. 无 active severe / meridian injury；
9. 不在 active 秘境；
10. 无 pending event / action / result；
11. 当前地点合法且能够连续闭关 60 日。

C16 还要求“无未处理中毒”。R19 **不得为了这一条提前创建 R21 poison 系统**：

- 如果当前 authoritative state 已经存在可读的 poison 状态，则正常阻止；
- 如果当前项目尚无正式 poison runtime，则不要用临时 flag / 假字段制造第二套中毒系统；
- 在 HANDOFF 明确记录：R21 接入 poison 后，Golden Core prerequisite 必须读取同一正式状态。

---

# 十二、金丹准确成功率

R19 必须像 R18 一样展示**准确成功率和主要修正来源**。

建议直接冻结一个简单加法模型，避免隐藏复杂权重：

```text
base = 15%
clamp = 5% ～ 90%
```

建议修正：

### 功法 / 人

- universal：0；
- 属性契合：+6；
- 属性不契合：-12；
- 入门 / 熟练 / 小成 / 大成：0 / +5 / +10 / +15；
- `cultivation:stable`：+4；
- 静心守一：+4；
- active 轻伤：-8。

### 环境

按现有 qiDensity / 连续闭关资格读取：

- none：-15；
- thin：-10；
- low：-6；
- medium：0；
- high：+8；
- 黑风山不稳定环境额外 -6；
- 青云宗访客不能无条件借用核心内峰上佳环境，继续遵守 R18 身份边界。

### 准备

- 抱元丹：+25；
- 投入 200 灵石：+10；
- 投入 400 灵石：+18；
- 已真实存在金丹级 / 高质量结丹指点：+10。

超过 400 普通灵石不继续叠加。

这组参数必须满足 C16 的大致区间：

```text
几乎裸冲：10%～20%
熟练 + 良好环境 + 200 灵石：30%～45%
抱元丹 + 上佳环境 + 充分灵石 + 高质量指点：60%～75% 以上
普通路线最终 cap：90%
```

如果实际组合验证明显偏离区间，只允许在 R19 内小幅调整上述数字，不得另起隐藏公式。

---

# 十三、百年灵参在结丹准备中的边界

C16 只冻结：百年灵参可以降低结丹失败后的伤势压力，**不增加结丹成功率**。

R19 可以提供可选项：

```text
useCenturySpiritGinsengForRecovery
```

如果选择：

- 必须真实拥有并消耗 1 株；
- 不获得 +15 年延寿；
- 不提高 successPercent；
- 只降低本次失败后伤势 / 调养时长，例如把失败伤势恢复日数 ×0.75 后向上取整；
- 不能与“用于延寿”一物两吃。

如果实现此项会迫使引入大规模治疗系统，则可以只做“本次失败产生的 R18 injury recoveryDay 缩短 25%”，不要扩 R21。

---

# 十四、60 日结丹与 RNG 权威顺序

正式顺序：

```text
完整预校验
→ 冻结 preview
→ 原子扣除所选抱元丹 / 灵石 / 百年灵参 / 邪道资源
→ advanceWorldTime(60)
→ 若寿终：寿终优先，资源不返还，不抽突破 RNG
→ success roll
→ 失败才 severity roll
→ extreme 才 death roll
→ 成功 / 失败状态结算
→ 最后处理成功路线附带的永久寿元代价
→ 再做一次寿元判定
```

全部使用现有 seeded RNG；严禁 `Math.random()`。

同一个 state snapshot + 同一个 SessionCommand 必须 replay 到同一 digest。

---

# 十五、结丹失败固定结果

R19 不要再留模糊范围，首版实现用以下确定结果：

## 轻度失败

- 从筑基圆满退回 **筑基后期 80%**：`stage = 3`, `cultivation = 800`；
- 产生 `light` injury，基础恢复 **90 日**；
- 若结丹前消耗百年灵参作恢复准备，恢复日数缩短 25%。

## 严重失败

- 退回 **筑基中期 50%**：`stage = 2`, `cultivation = 500`；
- `severe + meridian` injury，基础恢复 **270 日**；
- 百年灵参准备同样缩短 25%。

## 极端失败

- 极端失败内部 **60% 直接死亡**；
- 存活者退回 **筑基前期 30%**：`stage = 1`, `cultivation = 300`；
- `severe + meridian` injury，基础恢复 **540 日**；
- 百年灵参准备同样缩短 25%。

不添加额外突破 cooldown。伤势恢复并重新修到圆满后可以再次尝试。

建议失败 severity 分布按最终成功率分档：

```text
成功率 >= 65：轻60 / 重32 / 极端8
35～64：      轻45 / 重40 / 极端15
< 35：        轻30 / 重45 / 极端25
```

如果专项测试证明分布在边界上有明显不合理，只可在 R19 内小调，不得引入额外隐藏 risk score。

---

# 十六、普通结丹成功

普通正道 / 散修路线成功：

```text
realm: foundation → golden_core
stage: 0
resources.cultivation: 0
```

然后：

- 基础寿元切换到 450 年；
- 保留已获得 lifespan effects；
- 保留已有 permanent penalties；
- 写 1 条 major Chronicle；
- 金丹是首版境界上限，不继续自动修炼。

不得自动发：

- 新装备；
- 新宗门身份；
- 元婴传承；
- 灵石；
- “结丹礼包”。

---

# 十七、邪道妖丹凝煞路线

只有当前主修为：

```text
《阴髓录·凝煞篇》
```

才允许选择邪道替代准备。

最低消耗：

- 1 × 完整二阶妖丹；
- 1 × 高品质妖兽精血；
- 仍可选择 0 / 200 / 400 灵石；
- 不使用抱元丹。

环境 / 功法 / 熟练 / 伤势 / 指点仍正常参与成功率。

严重 / 极端失败风险必须高于同等普通路线。首版不要另造一套全新成功率公式；可以：

- 成功率继续使用同一个 preview；
- severity 分布在最终抽失败时向严重 / 极端各偏移一个小档。

具体偏移必须写入测试并在 HANDOFF 记录。

### 成功后的永久代价

邪道路线成功进入金丹后记录：

```text
lifespan_penalty:evil_core_success = -20 年
```

只结算一次。

如果之前转入凝煞篇已有 -10 年，则金丹后共 -30 年。

顺序必须是：

```text
先切换金丹基础寿元 450
→ 再写 -20 年永久代价
→ 重新检查寿元
```

这样不会把“成功结丹”错误地先按筑基 220 年上限判死。

---

# 十八、SessionCommand

至少新增：

```text
use-lifespan-item
attempt-golden-core-breakthrough
```

如果高阶主修转入仍能复用现有 `change-main-technique`，不要重复造第二个改修命令；只扩展 resolver 对 realm support 与永久寿元代价的处理。

全部必须经过：

```text
SessionCommand
→ resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

`pendingResult` 时继续阻止新的正式修炼 / 延寿 / 结丹命令。

---

# 十九、UI

## CultivationPanel

筑基后：

- 没有合格筑基后主修时明确显示“当前主修不足以继续筑基阶段修炼”；
- 如果 known 中真实有 C19 三门，可按现有规则选择 / 改修；
- 合格主修下重新显示 1 / 3 / 10 / 30 日修炼；
- 筑基圆满 100% 后停止普通修炼，出现结丹准备入口。

## Lifespan

- 常驻简洁显示年龄 / 当前有效最大寿元；
- 有 bonus / penalty 时允许显示拆分来源；
- 延寿物只在真实拥有时给“用于延寿”操作；
- 已生效同类必须在点击前显示不再生效。

## Golden Core panel

至少显示：

- 当前主修 / 熟练度；
- 当前地点；
- 固定 60 日；
- 当前准确成功率；
- 每个主要 modifier；
- 抱元丹是否真实拥有；
- 0 / 200 / 400 灵石；
- 百年灵参恢复准备（如果拥有）；
- 邪道路线真实资源（仅凝煞篇）；
- 失败风险文字；
- 当前寿元是否足以覆盖 60 日。

不要做炼丹炉、结丹动画、技能树或高阶宗门 UI。

---

# 二十、测试

R19 专项至少覆盖：

## 寿元

- 80 / 120 / 220 / 450 基础值；
- 金丹不再 null；
- 119/120 → 120/120 当天寿终；
- 突破替换基础寿元但不重置年龄；
- lifespan bonus 跨境界保留；
- permanent penalty 跨境界保留；
- penalty 结算后若超龄立即寿终；
- 无 empty lifespan runtime 的旧状态仍合法。

## 延寿物

- 三个 item 数据完整；
- +10 / +15 / +30；
- 三种可叠加 = +55；
- 同 effect key 第二次被拒且不消耗；
- 百年灵参用于延寿与结丹恢复不能同时结算；
- 死亡后不能使用；
- save / load 深拷贝；
- replay digest 稳定。

## 高阶功法 / 筑基修炼

- 三门 exact baseEfficiency；
- 低阶主修不能继续 Foundation；
- 未知高阶功法不能选；
- R19 不自动赠送；
- Foundation stage 1→2→3→4；
- stage4 100% 停止普通修炼；
- 伤势继续复用 R18；
- 主修熟练继续增长；
- `阴髓录·凝煞篇` 首次转入 -10，一生只一次；
- 转出 / 转回不返还也不重复扣。

## 金丹

- 前置条件；
- 60 日；
- 0 / 200 / 400 灵石校验；
- 抱元丹真实拥有 / 原子消耗；
- 准确 successPercent；
- 90% 上限；
- 自然寿终优先于 RNG；
- seeded 成功；
- 轻 / 重 / 极端存活 / 极端死亡；
- 百年灵参恢复缩短；
- 成功 realm / stage / cultivation；
- 450 年寿元；
- 邪道资源真实消耗；
- 邪道失败分布更危险；
- 邪道成功 -20；
- 与凝煞篇 -10 可叠加 -30；
- 成功后不赠任何无关奖励；
- Session `RESULT_PENDING`；
- save / reload；
- replay。

## 回归

R05～R18 现有测试全部保持；尤其：

- R16 旧 cultivate replay；
- R17 technique initialization / change main replay；
- R18 foundation breakthrough replay；
- legacy breakthrough；
- inventory / equipment / secret realm。

---

# 二十一、完成标准

本轮只有满足以下条件才能标记 R19 完成：

1. 寿元 80 / 120 / 220 / 450 真正统一；
2. 玩家看得到准确年龄 / 寿元；
3. 三种延寿物可以真实使用；
4. 同 effect family 无法重复刷寿元；
5. permanent lifespan penalties 有唯一 authoritative state；
6. 筑基阶段可以在真实高阶主修下继续修炼到圆满；
7. 低阶功法不能无条件修到金丹；
8. 60 日结丹有准确成功率、资源消耗、失败分级与真实死亡；
9. 邪道妖丹凝煞路线与 -10 / -20 寿元代价真实存在；
10. 金丹成功后基础寿元 450、首版境界封顶；
11. save / load / replay / digest 稳定；
12. `npm run typecheck` 通过；
13. `npm test` 通过；
14. `npm run build` 通过；
15. 更新 `HANDOFF.md`；
16. 把 `CURRENT_TASK.md` 切换到 **C20｜战斗 / 装备数值冻结**；
17. **停止，不得开始 C20。**

---

# 二十二、明确禁止

- 不实现 R20 战斗；
- 不冻结 / 猜装备具体品阶；
- 不实现 R21 完整伤势治疗 / 中毒系统；
- 不实现 R22 妖兽掉落；
- 不实现宗门贡献 / 内门晋升；
- 不实现青霞坊完整商店；
- 不实现拍卖行；
- 不生成延寿物获取事件；
- 不增加第二秘境；
- 不增加重大机缘池；
- 不增加元婴；
- 不增加雷劫；
- 不增加复活；
- 不改造整个 GameState 架构；
- 不用 flags 复制一套 lifespan truth；
- 不为了新功能破坏 R05～R18 replay digest。
