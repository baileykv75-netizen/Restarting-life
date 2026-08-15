# 当前任务：V2 R17 - 功法系统

## 本轮唯一目标

在 R16 已有正式基础修炼之上，补齐首版功法的**结构、分类、熟练度与改修成本**，使同一套修炼状态可以继续承载：

```text
已真实掌握的功法
→ 一门当前主修
→ 多门已知辅修 / 战斗术法
→ 熟练度：入门 → 熟练 → 小成 → 大成
→ 修炼 / 专门练习推动熟练
→ 改修另一门已知主修时承担真实时间与适应成本
```

本轮只做功法系统本身。

**不实现 R18 炼气→筑基突破，不使用凝基丹 / 破障丹，不做 R19 金丹，不做商店、宗门传功、拜师、遗迹掉落或杀人夺宝的完整获取玩法，不做正式战斗。**

---

# 一、必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md` 的主修 / 辅修 / 改修 / 功法熟练规则
3. `V2_CONTENT_BIBLE.md` 第 16、35 节
4. `HANDOFF.md` 的 R16
5. `V2_GITHUB_ROADMAP.md` 的 R17 / R18
6. `src/data/techniques.ts`
7. `src/core/cultivationEngine.ts`
8. `src/types/game.ts`
9. `src/core/sessionEngine.ts`

若 R17 与 R16 的 optional cultivation 字段发生冲突，优先做最小兼容扩展，禁止另起 `TechniqueStateV2` 或第二套修炼 store。

---

# 二、最重要的内容边界：R17 不负责凭空发功法

R07 / R16 已经严格区分：

- 真正学到功法；
- 只有宗门 / 坊市 / 修士门路。

R17 必须继续保持这一点。

## 允许

- 已经存在于 `knownTechniqueIds` 的功法进入熟练度系统；
- 未来真实地点 / NPC / 宗门 / 战利品 resolver 可以调用统一“学会功法”能力；
- 测试可以构造“已经真实掌握两门功法”的 state 来验证改修。

## 禁止

- UI 出现“免费学习《赤阳诀》”用于演示；
- 因为到了青霞坊就自动获得坊市全部功法；
- 因为加入 `knownTechniqueIds` 方便测试，就反向把测试 fixture 当世界设定；
- 给尚未冻结具体来源 / 价格的功法临时编商店货架；
- 把普通 `adult_access_seed` 当成已学功法。

### 当前获取来源的处理

本轮不新增完整获取玩法。

如果为了后续统一接口需要 `learn-technique` resolver / engine function，可以实现为**内部正式能力**，但必须由调用者提供已经成立的世界来源事实；R17 UI 本身不得提供无来源学习按钮。

---

# 三、继续使用唯一 cultivation 状态

R16 已有：

```ts
cultivation: {
  realm
  stage
  practiceInitialized?: true
  knownTechniqueIds?: string[]
  mainTechniqueId?: string | null
}
```

R17 只能在这里最小扩展，例如：

```ts
interface TechniquePracticeState {
  proficiencyPoints: number
}

cultivation: {
  ...
  auxiliaryTechniqueIds?: string[]
  techniquePractice?: Record<string, TechniquePracticeState>
}
```

要求：

- 不另建长期 `techniques` store；
- `knownTechniqueIds` 仍是角色真正掌握功法的唯一列表；
- `mainTechniqueId` 仍是唯一主修；
- `auxiliaryTechniqueIds` 只是对 known 的角色使用分类 / 配置，不代表第二库存；
- `techniquePractice` 只保存角色实践状态，不复制静态 TechniqueDefinition；
- 老 R05～R16 state 没有这些 optional 字段仍合法；
- R17 初始化 / normalization 不得给旧 replay 被动塞空对象。

---

# 四、TechniqueDefinition 正式分类

在 R16 `src/data/techniques.ts` 上扩展，不新建第二张功法表。

至少支持：

```ts
type TechniqueCategory =
  | 'main'
  | 'combat'
  | 'movement'
  | 'body'
  | 'secret'
```

字段可最小扩展：

```ts
category
moves?: readonly TechniqueMoveDefinition[]
ruleTags
```

主修才拥有 R16 修炼效率相关字段。

`select-main-technique` 从 R17 起必须校验：

```text
category === main
```

不能把《青锋剑诀》或《轻身术》选成主修吐纳法。

---

# 五、本轮允许数据化的已有内容

只允许使用 Content Bible 第 16 节已经存在的名称与招式，不扩几十门功法。

## 1. R16 六门主修继续保留

1. 《小周天吐纳法》
2. 《青元引气诀》
3. 《春木养元功》
4. 《赤阳诀》
5. 《寒水经》
6. 《厚土养气篇》

这六门继续是当前 R16 可执行修炼定义。

### 暂不随意补数值的主修

Content Bible 还已有：

- 《庚金锐气诀》；
- 《风行吐纳篇》；
- 《雷引诀》；
- 《阴髓录》残篇。

R17 可以把它们登记成正式 main category / 内容 registry，但**如果 R16 计算所需的精确 baseEfficiency 仍未冻结，不得自行猜一组效率数字并让它们进入实际修炼。**

可以标记为尚未接入基础效率 / acquisition，等真正获得与使用前补齐必要平衡锚点。

## 2. 已冻结战斗术法

允许数据化：

### 《青锋剑诀》

- 刺；
- 斩；
- 御剑追击（小成后）。

### 《赤焰术》

- 火弹；
- 炎爆。

### 《缚藤术》

- 缠束；
- 荆刺。

### 《水幕术》

- 短时防御 / 减伤动作。

### 《石甲术》

- 护体动作，正式战斗效果 R20 再接。

### 《金芒诀》

- 穿透型远程动作。

要求：

- moves 只记录已冻结名字、解锁要求和 future hook；
- R17 不计算伤害 / 灵力消耗 / 冷却；
- R20 再让招式真正进入战斗。

## 3. 身法 / 炼体 / 秘术

可以登记已有：

- 《轻身术》；
- 《流云步》；
- 《踏风行》；
- 《伏岳锻体篇》；
- 《铁衣功》；
- 《燃血诀》。

R17 只建立分类与熟练结构；未冻结的具体战斗数值不在本轮编造。

---

# 六、熟练度四阶段

玩家可见阶段固定沿用设计真源：

```text
入门 → 熟练 → 小成 → 大成
```

## 1. 状态语义

内部只保存整数 `proficiencyPoints`；阶段由纯函数派生，不把 stage 和 points 两份真源同时写存档。

建议第一版阈值：

```text
0      → 入门
1000   → 熟练
3000   → 小成
6000   → 大成
```

这是实现平衡锚点，不是世界中的“经验等级”；UI 不显示 `1734 / 6000 XP`。

玩家只看到当前阶段，可在详情中看到“距离下一阶段尚需一段练习”或等价自然描述，不显示技能树。

## 2. 主修熟练增长

R16 `cultivate-days` 成功完成后：

```text
当前 mainTechniqueId
→ 增加与真实修炼天数对应的 proficiencyPoints
```

建议基础：

```text
20 点 / 修炼日
```

`举一反三 / quick_study` 对功法理解职责明确，可以在 R17 对主修 / 新功法练习提供：

```text
×1.15 熟练增长
```

但不得反过来直接给 R16 修为点额外加速；修为效率与功法熟练是两个不同结果。

达到阈值自然提升阶段，不需要额外按钮。

## 3. 招式解锁

R17 只处理已经在 Content Bible 明确的阶段门槛。

目前明确：

- 《青锋剑诀》“御剑追击”需要小成。

其余招式若 Content Bible 没写阶段，不得为了填 2～4 招给它们临时加“大成绝招”。

R17 UI 可以显示：

```text
刺 · 可用
斩 · 可用
御剑追击 · 小成后掌握
```

但 R20 前没有“施放”按钮。

---

# 七、辅修 / 专门练习

R17 必须允许角色拥有多门非主修功法，但不能把所有 known 都自动当成“已配置辅修”。

允许：

```text
set-auxiliary-technique(techniqueId, enabled)
```

或等价命令。

规则：

- 只能配置 `knownTechniqueIds` 中的非 main category；
- 主修不能同时作为 auxiliary；
- 不做复杂辅修槽位数量 / 套装；
- 首版可以允许多门辅修，但 UI 保持轻量列表；
- 配置本身不消耗时间。

### 专门练习

为已知 combat / movement / body / secret 功法提供：

```text
practice-technique-days(techniqueId, 1 | 3 | 10 | 30)
```

要求：

- 推进唯一 worldDay；
- 不增加 `resources.cultivation`；
- 只增长该功法 proficiency；
- 使用 R17 同一个熟练增长纯函数；
- 寿终途中死亡优先，不结算熟练；
- active secret realm / pending event / pending result 时不可练；
- 普通练功不逐次污染 Chronicle。

不做木桩小游戏或挂机。

---

# 八、主修改修成本

R16 第一次选择主修免费，是为了完成首次入道。

R17 起，若已经存在 `mainTechniqueId`，再次切到另一门已知 main technique 必须走正式改修 resolver，不能继续用 R16 的零成本换引用。

## 1. 成本原则

只体现设计真源已经冻结的：

> 灵力转化 + 经脉调整 + 适应时间；性质差异越大，代价越高。

第一版不做复杂经脉模拟。

建议分三档：

### 相近 / 通用转通用

例如普通通用吐纳法之间：

```text
3 日适应
损失当前小阶段修为的 5%
```

### 通用 ↔ 属性契合，或同属性体系

```text
7 日适应
损失当前小阶段修为的 10%
```

### 明显不同属性 / 正常体系 ↔ 邪道体系

```text
14 日适应
损失当前小阶段修为的 20%
```

这里的百分比只作用于**当前小阶段 `resources.cultivation`**，不会直接掉境界 / 掉炼气层数。

实际损失：

```text
floor(currentCultivationPoints × ratio)
```

## 2. 举一反三

`quick_study` 的职责包含转修适应，因此正式改修时：

- 适应时间减少约 20%，向上取整；
- 修为损失不减少，避免一个天赋同时吃掉全部代价。

## 3. 邪道特殊永久代价

C16 已冻结《阴髓录·凝煞篇》的寿元代价，但那是筑基后正式邪道延续；R17 不提前执行筑基后的永久减寿规则。

《阴髓录》残篇作为低阶邪修主修未来接入时，如果缺少精确低阶转修代价，本轮不得自行复制“减 10 年”到炼气残篇。

## 4. 结果透明

改修按钮执行前必须展示：

- 目标功法；
- 需要适应多少日；
- 当前小阶段修为预计损失多少；
- 不显示未来隐藏事件概率。

执行后自然写结果卡，不逐次写 Chronicle；如果改修本身未来触发重大身份 / 邪修事实，再由对应内容轮记录。

---

# 九、SessionCommand / replay

建议新增：

```text
change-main-technique(techniqueId)
set-auxiliary-technique(techniqueId, enabled)
practice-technique-days(techniqueId, days)
```

如实现统一内部学习能力，可使用：

```text
learn-technique(techniqueId, sourceFact)
```

但 R17 UI 不暴露无来源学习。

全部继续：

```text
SessionCommand
→ technique / cultivation resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

要求：

- 不使用 RNG；
- 不修改无关 inventory / equipment / knowledge / relations；
- 需要耗时的改修 / 专门练习复用唯一 worldDay / natural death；
- pending result 必须先确认，不得静默吞结果。

---

# 十、UI

在 R16 `CultivationPanel` 上扩展，不新做一套大而复杂的“技能树页面”。

至少显示：

## 主修

```text
《青元引气诀》
熟练度：熟练
当前主修
```

如果真实已知第二门主修，才显示“改修”操作与成本预览。

## 辅修 / 战斗术法

真实已知才出现，例如：

```text
《青锋剑诀》 · 小成
刺
斩
御剑追击
```

未学会的功法不出现在“我的功法”列表中。

可以另有克制的“已知功法详情”区域展示静态描述，但不得把整个 Content Bible 功法池伪装成可学习列表。

禁止：

- 技能树；
- 技能点；
- 功法抽卡；
- SSR 稀有度；
- 综合战力；
- “推荐主修”；
- 未冻结伤害数字；
- R20 前的招式施放按钮；
- 无来源学习按钮。

---

# 十一、与 R16 的兼容要求

1. 不删除 `adultEntry.resolved` 后才 bootstrap cultivation 的时序保护；
2. R16 六门主修继续正常修炼；
3. R16 只有一门功法的普通人生不因为 R17 被强塞第二门；
4. R16 `cultivate-days` 继续使用原修为公式，只额外增长主修熟练；
5. R16 引气入体 / 炼气 1～9 / 九层封顶不能回归；
6. legacy `performBasicCultivation()` 继续只为旧档兼容，不扩张；
7. R05～R16 旧状态没有 `techniquePractice / auxiliaryTechniqueIds` 时仍合法。

---

# 十二、必须测试

至少覆盖：

1. R16 老状态没有 R17 optional 字段仍合法；
2. `knownTechniqueIds` 仍是唯一“已学”真源；
3. 非 known 功法不能配置 / 改修 / 专门练习；
4. 非 main category 不能设为主修；
5. main category 不能作为 auxiliary；
6. 多门非主修可配置且不复制 known；
7. 熟练阶段准确派生为入门 / 熟练 / 小成 / 大成；
8. 不把 proficiency stage 冗余存入 GameState；
9. 1 / 3 / 10 / 30 日主修修炼同时增加修为与主修熟练；
10. quick_study 只加熟练 / 转修适应，不偷偷加 R16 修为；
11. 专门练习只增对应熟练，不增 cultivation；
12. 专门练习正确推进 worldDay；
13. 寿终途中不结算熟练；
14. 青锋剑诀小成前后的御剑追击门槛正确；
15. 未冻结阶段要求的招式不会自行生成门槛；
16. 第一次主修选择仍按 R16 免费；
17. 已有主修后改修必须走成本 resolver；
18. 三档改修时间 / 当前小阶段修为损失正确；
19. quick_study 改修时间减免正确；
20. 改修不会掉炼气层数 / 境界；
21. pending result 阻止新的改修 / 练功；
22. active secret realm 阻止练功；
23. 无真实来源的功法不会因 R17 bootstrap 自动进入 known；
24. R07 access-only 路线仍然不送功法；
25. save / reload 深拷贝 techniquePractice / auxiliary list；
26. Session replay digest 稳定；
27. R13 / R14 / R15 / R16 测试继续通过；
28. UI 不出现技能树 / 推荐 / 战力 / 无来源学习 / R20 招式施放；
29. `npm run typecheck` 通过；
30. `npm test` 通过；
31. `npm run build` 通过。

---

# 十三、本轮允许修改

- `src/types/game.ts`
- `src/types/command.ts`
- `src/data/techniques.ts`
- `src/core/cultivationEngine.ts`
- 可新增最小 `techniqueEngine.ts`（如果职责拆分明显更清楚）
- `src/core/sessionEngine.ts`
- persistence clone / normalize 的最小兼容修改
- `src/components/CultivationPanel.tsx`
- 对应 CSS
- R17 tests
- `HANDOFF.md`
- R17 成功后再修改 `CURRENT_TASK.md`

修改其它文件必须是完成 R17 的最小必要依赖。

---

# 十四、本轮禁止

- 不做 R18 筑基；
- 不用凝基丹 / 破障丹突破；
- 不做筑基失败伤势；
- 不做 R19 金丹 / 抱元丹 / 延寿物；
- 不做正式战斗；
- 不计算招式伤害；
- 不做丹药 / 符箓战斗使用；
- 不做商店；
- 不做完整宗门传功页面；
- 不做拜师系统；
- 不做遗迹随机掉完整功法；
- 不做杀人夺宝系统；
- 不新增几十门功法；
- 不为剩余高阶 / 特殊主修乱填未冻结 baseEfficiency；
- 不做技能树；
- 不做装备具体品阶；
- 不补延寿物；
- 不补随机子地点正式模板；
- 不补重大机缘 / 普通事件正文；
- 不接 LLM API；
- 不扩 legacy ActionPanel。

---

# 十五、验收标准

1. R16 已知功法能拥有真实熟练度，并随真实练习增长；
2. 熟练度四阶段正常派生，青锋剑诀已冻结的小成招式门槛可以表达；
3. 已真实掌握多门主修时可以改修，并承担明确时间 / 当前阶段修为成本；
4. 已知非主修可进入辅修 / 专门练习状态；
5. 没有真实来源的功法不会被 R17 自动发给玩家；
6. R16 修为 / 引气 / 炼气九层封顶行为不回归；
7. save / reload / replay 稳定；
8. legacy 行为不扩张；
9. typecheck / test / build 全通过；
10. 更新 `HANDOFF.md`；
11. 成功后再把 `CURRENT_TASK.md` 切到 R18，并立即停下。
