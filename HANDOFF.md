# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- R00.1～R25 已合入 `main`。
- R25 merge commit：`a01503276314f47c49cb9b6e46841e5223686183`。
- **R26「拜师 / 违规 / 叛宗」实现完成；只有最终 PR head 的 Typecheck / Test / Build 全绿后才能合入。**
- R26 PR：#16 `V2 R26: add mentorship discipline and sect-exit consequences`。
- **R26 合并后不进入 R27。下一步必须先完整试玩 R24～R26 的宗门 + 野外 + 修炼人生闭环。**

---

# 一、长期架构纪律

唯一运行链继续保持：

```text
React UI
→ SessionCommand / GameAction
→ resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ localStorage
```

禁止新增：

```text
第二套 sect identity
第二份 rank / faction
第二套 contribution
第二套 inventory
第二套 worldDay
第二套 travel
第二套 CombatEngine
UI 自己修改师父 / 违规 / 离宗事实
```

宗门正式身份及其历史唯一真源仍是：

```ts
GameState.sectMembership
```

R25 宗门事务与贡献唯一运行态仍是：

```ts
GameState.sectProgress
```

---

# 二、R26 membership 生命周期

R26 没有在离宗时删除 `sectMembership`。

新增：

```ts
status?: 'active' | 'ended'
endedDay?: number
exitReason?: 'expelled' | 'betrayed'
```

兼容规则：

- R26 前 schema-3 存档没有 `status`；
- `status !== 'ended'` 仍视为 active；
- 因此旧 R24 / R25 membership 不会升级后自动失效。

正式 selector：

```ts
isActiveQingyunMember(state)
isFormerQingyunMember(state)
getSectAccess(state)
```

`getSectAccess()` 只给 active membership 内部权限。

离宗后：

```text
sectMembership.status = ended
identity.faction = loose
所有青云宗内部 access = false
```

但以下历史保留：

- 原 rank；
- joinedDay；
- joinPath；
- mastership；
- violations；
- endedDay；
- exitReason；
- R25 contribution / assignment history；
- 已经学会的功法。

---

# 三、C26 两名正式师父

冻结文件：

```text
C26_SECT_CONSEQUENCE_FREEZE.md
src/data/qingyunMentors.ts
```

只复用 Content Bible 已有 NPC，没有新增长老群体。

## 林照川｜N03｜外事长老｜筑基中期

收徒要求：

```text
active 青云正式弟子
非杂役
本人位于 qingyun_sect
贡献 >= 18
正式交结过：黑风山巡山 或 青背狼清剿
```

拜师后真实获得：

```text
《青锋剑诀》 qingfeng_jianjue
《流云步》 liuyun_bu
1 次十日当面指点
```

## 陆清仪｜N04｜丹堂长老｜筑基初期

收徒要求：

```text
active 青云正式弟子
非杂役
本人位于 qingyun_sect
贡献 >= 8
正式交结过：灵溪谷采药
```

拜师后真实获得：

```text
《春木养元功》 chunmu_yangyuan
《水幕术》 shuimu_shu
1 次十日当面指点
```

师父同时最多 1 名；已有 active mastership 时不能直接无代价改投。

---

# 四、师父收益真实进入既有系统

师承结构写入：

```ts
sectMembership.mastership
```

包含：

```text
masterNpcId
acceptedDay
status
remaining guidance uses
endedDay / endedReason（若离宗）
```

功法传授直接写入已有：

```text
cultivation.knownTechniqueIds
cultivation.techniquePractice
```

没有第二套“师门技能”。

当面指点：

```text
resolveCultivateDays(state, 10)
→ 先按当前真实主修 / 灵根 / 环境 / 伤势结算正常十日修炼
→ 再通过 applyFormalCultivationGain() 增加正常 gain 的 25%
→ guidanceUsesRemaining - 1
```

因此：

- 必须真的有可修炼主修；
- 真正消耗 10 worldDay；
- 仍读取伤势、中毒、环境、灵根和现有功法系统；
- 不可以无限刷同一次师父加成。

---

# 五、R26 三条真实违规行为

处罚不新增纪律点 / 声望点 / 恶名点，只复用现有：

```text
贡献
下品灵石
正式 membership
权限
Chronicle
```

## 5.1 越过内门资源区封线

前提：当前没有 `innerResources` 权限。

第一次：

```text
轻度违规
贡献最多 -3
留档
不逐出
```

重复：

```text
中度违规
贡献最多 -10
下品灵石最多 -5
留档
不逐出
```

## 5.2 强闯核心传承禁地

前提：当前没有 `trueInheritance` 权限。

结果：

```text
重度违规
贡献最多 -20
下品灵石最多 -10
立即逐出
```

## 5.3 在宗门内公开演练受限邪法

只有角色真的掌握带：

```text
cultivation:evil
```

规则标签的功法时才出现。

结果：

```text
重度违规
贡献最多 -15
下品灵石最多 -10
立即逐出
```

不会给普通角色凭空显示一个可点的“邪修违规”。

每条正式处罚结构化写入：

```ts
sectMembership.violations[]
```

至少包含：

```text
violationId
severity
worldDay
actionLabel
penaltyLabel
contributionDelta
spiritStoneDelta
expelled
```

---

# 六、逐出与主动叛宗

统一离宗 helper 会：

1. 若有 active R25 assignment，先按现有 `resolveAbandonSectAssignment()` 作废；
2. 当前 membership → ended；
3. faction → loose；
4. active mastership → ended；
5. 所有宗门内部权限立即失效；
6. Chronicle 写 major 身份变化。

## 被逐出

```text
exitReason = expelled
```

由重度违规触发。

## 主动叛宗

```text
exitReason = betrayed
```

玩家 UI 必须经过二次确认。

主动叛宗不是普通退出按钮，确认前明确告知：

- 当前宗门身份结束；
- 内部权限立即失效；
- 正式师承结束；
- active R25 事务作废；
- 旧名籍保留“主动叛宗”事实；
- 已学功法不删除。

R26 只保存未来可读取的叛宗事实，不提前做追杀 AI / 通缉榜 / 第二宗门。

---

# 七、R25 与 R26 的交叉规则

离宗时，若：

```ts
sectProgress.activeAssignment
```

仍存在，统一调用 R25 已有放弃 resolver。

结果：

```text
activeAssignment 清除
history 写 outcome = abandoned
不发事务奖励
该事务本世不能重新领取
```

已经积累的 `sectProgress.contribution` 不清零；它成为历史事实，但由于 `getSectAccess()` 已失效，不代表仍可使用宗门内部入口。

---

# 八、UI

新增：

```text
src/components/SectConsequencePanel.tsx
src/sect-consequence.css
```

玩家可以直接看到：

- 当前正式师父；
- 两名候选师父各自擅长什么；
- 为什么愿意 / 不愿意收徒；
- 拜师后实际传授；
- 剩余当面指点；
- 可主动做出的真实越权行为；
- 行为将属于轻 / 中 / 重哪一级违规；
- 处罚含义；
- 主动叛宗二次确认；
- 离宗后的旧名籍、原师父、退出原因；
- 已有正式违规记录。

`CharacterPanel` 现在区分：

```text
青云宗 · 当前 rank
曾属青云宗 · 原 rank
```

并显示：

- 当前 / 原师父；
- contribution；
- 违规条数；
- 离宗原因 / 日期。

`QingyunSectPanel` 不再把 ended membership 显示为仍可使用内部权限的“在册弟子”。

玩家文案不显示 R26、debug、开发轮次或“后续版本实现”。

---

# 九、正式 GameAction

R26 新增：

```text
ACCEPT_QINGYUN_MASTER
RECEIVE_MASTER_GUIDANCE
COMMIT_SECT_VIOLATION
BETRAY_QINGYUN_SECT
```

统一路径仍为：

```text
UI
→ commandAndSave
→ SessionCommand(game-action)
→ applyGameAction
→ sectConsequenceEngine
→ GameState
→ debug log / digest / replay
→ save
```

核心文件：

```text
src/core/sectConsequenceEngine.ts
src/core/sectConsequenceEngine.test.ts
```

---

# 十、专项回归

R26 专项测试覆盖：

1. 非青云成员不能拜师；
2. 杂役不能进入正式师承；
3. 收徒条件读取真实 R25 settled affairs + contribution；
4. 同时只有 1 名正式师父；
5. 拜师真实教授现有功法；
6. 十日指点真实推进时间并高于普通十日修炼；
7. 指点只有有限 1 次；
8. 首次越内门封线为轻罚；
9. 重复越权升级为中罚；
10. 贡献 / 灵石真实扣除；
11. 强闯核心禁地重罚并逐出；
12. 逐出后 faction = loose；
13. 逐出后 `getSectAccess()` 立即失效；
14. 已学功法不会被清空；
15. 邪法违规仅在角色真的会邪法时出现；
16. 主动叛宗与逐出 exitReason 不同；
17. 叛宗结束师承；
18. active R25 事务自动 abandoned；
19. contribution / history 保留；
20. former membership save / reload 保持；
21. 重度违规链 deterministic replay；
22. R24 旧 membership 无 `status` 仍兼容为 active；
23. R22～R25 原测试继续通过。

合并前硬门槛：

```text
npm run typecheck
npm test
npm run build
```

最终 PR head 必须三项全绿。

---

# 十一、Pages 部署

R25 CI 曾暴露 GitHub runner 的 npm dependency-tree `edgesOut` 内部错误。

R26 同步把：

```text
.github/workflows/pages.yml
```

安装步骤改为确定性安装：

```bash
npm ci --no-audit --no-fund --legacy-peer-deps
```

避免功能代码已经全绿但 Pages 又卡在旧的 `npm install` 安装器问题。

R26 合入 `main` 后必须实际确认 Pages 的 build + deploy 均成功，不能只说“代码已经 merge”。

---

# 十二、下一步不是 R27

R26 完成后，立即暂停新增大系统。

下一轮唯一任务：

```text
R24～R26 完整人生试玩验收
```

至少实际验证：

```text
成年路线
→ 加入 / 不加入青云宗的选择
→ 宗门任务
→ 贡献
→ 达成师父条件
→ 拜师
→ 当面指点
→ 野外探索 / 战斗 / 撤退
→ 宗门违规
→ 被罚 / 逐出 或 主动叛宗
→ 离宗后继续作为散修行动
→ 刷新 / 存读档
```

重点找：

- 路线是否真实可达；
- 节奏是否拖；
- 有没有重复菜单劳动；
- 文案有没有 AI 味 / 开发说明味；
- 权限有没有状态分裂；
- 是否出现“系统做了但玩家实际碰不到”；
- 离宗之后世界是否还能正常玩。

**试玩完成前禁止开始 R27 炼丹。**
