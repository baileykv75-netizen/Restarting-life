# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- R00.1～R24 已合入 `main`。
- R24 merge commit：`9637cd7abc6f5f5fda7bad2f401b294035f21ee3`。
- **R25「宗门贡献与任务」实现完成并通过 Typecheck / Test / Build；下一轮进入 R26「拜师 / 违规 / 叛宗」。**
- R25 PR：#15 `V2 R25: add Qingyun contribution and real assignments`。
- R26 结束后应暂停新增大系统，进行一轮宗门 + 野外 + 修炼的完整人生验收，再进入 R27。

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
→ localStorage
```

严禁新增：

```text
第二套 sect identity
第二套 contribution 真值
第二套 inventory
第二套 worldDay
第二套 travel
第二套 CombatEngine
UI 自己结算任务完成 / 奖励
```

宗门正式身份唯一真源仍是：

```ts
GameState.sectMembership
```

R25 新增宗门事务唯一运行态：

```ts
GameState.sectProgress
```

`sectProgress` 只负责：

- 当前宗门贡献；
- 同时最多 1 个 active assignment；
- 本世已经正式交结 / 放弃过哪些具体事务。

---

# 二、R25 authoritative state

`src/types/sect.ts` 新增：

```ts
SectAssignmentId
SectAssignmentKind
SectAssignmentStatus
SectAssignmentOutcome
ActiveSectAssignment
SectContributionRecord
SectProgressState
```

`GameState` 新增 optional：

```ts
sectProgress?: {
  contribution: number
  activeAssignment?: {
    assignmentId: SectAssignmentId
    acceptedDay: number
    status: 'accepted' | 'ready-to-settle'
    progressDays: number
    objectiveCompletedDay?: number
  }
  history: Array<{
    assignmentId: SectAssignmentId
    outcome: 'settled' | 'abandoned'
    resolvedDay: number
    contributionDelta: number
  }>
}
```

保持 optional 以兼容 R25 前 schema-3 存档；不提升 schemaVersion。

旧存档没有 `sectProgress` 时等价于：

```text
贡献 0
无当前事务
无已处理事务记录
```

不会自动生成贡献。

---

# 三、C25 数值冻结

新增：

```text
C25_SECT_ASSIGNMENT_FREEZE.md
src/data/sectAssignments.ts
```

首版只做四桩**本世具体存在的事务**，不是无限生成模板：

| 事务 | 真实目标 | 贡献 | 下品灵石 |
|---|---|---:|---:|
| 灵溪谷采药 | 灵溪谷采得并上交 3 株青露草；现场 3 日 | +8 | +4 |
| 黑风山外巡 | 黑风山累计完成 2 个实际探索日 | +10 | +5 |
| 坊市物资护送 | 从青云宗实际抵达青霞坊市，再回宗交结 | +12 | +6 |
| 黑风山狼患清剿 | 黑风山实际击杀 1 只青背狼 | +18 | +8 |

全部精确数值集中在：

```text
src/data/sectAssignments.ts
```

UI / engine 不另写第二份奖励表。

---

# 四、防止重新变成每日任务

R25 固定规则：

```text
一世四桩具体事务
+ 同时最多 1 桩 active
+ settled 后不再出现
+ abandoned 后也不再出现
```

因此不存在：

- 每日刷新；
- 每周刷新；
- 活跃度；
- 无限采药；
- 无限巡山刷贡献；
- 重复领取同一桩清剿；
- 放弃后立刻重接；
- 同一桩重复交差。

贡献是宗门长期资源，不是日常签到货币。

---

# 五、事务堂权限直接复用 R24

R25 不重新判断“是不是青云宗弟子”。

所有领取 / 交结入口只读：

```ts
getSectAccess(state).affairsHallEntry
```

因此：

```text
非成员 → 无事务堂权限
杂役 → 无事务堂权限
外门 → 有
内门 → 有
真传 → 有
```

任务列表只在玩家实际位于：

```text
qingyun_sect
```

且拥有事务堂权限时开放。

---

# 六、四桩事务真实复用现有系统

## 6.1 灵溪谷采药

完整链路：

```text
青云宗领任务
→ 事务堂告诉玩家灵溪谷路线，地点正式进入已知地图
→ 玩家真实旅行到灵溪谷
→ 点击按药图采集三日
→ advanceWorldTime(3)
→ inventory 加入 3 × green_dew_grass
→ 返回青云宗
→ 上交 3 株青露草
→ 贡献 +8 / 灵石 +4
```

约束：

- 使用现有 inventory capacity；
- 背包放不下时不会先扣 3 天再失败；
- 重伤 / 严重中毒会阻止三日采药；
- 交结时必须真实拥有 3 株青露草；
- 交结会移除 3 株，不会既交差又把任务药材继续留在背包。

## 6.2 黑风山外巡

不新增“巡山计时器”。

玩家必须真实使用已有：

```text
试探 1 天
巡探 3 天
深入 10 天
```

R25 只读取 `resolveRegionExploration()` 本次**实际已经发生的 elapsedDays**。

因此：

- 普通探索时间真实推进 worldDay；
- R22-FIX 妖兽遭遇仍可中断；
- 遭遇前已经巡过的时间照常进入巡山进度；
- 累计至少 2 个实际探索日后才完成目标；
- 若在满足 2 日的当次探索中进入战斗，先处理战斗，活着结束后再标记可交结。

## 6.3 坊市物资护送

不新增护送地图 / 第二移动系统。

完整链路：

```text
青云宗领任务
→ 携宗门物资出发
→ 使用现有 travel / fast travel
→ 真实抵达 qingxia_market
→ objective ready
→ 返回青云宗
→ 正式交结
```

青云宗 → 青霞坊市现有路线为 1 日；R25 不在事务堂原地替玩家结算路程。

## 6.4 黑风山狼患清剿

目标沿用已有：

```text
greenback_wolf
combat opponent = greenback-wolf
```

显式搜索狼踪或在任务期间实际遭遇对应目标后，继续进入**现有 CombatEngine**。

完成证据不是 UI 按钮，而是正式战斗退出后存在与该 `battleId` 匹配的青背狼 `pendingBeastLoot`。

因此：

```text
玩家逃跑 → 不完成
青背狼逃跑 → 不完成
玩家死亡 → 不完成
真实击杀 → 完成
```

清剿仍会触发现有：

- 伤势；
- 中毒（如适用）；
- 妖兽生态 pressure；
- 尸体战利品；
- 背包取舍。

宗门贡献奖励与妖兽尸体战利品是两条不同且真实的资源来源。

若当前黑风山青背狼 pressure 已经归零，事务堂不会凭空刷出一只任务狼。

---

# 七、完成目标 ≠ 立即拿奖励

四桩事务统一两阶段：

```text
accepted
→ 实际完成 objective
→ ready-to-settle
→ 回 qingyun_sect
→ settle
```

只有正式 `SETTLE_SECT_ASSIGNMENT` 才会：

- 增加 contribution；
- 增加 spirit stones；
- 写 history；
- 清除 activeAssignment；
- 写 Chronicle。

因此无法在野外一完成目标就凭空收到宗门报酬。

放弃统一通过：

```text
ABANDON_SECT_ASSIGNMENT
```

结果：

- 不发贡献；
- 不发灵石；
- 写 `outcome = abandoned`；
- 本世不再重新出现同一事务。

---

# 八、正式 GameAction 与 hooks

R25 新增 GameAction：

```text
ACCEPT_SECT_ASSIGNMENT
PERFORM_SECT_ASSIGNMENT
SETTLE_SECT_ASSIGNMENT
ABANDON_SECT_ASSIGNMENT
```

核心 engine：

```text
src/core/sectAssignmentEngine.ts
```

它不接管其他系统，只通过少量 hooks 读取结果：

```text
travelEngine
→ refreshSectAssignmentAfterTravel()

regionExplorationEngine
→ refreshSectAssignmentAfterExploration()

gameActionReducer 的 COMBAT_ACTION 完成后
→ refreshSectAssignmentAfterCombat()
```

真实动作的 authoritative resolver 仍然是原系统。

---

# 九、UI

新增：

```text
src/components/SectAssignmentPanel.tsx
src/sect-assignment.css
```

事务堂页面显示：

- 当前宗门贡献；
- 四桩事务名称；
- 地点；
- 目标；
- 已知风险；
- 现场时间（如适用）；
- 贡献与灵石报酬；
- 当前可否领取。

领任务后，当前事务卡会跟随玩家出现在世界地图页面，不要求回宗门才能查看目标。

不同任务在目标地点读取真实行动入口：

- 采药：出现三日采药按钮；
- 巡山：明确要求使用现有区域探索；
- 护送：明确要求使用现有旅行；
- 清剿：出现沿狼踪寻找目标按钮并进入 CombatEngine。

完成后只有在青云宗才出现“交结事务并领取报酬”。

`CharacterPanel` 的宗门身份卡始终显示：

```text
宗门贡献 N
```

玩家离开宗门后仍能确认自己的累计贡献。

玩家可见文案不出现开发轮次、debug 或“先占位后实现”措辞。

---

# 十、专项测试覆盖

`src/core/sectAssignmentEngine.test.ts` 至少验证：

1. 四类事务定义唯一；
2. 非成员 / 杂役不能接事务堂任务；
3. 同时只能有 1 个 active assignment；
4. 采药推进真实 worldDay；
5. 采药真实占用 inventory；
6. 交差移除任务药材；
7. 贡献与灵石只在 settlement 写入一次；
8. 同一任务 settled 后不能重接；
9. 巡山进度来自真实 region exploration；
10. 护送完成来自真实 travel arrival；
11. 清剿启动现有 CombatEngine；
12. 逃跑 / 无 victory loot 不算清剿完成；
13. 真正击杀证据可标记 ready-to-settle；
14. abandon 无奖励且本世不能重接；
15. `sectProgress` save / reload 不丢；
16. 完整采药 → 回宗 → settlement 可 deterministic replay；
17. R00～R24 既有回归测试继续通过。

---

# 十一、CI 安装说明

2026-08-19 GitHub Actions 的 Node 22 / npm 10.9.8 在本仓库连续两次于 `npm install` 的 Arborist peer-tree 阶段崩溃：

```text
Cannot read properties of null (reading 'edgesOut')
```

失败发生在任何 Typecheck / Test / Build 之前，R25 没有修改依赖。

为了让真正的代码门槛可以运行，CI 安装改为：

```text
npm install --legacy-peer-deps
```

依赖版本仍来自现有精确 `package.json`；没有借此跳过 TypeScript、Vitest 或 Build。

修改后 CI 已实际跑通：

```text
Install dependencies ✅
Typecheck ✅
Test ✅
Build ✅
```

后续若仓库正式加入 lockfile，可再单独把 CI 收敛为 lockfile 驱动安装；不要在功能轮顺手做大规模依赖升级。

---

# 十二、R25 明确没有做

没有实现：

- 贡献兑换商店；
- 用贡献直接晋升身份；
- 重复 / 随机生成宗门日常；
- 周常 / 活跃度；
- 第二宗门；
- 派系政治；
- 拜师；
- 师父 NPC 关系闭环；
- 违规 / 处罚；
- 逐出；
- 主动叛宗；
- 通缉。

这些属于后续，尤其师承与身份后果属于 R26。

---

# 十三、下一轮 R26 的正确入口

R26 必须直接复用：

```text
sectMembership
+ getSectAccess()
+ sectProgress.contribution
+ R25 事务历史
```

目标是让宗门身份开始产生**关系与后果**：

```text
正式拜师
→ 师承提供真实功法 / 资源 / 指点
→ 违规有轻 / 中 / 重后果
→ 严重后果可以逐出
→ 玩家也可以主动叛宗
→ 成为散修后，原宗门历史仍被世界记住
```

禁止在 R26 重新设计贡献任务、重写 membership，或提前做 R27 炼丹。

R26 完成后暂停新增大系统，完整玩一世，重点审查：

```text
散修路线是否仍成立
宗门路线是否真的有稳定资源也有义务
R25 事务是否像世界里的事而不是任务列表
师承 / 违规是否真实改变选择
成年野外与宗门内容能否自然交替
```
