# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- R00.1～R23 已完成并在 `main`。
- **R24「宗门加入与身份」实现完成；合并前只接受最终 head 的 Typecheck / Test / Build 全绿。**
- 下一轮：R25「宗门贡献与任务」。
- R25 不得反向重做 R24 membership；必须直接读取 R24 的正式宗门身份与权限。

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

禁止新增：

```text
GameStateV2
第二套 faction / sect identity
第二套 inventory
第二套 world timer
第二套 CombatEngine
UI 自己维护 rank / contribution 真值
```

R24 之后，青云宗正式身份的唯一结构化真源是：

```ts
GameState.sectMembership
```

`identity.faction` 继续保留为旧系统兼容投影；正式宗门层级、加入时间、加入路径和权限不得再从零散 flags 猜测。

---

# 二、R24 新增 authoritative membership

新增：

```text
src/types/sect.ts
src/core/sectMembershipEngine.ts
src/core/sectMembershipEngine.test.ts
src/components/QingyunSectPanel.tsx
```

`GameState` 新增 optional：

```ts
sectMembership?: {
  sectId: 'qingyun'
  rank: 'service' | 'outer' | 'inner' | 'true'
  joinedDay: number
  joinPath:
    | 'regular-recruitment'
    | 'clan-recommendation'
    | 'steward-family'
    | 'mortal-service'
}
```

optional 是为了兼容 R24 之前的 schema-3 存档；本轮不提升 schemaVersion。

正式加入后：

- `sectMembership` 写入唯一宗门名籍事实；
- `identity.faction` 同步为 `qingyun`，继续兼容现有 faction 条件；
- Chronicle 写入一次 major 身份变化；
- 不再显示重复入门按钮。

旧存档不会因为升级版本自动获得 membership。

---

# 三、首版加入路径

## 3.1 普通正式入门

有灵根的成年角色，只要已经实际来到：

```text
qingyun_sect
```

即可看到公开招录条件并主动登记。

首版不伪造隐藏随机考试；当前明确条件只有：

- 成年；
- 有灵根；
- 本人实际来到青云宗。

满足后正常入口统一成为：

```text
青云宗 · 外门
joinPath = regular-recruitment
```

不加入不会阻断散修 / 家族 / 野外路线。

## 3.2 家族引荐

复用已经冻结的成年事实：

```text
adult_access:qingyun_family_recommendation
adult_access:qingyun_clan_recruitment
```

谢家 / 陆家已有引荐渠道时，玩家仍需本人到青云宗完成登记。

最终仍写同一个 membership：

```text
rank = outer
joinPath = clan-recommendation
```

家族引荐只是减少入口阻力，不赠送内门 / 真传。

## 3.3 青云宗执事家庭

复用 `qingyun_steward_family` 已冻结成年入口。

有灵根且已经选择正规招录渠道：

```text
qingyun_family_quarters
→ 可办理正规登记
→ rank = outer
→ joinPath = steward-family
```

“出生在宗门家属区”不等于自动成为弟子。

## 3.4 无灵根外围差事

只允许已冻结的特殊路径：

```text
background = qingyun_steward_family
+ adult_path:qingyun_mortal_service
+ currentLocation = qingyun_family_quarters
```

登记为：

```text
rank = service
joinPath = mortal-service
```

普通无灵根角色不能凭空通过公开招录成为修士弟子。

---

# 四、四层身份与权限

唯一 selector：

```ts
getSectAccess(state)
```

它只读正式 `sectMembership`。

## 非成员

```text
publicArea = true
其余内部权限 = false
```

## 杂役

```text
outerRegistry = true
serviceArea = true
basicInternalResources = true
basicTeaching = false
discipleCultivationArea = false
affairsHallEntry = false
```

## 外门

在杂役基础上增加：

```text
basicTeaching = true
discipleCultivationArea = true
affairsHallEntry = true
```

## 内门

增加：

```text
innerResources = true
```

## 真传

增加：

```text
trueInheritance = true
```

R24 只保证四层结构与权限稳定可表达，不实现升阶流程。

任何 R24 加入路径都只能得到：

```text
service
或
outer
```

不能出生即内门 / 真传。

---

# 五、宗门身份已经真实改变玩法

R24 不是 CharacterPanel 多一行字。

## 5.1 基础传功

外门及以上在 `qingyun_sect` 可通过正式 GameAction：

```text
RECEIVE_QINGYUN_BASIC_TEACHING
```

领取已有正式功法：

```text
qingyuan_yinqi
《青元引气诀》
```

结果直接进入现有：

```text
cultivation.knownTechniqueIds
techniquePractice
CultivationPanel
```

不会直接增加修为，不复制第二套功法系统。

杂役和非成员不能领取。

## 5.2 宗门灵脉环境

正式外门加入会同步 `identity.faction = qingyun`，因此继续复用 R16 已有的青云宗修炼环境规则：

```text
非青云修士在青云宗 → 宗门外围 · 灵气普通
青云正式弟子 → 可使用青云宗高灵气环境
```

专项测试已经验证加入前后同一功法的环境标签与实际修炼 gain 发生变化。

R25 若继续扩展宗门资源，必须优先读取 `getSectAccess()`，不得只靠 faction 判断高阶权限。

---

# 六、UI

`WorldMapPanel` 在真实地点显示宗门入口：

```text
qingyun_sect
qingyun_family_quarters
```

新增 `QingyunSectPanel` 展示：

- 当前是否在册；
- 当前 rank；
- 加入路径；
- 已知入门条件；
- 当前缺少条件；
- 加入按钮；
- 当前各类宗门入口是否可进入；
- 传功堂基础传功入口。

所有玩家文案保持世界内表达，不显示：

- R24 / R25；
- “开发中”；
- debug；
- “系统权限”；
- 版本轮次说明。

`CharacterPanel` 同步显示：

```text
青云宗 · 杂役 / 外门 / 内门 / 真传
加入路径
登记 worldDay
```

---

# 七、GameAction / save / replay

新增正式 GameAction：

```text
JOIN_QINGYUN_SECT
RECEIVE_QINGYUN_BASIC_TEACHING
```

完整路径仍是：

```text
UI
→ commandAndSave
→ SessionCommand(game-action)
→ applyGameAction
→ sectMembershipEngine
→ GameState
→ debug log / state digest
→ save
```

没有 UI 直接改状态。

专项测试覆盖：

1. 非成员不会自动加入；
2. 普通入门条件可解释；
3. 正常加入写 `sectMembership + faction + Chronicle`；
4. 谢家 / 陆家引荐只改变 joinPath，不抬高 rank；
5. 执事家庭正规路径最终写同一 membership；
6. 无灵根只允许已冻结的外围差事路径成为杂役；
7. 四种 rank 权限有真实差异；
8. R24 入口绝不直接产生内门 / 真传；
9. 外门可以领取《青元引气诀》，杂役不能；
10. 加入前后青云宗修炼环境真实变化；
11. membership save / reload 不丢；
12. JOIN_QINGYUN_SECT 可 deterministic replay；
13. 原有 R20～R23 tests 必须继续通过。

---

# 八、明确没有做

R24 没有实现：

- 宗门贡献数值；
- 采药 / 巡山 / 护送 / 清剿任务；
- 贡献兑换；
- 内门 / 真传晋升流程；
- 拜师；
- 师徒关系新系统；
- 违规 / 处罚；
- 叛宗 / 通缉；
- 派系政治；
- 第二宗门；
- 宗门每日任务。

这些不得被误判为 R24 遗漏；其中贡献与任务属于 R25，师承与身份后果属于 R26。

---

# 九、下一轮 R25 的正确入口

R25 必须从现有事实开始：

```text
state.sectMembership
→ getSectAccess(state).affairsHallEntry
→ 宗门事务
→ contribution
→ 奖励 / 资源 / 身份推进条件
```

不要重新判断“是不是青云宗弟子”。

R25 首版任务固定为路线图四类：

```text
采药
巡山
护送
清剿
```

设计原则：

- 不是每日任务；
- 每次任务必须消耗真实 worldDay；
- 奖励必须进入现有 spirit stones / inventory / contribution；
- 危险任务应尽量复用 R20 Combat、R21 health、R22 beasts；
- 不新建第二任务世界或第二时间轴；
- 不在 R25 提前做 R26 拜师 / 违规 / 叛宗。

---

# 十、合并纪律

R24 只有在最终 PR head 同时满足：

```text
npm run typecheck
npm test
npm run build
```

全部成功后才允许合入 `main`。
