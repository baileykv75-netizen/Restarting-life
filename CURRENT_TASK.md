# 当前任务：V2 R24 - 宗门加入与身份

## 本轮唯一目标

实现路线图规定的最小宗门路线：

> **玩家可以真正加入青云宗，并且“宗门身份”开始改变可访问的内容。**

R23 已经完成成年野外的风险 / 强敌领地闭环。R24 不继续扩野外系统，而是让“加入宗门”从背景文字变成正式、可保存、可被后续 R25 / R26 读取的身份事实。

首版只做 **青云宗**。

---

# 一、必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
   - 自由路线；
   - 宗门 / 散修取舍；
   - 世界因果；
   - 一世感。
3. `V2_CONTENT_BIBLE.md`
   - §3 青云宗与地方秩序；
   - §3.3 五个核心部门；
   - §3.4 弟子层级；
   - 出身与成年入道相关内容。
4. `V2_GITHUB_ROADMAP.md` 的 R24 / R25 / R26 边界。
5. `HANDOFF.md`。
6. 现有重点：
   - `src/types/game.ts`
   - `src/data/backgrounds.ts`
   - `src/data/adultEntries.ts`
   - `src/core/adultEntryEngine.ts`
   - `src/core/locationKnowledgeEngine.ts`
   - `src/core/travelEngine.ts`
   - `src/data/worldLocations.ts`
   - `src/components/WorldMapPanel.tsx`
   - `src/components/CharacterPanel.tsx`
   - Session / GameAction / persistence / replay 相关代码。

---

# 二、最高架构原则

## 2.1 不建立第二套角色身份

现有：

```text
GameState
identity.faction
background / adultEntry / tags / flags
```

R24 必须先审查这些字段，再做最小扩展。

如果需要结构化宗门运行态，可以增加一个 **optional、单一 authoritative** 的 membership 状态，但禁止：

```text
SectGameStateV2
第二份 faction
UI 自己维护 rank
用散乱 flags 同时表示多个互相矛盾的宗门身份
```

最终必须能唯一回答：

```text
是否属于青云宗？
何时加入？
通过什么路径加入？
当前是杂役 / 外门 / 内门 / 真传中的哪一层？
当前身份允许访问什么？
```

## 2.2 一宗首版

R24 只实现：

```text
qingyun
```

不得为了“可扩展”顺手生成第二宗、魔宗、完整宗门框架平台。

## 2.3 身份必须改变选择

宗门身份不能只是 CharacterPanel 多一行文字。

至少需要真实改变：

- 某些青云宗内部入口是否可用；
- 基础传功 / 修炼资源的访问权限；
- 后续 R25 任务 / 贡献和 R26 师承 / 违规可读取统一身份。

R24 可以只建立**权限与入口**，不提前实现 R25 的贡献兑换和任务内容。

---

# 三、青云宗正式定位

首版沿用 Content Bible：

> 地方正道宗门，优势是稳定功法、修炼环境、师承、任务、丹药、法器与保护；代价是身份、规矩与义务。

弟子层级固定：

```text
杂役 → 外门 → 内门 → 真传
```

含义：

- 杂役：正式宗门体系中的最低身份；
- 外门：正常正式弟子入口；
- 内门：更高权限，需要后续条件推进；
- 真传：高层身份，**不能因出身直接赠送**。

R24 不需要把四层晋升玩法全部做完，但 state / permission 结构必须能稳定承载它们。

---

# 四、加入路径

至少实现两类：

## 4.1 正常入门

面向普通成年角色的正式入口。

要求：

- 必须存在真实世界入口，而不是 debug 按钮；
- 玩家能看到入门所需的已知条件；
- 满足后主动选择加入；
- 不满足时说明缺什么，但不要伪造隐藏随机判定；
- 加入后写入 authoritative membership / faction；
- Chronicle 记录一次重要身份变化。

正常入口首版优先从：

```text
青云宗 / 青云行馆 / 已有成年入道机会
```

中复用现有地点与成年内容，不新增无来源地点。

## 4.2 少量特殊入门

只读取 **现有已冻结出身 / 成年入口 / 已有关系或事实**。

例如修仙家庭、宗门相关成年入口若已经明确给出更直接渠道，可以减少普通流程；但：

- 不自行创造大批特殊关系；
- 不因为强出身直接给真传；
- 特殊入门最终也写入同一 membership state。

---

# 五、身份与权限

R24 至少建立一个纯 selector，等价于：

```ts
getSectAccess(state)
```

它只读当前正式宗门身份，回答可访问的最小权限。

首版至少区分：

## 非宗门成员

- 只能访问对外公开内容；
- 不能把传功堂 / 内部修炼资源当公共商店。

## 杂役

- 外院登记 / 杂役区域；
- 极基础内部资源；
- 不自动获得内门级传承。

## 外门

- 正式弟子基础权限；
- 可访问基础传功入口；
- 为 R25 宗门事务 / 贡献建立真实入口。

## 内门

- 更高内部资源权限字段存在；
- R24 不必提前填满所有高级内容。

## 真传

- 最高首版身份字段可表达；
- R24 不提供“出生即真传”捷径。

权限必须是 selector / rule，而不是 UI hardcode。

---

# 六、自由路线必须保留

加入青云宗是选择，不是主线强制。

玩家必须仍可以：

```text
不加入
→ 继续散修 / 家族 / 野外路线
```

R24 禁止因为宗门系统上线，就把所有修仙角色自动改成青云弟子。

---

# 七、UI 最小要求

玩家至少能看懂：

1. 自己当前是否属于青云宗；
2. 当前身份层级；
3. 已知入门条件；
4. 加入后最直接的权限变化；
5. 不加入仍可继续游戏；
6. 已经加入后不再显示重复入门按钮。

CharacterPanel / 世界地点可选择最小必要改动，不做完整宗门主页美术重构。

---

# 八、必须回归

至少覆盖：

1. 非成员不会被自动加入；
2. 正常入门条件可解释；
3. 满足条件后可正式加入；
4. 特殊入门读取现有真实背景 / 成年事实；
5. 所有路径最终写入同一 membership truth；
6. `identity.faction` 与 membership 不矛盾；
7. 四种 rank 可被合法表达；
8. 真传不能由出生直接免费授予；
9. 不同 rank 的 access selector 有真实差异；
10. 加入宗门写 Chronicle；
11. 加入后刷新 / save reload 身份不丢；
12. Session replay deterministic；
13. R22-FIX ordinary exploration 不退化；
14. R23 risk / territory 不退化；
15. R20～R22 combat / poison / loot 回归不退化；
16. Typecheck / Test / Build 全绿。

---

# 九、本轮禁止

- 不实现 R25 贡献数值循环；
- 不做 R25 采药 / 巡山 / 护送 / 清剿任务；
- 不做 R26 拜师；
- 不做 R26 违规 / 处罚 / 叛宗；
- 不做派系政治；
- 不做多个宗门；
- 不扩 NPC 全量模拟；
- 不做宗门日常签到 / 每日任务；
- 不重构整个 App；
- 不顺手平衡 Combat / cultivation；
- 不通过大量 flags 拼出第二套身份系统。

---

# 十、验收标准

R24 完成必须真正跑通：

```text
非成员
→ 看到合法青云宗入门入口
→ 满足 / 不满足条件得到明确反馈
→ 玩家主动决定是否加入
→ 加入后唯一 GameState 写入宗门身份
→ Character / 地点 UI 读取身份
→ access selector 改变内部入口
→ save / reload / replay 保持
```

并且：

```text
npm run typecheck
npm test
npm run build
```

全部通过。

完成后更新 `HANDOFF.md`，立即停止，不在同轮开始 R25。
