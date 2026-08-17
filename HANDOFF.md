# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R19「寿元 / 延寿 / 筑基后修炼 / 金丹」已完成；下一轮进入 C20「战斗 / 装备数值冻结」。**
- R00.1～R00.3：迁移、V3 存档、开发纪律完成。
- R01：唯一 `GameState` 完成。
- R02：统一 `GameAction / SessionCommand / reducer / replay` 边界完成。
- R03：V3 单档自动保存 / 恢复完成。
- R04：V2 Game Shell 完成。
- C00：`V2_CONTENT_BIBLE.md` 成为首版具体内容真源。
- R05：出生三选一完成。
- R06：8 出身 × 2 童年关键节点完成。
- R07：成年 / 入道入口完成。
- R08：固定世界骨架完成。
- R09：地点知识 `Unknown → Rumored → Discovered` 完成。
- R10：节点旅行、路线时间与快速前往完成。
- R11：三块 wilderness 区域探索完成。
- R12：每世有限 seeded 子地点完成。
- C13 / R13：首版第一秘境「沉脉石室」内容与最小闭环完成。
- R14：正式背包、容量、堆叠、丢弃、储物袋完成。
- R15：四槽装备、装备 / 卸下、阶 + 品结构完成。
- C16：炼气、筑基、结丹与三条筑基后主修内容冻结完成。
- R16：基础修炼、引气入体、炼气 1～9 层完成。
- R17：主修 / 辅修、熟练度、专门练习、改修成本完成。
- R18：正式 injury runtime、炼气→筑基突破完成。
- C19：寿元、3 个延寿物、三门筑基后主修最低执行数值完成。
- **R19：正式 lifespan runtime、延寿物使用、筑基后修炼、60 日结丹、金丹寿元与邪道结丹完成。**
- legacy Action/Event/Result/End 仍只为旧档 / 旧测试 / 迁移兼容保留，不得继续扩张。

---

# 一、当前唯一状态与调度纪律

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

禁止：

- React 直接改核心状态；
- 页面直接写 localStorage；
- 第二套 GameState / inventory / injury / lifespan truth；
- implementation round 临时编造未冻结世界内容；
- 为新功能破坏 R05～R19 replay 语义。

---

# 二、R19｜寿元 authoritative state

新增 optional：

```ts
state.lifespan?: {
  appliedEffectKeys: string[]
  permanentPenaltyKeys: string[]
}
```

规则：

- R05～R18 旧状态没有 `lifespan` 仍合法；
- 不在 `createInitialGameState()` 里塞空 lifespan；
- 只有真实延寿或永久减寿发生时才 materialize；
- `saveRepository` 深拷贝两个 key 数组；
- 不存第二个 `effectiveMaxYears` 真源。

静态基础寿元：

| 大境界 | 基础最大寿元 |
|---|---:|
| 凡人 | 80 年 |
| 炼气 | 120 年 |
| 筑基 | 220 年 |
| 金丹 | 450 年 |

统一公式：

```text
有效最大寿元
= 当前大境界基础最大寿元
+ 已生效延寿 effect 总和
- 永久寿元 penalty 总和
```

特点：

- 小境界不自动续命；
- 大境界突破只替换基础寿元；
- 当前年龄不重置；
- 延寿与永久减寿跨境界保留；
- 达到有效最大寿元当天真实寿终；
- 新永久减寿使当前年龄已经 >= 新上限时，当场寿终；
- 金丹不再是 `null / 无限寿元`。

UI 常驻显示：

```text
年龄
境界
寿元：当前年龄 / 当前有效最大寿元
寿元拆分：基础 / 延寿 bonus / 永久 penalty
灵石
```

---

# 三、R19｜三种延寿物

正式数据进入 item registry：

```text
延元丹｜二阶下品｜+10 年
key: lifespan_effect:yanyuan_dan

百年灵参｜二阶中品｜+15 年
key: lifespan_effect:century_spirit_ginseng

黑风地髓｜二阶上品｜+30 年
key: lifespan_effect:blackwind_earth_marrow
```

规则：

- 三种独立 effect 可叠加，总计 +55 年；
- 同 effect family 对同一角色只生效一次；
- 第二次尝试会在消费前拒绝，物品不扣；
- 死亡后不能使用延寿物；
- 背包真实持有时才出现“用于延寿”操作；
- 已生效同类在 UI 预先说明“不会继续增加寿元”；
- R19 没有实现这些物品如何获得；来源仍由后续真实交易 / 机缘 / 世界内容负责。

### 百年灵参的真实资源取舍

R19 正式落实：

- 作为延寿物：消耗 1 株，+15 年；
- 作为结丹恢复准备：消耗同一真实 inventory item，只缩短本次失败后的恢复期；
- 两种用途不能同一株同时结算。

---

# 四、R19｜筑基后主修

C19 三门高阶主修已进入正式 technique registry：

| 功法 | baseEfficiency | universal | preferredElements | realm |
|---|---:|---|---|---|
| 《青元归真经》 | 1.05 | true | 无 | foundation |
| 《归元守一篇》 | 1.00 | true | 无 | foundation |
| 《阴髓录·凝煞篇》 | 1.10 | false | water / ice | foundation |

均含正式结丹能力 hook。

低阶主修继续只支持 `mortal / qi`；低阶吐纳法不能无条件修到金丹。

R19 **没有自动发放**以上三门高阶功法：

- `knownTechniqueIds` 仍是唯一真实已学真源；
- 没学会就不能在 UI 凭空选择；
- 获取渠道继续等宗门 / 交易 / 遗迹 / 战利品等真实系统接入。

### 凝煞篇免费进入漏洞已封闭

`resolveMainTechniqueSelection()` 不允许在“空主修”状态直接免费把《阴髓录·凝煞篇》设为主修；凝煞篇必须走已有 `change-main-technique` 的正式改修路径。

因此第一次真实转入会：

```text
适应 / 改修成本
+ lifespan_penalty:yinsui_ningcha_entry
= 永久 -10 年
```

转出 / 转回：

- 不返还 -10 年；
- 不重复扣第二次。

自然 R18 筑基流程本身会保留原炼气主修，所以正常人生不会出现必须依靠空主修才能进入凝煞篇的情况。

---

# 五、R19｜筑基阶段修炼

正式继续复用 `resolveCultivateDays()`，没有建立第二套 cultivation engine。

支持：

```text
筑基前期 stage 1
→ 筑基中期 stage 2
→ 筑基后期 stage 3
→ 筑基圆满 stage 4
```

每一阶段仍用：

```text
resources.cultivation: 0～1000
```

推进：

- 每阶段满 1000 后进入下一阶段；
- stage 4 达到 1000 后普通修炼硬停；
- 出现结丹准备入口。

继续读取：

- 灵根；
- 主修；
- 地点灵气；
- 天赋；
- 体质；
- R18 伤势；
- 主修熟练度；
- worldDay。

筑基统一 realm factor：

```text
0.75
```

伤势：

- active light：修炼 ×0.90；
- active severe / meridian：阻止普通修炼；
- 继续使用 R18 injury truth，不新增第二套状态。

主修熟练仍会随真实闭关增长。

金丹为首版修炼上限，普通修炼停止。

---

# 六、R19｜60 日结丹

新增 SessionCommand：

```text
attempt-golden-core-breakthrough
```

标准前置：

- playing / adult；
- 筑基圆满 stage 4；
- 当前修为恰好 1000；
- 主修真实已知；
- 主修拥有完整结丹段；
- 无 active severe / meridian injury；
- 不在 active secret realm；
- 无 pending event / result；
- 当前地点合法；
- 万兽岭若无稳定闭关据点则阻止。

轻伤不硬锁，只形成 -8%。

固定耗时：

```text
60 日
```

### 普通成功率

```text
successPercent = clamp(5, 90, 15 + modifiers)
```

修正：

```text
通用主修                   0
属性契合                  +6
属性不契合                -12

入门 / 熟练 / 小成 / 大成 0 / +5 / +10 / +15
稳定主修                  +4
静心守一                  +4
轻伤                      -8

none / thin / low / medium / high
-15 / -10 / -6 / 0 / +8

黑风山紊乱                额外 -6
青云宗非本宗访客 high      按 medium

抱元丹                    +25
200 灵石                  +10
400 灵石                  +18
breakthrough_guidance:golden_core +10
```

超过 400 普通灵石不继续堆成功率。

UI 显示最终准确百分比和每个 modifier，包括 0%。

---

# 七、R19｜结丹资源

普通路线可选择：

```text
抱元丹
0 / 200 / 400 下品灵石
百年灵参（只作为失败恢复准备）
```

所有资源必须真实在背包 / resources 中存在。

R19 只登记：

```text
baoyuan_dan
complete_second_tier_beast_core
high_grade_beast_essence
```

这些只是已有 C16 / C19 内容的 formal item entry；R19 没有实现商店、掉落、贡献兑换或获取事件。

### 原子顺序

```text
完整预校验
→ 冻结 preview
→ 原子扣所选丹药 / 材料 / 灵石
→ advanceWorldTime(60)
→ 若寿终：资源不返还，且不抽 RNG
→ success roll
→ 失败才 severity roll
→ extreme 才 death roll
```

同 snapshot + 同 SessionCommand 保持确定性。

---

# 八、R19｜普通结丹失败

失败严重度：

```text
成功率 >= 65：轻 60 / 重 32 / 极端 8
成功率 35～64：轻 45 / 重 40 / 极端 15
成功率 < 35：轻 30 / 重 45 / 极端 25
```

极端失败内部：

```text
60% 直接死亡
```

死亡理由：

```text
结丹反噬，丹田崩裂
```

存活后果固定：

```text
轻败：stage 3，cultivation 800，light injury 90 日
重败：stage 2，cultivation 500，severe + meridian 270 日
极端存活：stage 1，cultivation 300，severe + meridian 540 日
```

百年灵参作为本次恢复准备时：

```text
恢复时间 ×0.75，向上取整

90 → 68 日
270 → 203 日
540 → 405 日
```

它不增加结丹成功率。

---

# 九、R19｜邪道妖丹凝煞

仅《阴髓录·凝煞篇》可以选择额外的：

```text
妖丹凝煞
```

真实消耗：

```text
1 × 完整二阶妖丹
1 × 高品质妖兽精血
```

不能同时使用抱元丹。

仍可：

- 投入 0 / 200 / 400 灵石；
- 使用百年灵参作为失败恢复准备；
- 读取熟练度、灵根、环境、伤势、指点。

成功率 preview 与同条件普通路线保持同一套加法公式；邪道差异主要落在更危险的失败分布与永久寿元代价。

### 邪道失败分布偏移

R19 最终冻结为：

```text
普通失败权重
→ light -10
→ severe +5
→ extreme +5
```

所以：

```text
成功率 >= 65：50 / 37 / 13
成功率 35～64：35 / 45 / 20
成功率 < 35：20 / 50 / 30
```

R19 专项测试锁定了这一差异：同一 severity roll 在边界区间会从普通路线的轻败变为邪道路线上重败，或从普通重败变为邪道极端失败。

### 邪道成功永久代价

成功顺序：

```text
先切 realm = golden_core
→ 基础寿元切为 450
→ cultivation = 0
→ 再记录 lifespan_penalty:evil_core_success
→ 永久 -20 年
→ 重新检查寿元
```

如果此前已经首次转入凝煞篇承担 -10：

```text
总永久 penalty = -30 年
```

例如没有其他延寿时：

```text
金丹有效最大寿元 = 450 - 30 = 420 年
```

---

# 十、R19｜金丹成功

成功只做：

```text
realm: golden_core
stage: 0
resources.cultivation: 0
基础最大寿元：450
写入 major Chronicle
```

不会自动：

- 赠送新功法；
- 晋升宗门身份；
- 发装备；
- 发灵石；
- 发丹药；
- 开元婴；
- 触发常规雷劫。

金丹是首版修炼上限。

---

# 十一、R19｜Session / save / replay

新命令：

```text
use-lifespan-item
attempt-golden-core-breakthrough
```

正式 effect types：

```text
lifespan:use-item
cultivation:golden-core-breakthrough
```

继续走：

```text
SessionCommand
→ resolver
→ GameState
→ debug log / digest
→ replay
→ PersistentGame
→ auto-save
```

`pendingResult` 时继续拒绝：

- 正式修炼；
- 延寿使用；
- 结丹；
- 调养等同类正式行动。

专项测试验证同一 snapshot + 同一命令得到相同 digest。

---

# 十二、R19 UI

### GameStatusBar

常驻：

- 准确年龄；
- 境界；
- `年龄 / 有效最大寿元`；
- 基础 / 延寿 / penalty 拆分；
- 灵石。

### InventoryPanel

真实拥有延寿物时：

```text
用于延寿 +10 / +15 / +30 年
```

已生效同 family：

```text
延寿已生效
这一类延寿效果已经生效，再使用不会继续增加寿元。
```

没有物品来源假按钮。

### CultivationPanel

筑基期：

- 高阶主修真实已知才可选择 / 改修；
- 合格主修恢复 1 / 3 / 10 / 30 日修炼；
- 低阶主修明确显示“不足以继续筑基阶段修炼”；
- 筑基圆满停止普通修炼；
- 凝煞篇改修预览显示 -10 年与结算后寿元。

### GoldenCoreBreakthroughPanel

显示：

- 当前主修；
- 熟练度；
- 地点；
- 60 日；
- 准确成功率；
- 所有主要修正；
- 抱元丹持有；
- 0 / 200 / 400 灵石；
- 百年灵参恢复准备；
- 凝煞篇下的普通 / 妖丹凝煞路线；
- 妖丹 / 精血真实持有；
- -20 年警告；
- 失败风险；
- 当前剩余寿元不足 60 日时明确警告。

---

# 十三、R19 测试与 CI

R19 专项覆盖：

- 80 / 120 / 220 / 450；
- 旧状态无 lifespan 仍合法；
- exact lifespan boundary death；
- bonus / penalty 跨境界；
- penalty 造成超龄立即寿终；
- 3 种延寿物 +10 / +15 / +30 与总 +55；
- 同 family 第二次拒绝且不消耗；
- 死亡后不能使用；
- lifespan save 深拷贝；
- 三门高阶功法 exact efficiency；
- pending 低阶功法未被顺手补数值；
- 低阶主修不能继续 Foundation；
- Foundation 1→2→3→4；
- stage 4 100% hard stop；
- injury reuse；
- 主修熟练继续增长；
- 凝煞篇 -10 只一次；
- 结丹准确成功率 / 90% 上限；
- 60 日；
- 资源真实消耗；
- 寿终先于 RNG；
- seeded success；
- light / severe / extreme survive / extreme death；
- 百年灵参只缩恢复；
- Gold 450；
- 邪道资源；
- 邪道更危险的失败权重；
- 邪道成功 -20；
- -10 / -20 叠加；
- Session `RESULT_PENDING`；
- Session digest 确定性；
- R05～R18 既有测试继续通过。

### CI 过程

第一版底层提交：

```text
35a4994fbdf7b7cbab7cf9bee23040d527c08c0b
```

第一次 CI：

```text
run 31989163671
verify 95269394909
Typecheck ❌
```

只发现 R19 类型问题：

- 百年灵参 quality enum 写成 `medium`，应为 `mid`；
- 结丹地点 `string | null` 窄化不足。

修复提交：

```text
e6d2942063bfc5fef0b4aa7257623c7fa1e92ee5
9900ad67a863a73a9f301f97b06e8d546f99cc7d
```

底层修复 CI：

```text
run 31989277891
Typecheck ✅
Test ✅
Build ✅
```

最终可玩 UI + 完整验收提交：

```text
b647ae9ca5304a5c7e3a5826515dc1cb3cb87b14
```

最终 R19 功能 CI：

```text
run 31989967095
verify 95271638536
Typecheck ✅
Test ✅
Build ✅
```

---

# 十四、范围审查

R19 没有实现：

- 半自动战斗；
- 装备具体品阶；
- 伤害 / 护甲 / 逃跑数值；
- 延寿物商店；
- 抱元丹商店；
- 宗门贡献；
- 高阶功法获取系统；
- 二阶妖丹 / 精血真实掉落；
- 完整治疗 / 中毒 / 伤势恶化；
- 第二秘境；
- 新重大机缘正文；
- 元婴；
- 雷劫；
- 复活。

R19 新增的 `complete_second_tier_beast_core` / `high_grade_beast_essence` 只作为已冻结邪道结丹资源的 formal item identity；R22 才负责让妖兽战利品真实产出它们。

---

# 十五、仍待正确时机补齐的内容缺口

不得为了清 TODO 提前硬编：

1. **10 件首版装备的具体“阶 + 品”与战斗数值**：下一轮 C20 正式冻结；
2. **8～12 个正式随机子地点模板**：R12 当前仍只有洞府 / 药谷 / 兽巢 / 遗迹 archetype；
3. 如首版确实需要，再冻结第 2 个小秘境；
4. **8～12 个重大机缘具体内容**：C30 前补；
5. **30 个普通事件正式正文**：进入普通事件 / 世界事件内容轮再逐个写；
6. **完整治疗 / 中毒 / 伤势恶化**：R21 在现有 injury runtime 上扩展；
7. 妖兽正式掉落 / 二阶妖丹 / 精血来源：R22；
8. 高阶功法、抱元丹、延寿物的真实世界获取入口：在宗门 / NPC / 商店 / 机缘对应轮次按已冻结来源逐步接入，不在 R19 伪造。

---

# 十六、当前迁移主线

```text
出生三选一 ✅
→ 童年关键节点 ✅
→ 成年 / 入道入口 ✅
→ 固定世界骨架 ✅
→ 地点知识 ✅
→ 节点旅行与时间 ✅
→ 区域探索 ✅
→ 随机子地点 ✅
→ C13 / R13 沉脉石室 ✅
→ R14 背包与储物袋 ✅
→ R15 装备栏与品阶结构 ✅
→ C16 修炼 / 突破内容冻结 ✅
→ R16 基础修炼 ✅
→ R17 功法系统 ✅
→ R18 炼气→筑基 ✅
→ C19 寿元 / 延寿 / 金丹内容冻结 ✅
→ R19 寿元 / 延寿 / 筑基后修炼 / 金丹 ✅
→ C20 战斗 / 装备数值冻结
→ R20 半自动战斗
→ R21 伤势与治疗
→ R22 妖兽与战利品
→ R23 危险判断 / 强大妖兽领地
→ 后续宗门 / NPC / 职业 / 世界事件
```

---

# 十七、下一步

执行：

> **C20｜战斗 / 装备数值冻结**

C20 是 content-only checkpoint：

- 不写 `src/`；
- 冻结 10 件现有装备的具体阶 + 品；
- 冻结首版基础战斗数值与离散节拍；
- 冻结四把主武器、两件护甲、四件护身 / 辅助法器的实际战术数值；
- 冻结首版 R20 需要的玩家基础攻击、护甲、技能消耗、逃跑、丹药 / 符箓 / 一次性法器最小数值；
- 只使用已经存在的装备、功法、符箓、丹药和敌人内容；
- 不新增新装备池、不做随机词条、不做耐久、不做强化、不做 R20 代码。

C20 完成后再进入 R20 半自动战斗。