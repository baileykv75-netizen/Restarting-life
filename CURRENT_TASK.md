# 当前任务：V2 R25 - 宗门贡献与任务

## 本轮唯一目标

把 R24 已经成立的“青云宗正式身份”继续变成一条真正可玩的宗门内部循环：

> **进入事务堂 → 接一桩具体事务 → 付出真实时间 / 风险 → 完成 → 获得贡献与实际奖励。**

首版只做青云宗，不重做 membership。

---

# 一、必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
   - 自由路线；
   - 一世感；
   - 时间系统；
   - 世界因果。
3. `V2_CONTENT_BIBLE.md`
   - §3 青云宗与地方秩序；
   - §3.3 五个核心部门；
   - §3.4 弟子层级；
   - §3.5 宗门贡献；
   - 黑风山 / 灵溪谷 / 万兽岭与已有材料。
4. `V2_GITHUB_ROADMAP.md` 的 R25 / R26 边界。
5. `HANDOFF.md`，特别是 R24 membership / access 结构。
6. 现有重点代码：
   - `src/types/sect.ts`
   - `src/core/sectMembershipEngine.ts`
   - `src/components/QingyunSectPanel.tsx`
   - `src/core/travelEngine.ts`
   - `src/core/worldEngine.ts`
   - `src/core/combatEngine.ts`
   - `src/core/beastEngine.ts`
   - `src/core/inventoryEngine.ts`
   - `src/data/items.ts`
   - Session / GameAction / persistence / replay 相关代码。

---

# 二、最高架构原则

## 2.1 R24 membership 是唯一身份真源

禁止重新用：

```text
identity.faction === qingyun
某个 qingyun_xxx flag
UI 本地状态
```

独立判断“是不是正式青云宗弟子”。

宗门事务入口必须先读取：

```ts
getSectAccess(state).affairsHallEntry
```

R25 可以新增一个 optional、单一 authoritative 的宗门进度状态，例如：

```ts
sectProgress?: {
  contribution: number
  activeAssignment?: ...
}
```

但不得建立第二份 membership / rank。

## 2.2 贡献是资源，不是身份

贡献与 rank 分开：

```text
sectMembership.rank = 你是谁
sectProgress.contribution = 你在宗门里积累了多少可用功绩
```

R25 不得直接用 contribution 数值偷偷改 rank。

内门 / 真传晋升若需要贡献，只在权限 / 条件层留下可读取字段；正式晋升流程不在本轮完成。

## 2.3 不是每日任务系统

禁止：

- 每日刷新；
- 签到；
- 连续做十次同一任务刷贡献；
- “任务点数 / 活跃度”；
- 为了在线时长制造重复劳动。

任务应该像这一世中真实发生的一桩宗门事务。

---

# 三、首版四类事务

固定使用路线图四类：

```text
采药
巡山
护送
清剿
```

不要新增第五大类。

## 3.1 采药

定位：低风险、稳定回报。

优先复用：

- 灵溪谷；
- 已有灵药 / 药材物品；
- worldDay；
- inventory capacity。

必须有真实时间成本。

若现有正式 item 中没有合适的交付物，先审查 `V2_CONTENT_BIBLE.md` 与 `items.ts`，只补最小必要材料，不批量生成药材百科。

## 3.2 巡山

定位：中低风险、信息与宗门贡献并重。

优先复用：

- 青云宗周边；
- 黑风山 / 灵溪谷入口；
- R23 risk judgement；
- ordinary beast encounter。

允许出现“平安完成”与“途中遇到问题”两类结果，但不要重新造第二套随机事件引擎。

## 3.3 护送

定位：真实时间成本 + 路线风险。

优先复用：

- 已知 world route；
- travelEngine；
- worldDay；
- 路线中断 / 战斗已有能力。

不要实现完整商队经营。

## 3.4 清剿

定位：高风险、高贡献。

必须尽量复用已有：

```text
R20 CombatEngine
R21 injury / poison
R22 ordinary beasts / ecology
R23 danger judgement
```

禁止“点一下按钮直接结算杀死三只妖兽”。

至少一个首版清剿任务应真正进入现有正式战斗。

---

# 四、任务生命周期

首版必须建立明确生命周期，不要只做四个奖励按钮。

建议最小状态：

```text
available
→ accepted
→ in_progress / awaiting_completion
→ completed
→ settled
```

实际字段可以更简，但必须能回答：

- 当前有没有接任务；
- 接的是哪一类；
- 从哪一天开始；
- 当前目标；
- 是否完成；
- 奖励是否已经领取。

禁止同一任务重复结算奖励。

首版同时只允许 1 个 active assignment，避免堆任务清单。

---

# 五、贡献与奖励

贡献至少需要：

```text
current contribution
本次变化
来源 assignmentId
```

如果 Content Bible 没有冻结精确贡献数值，本轮先做一个很小的 C25 数值冻结，再实现；不得在不同 engine / UI 各自 hardcode 奖励。

奖励优先使用现有正式资源：

- 宗门贡献；
- 下品灵石；
- 已有 inventory 物品 / 妖兽材料 /基础消耗品。

禁止首版新增：

- 任务宝箱；
- 随机装备箱；
- SSR 掉落；
- 独立“宗门币”；
- 经验球。

贡献不是新货币皮肤，而是后续宗门权限与兑换的功绩记录。

---

# 六、地点与时间必须真实

任务不能在青云宗面板里“原地完成”。

至少部分任务要让玩家：

```text
青云宗事务堂接任务
→ 去真实地点
→ 消耗真实 worldDay
→ 完成目标
→ 返回 / 结算
```

需要移动时复用现有 travel；需要战斗时复用 Combat；需要物品时复用 inventory。

不要新增第二套任务专用时间。

---

# 七、失败与放弃

首版必须允许任务不是永远成功。

至少处理：

- 玩家死亡；
- 战斗失败 / 逃跑；
- 目标没有完成；
- 玩家主动放弃。

放弃可以不给奖励，但 R25 不做复杂违规处罚。

禁止把“任务失败”直接扩成 R26 的宗门处分系统。

---

# 八、UI 最小要求

在青云宗 / 事务堂入口，玩家至少能看懂：

1. 当前宗门身份；
2. 当前贡献；
3. 当前有没有在办的事务；
4. 可接的四类首版事务；
5. 每项明确的时间 / 地点 / 已知风险；
6. 完成目标；
7. 奖励；
8. 是否可以放弃；
9. 已完成任务不会重复领奖。

玩家文案禁止出现：

- R25；
- “系统任务”；
- “每日”；
- “活跃度”；
- debug / placeholder；
- 手游式推荐战力。

---

# 九、必须回归

至少覆盖：

1. 非宗门成员不能接内部事务；
2. 杂役不能绕过 `affairsHallEntry` 接正式弟子任务；
3. 外门及以上能进入事务堂；
4. contribution 初始与增减唯一；
5. 同时只能有一个 active assignment；
6. 四类任务定义存在且来源于单一 data 层；
7. 每类任务都有真实 worldDay 成本；
8. 至少一个任务真实读取 inventory；
9. 至少一个任务真实走 travel；
10. 至少一个清剿任务真实进入 CombatEngine；
11. 战斗失败 / 逃跑不会被错误算完成；
12. 完成后奖励只能结算一次；
13. 放弃后不能领取完成奖励；
14. contribution / active assignment save reload 不丢；
15. Session replay deterministic；
16. R24 membership / teaching / access 不退化；
17. R23 risk / territory 不退化；
18. R22-FIX ordinary exploration 不退化；
19. R20～R22 combat / poison / loot 不退化；
20. Typecheck / Test / Build 全绿。

---

# 十、本轮禁止

- 不做 R26 拜师；
- 不做违规 / 处罚；
- 不做叛宗 / 通缉；
- 不做宗门派系政治；
- 不做多个宗门；
- 不做每日 / 周常任务；
- 不做完整贡献商城；
- 不做内门 / 真传完整晋升；
- 不做新 CombatEngine；
- 不做新 travel engine；
- 不做新 inventory；
- 不把任务写回 V1.2 `FORMAL_EVENTS` 主循环。

---

# 十一、验收标准

R25 完成必须真正跑通至少一条完整链：

```text
青云宗正式外门弟子
→ 进入事务堂
→ 接任务
→ 前往真实地点 / 执行真实行动
→ worldDay 推进
→ 必要时进入 Combat / inventory / travel
→ 满足目标
→ 返回结算
→ contribution + 正式奖励写入唯一 GameState
→ save / reload / replay 保持
```

并且：

```text
npm run typecheck
npm test
npm run build
```

全部通过。

完成后更新 `HANDOFF.md`，立即停止，不在同轮开始 R26。
