# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R06 童年关键节点已完成，下一轮进入 R07 成年 / 入道入口。**
- R00.1～R00.3：迁移、存档 V3 与开发规则已完成。
- R01：唯一 `GameState` V2 扩展完成。
- R02：统一 `GameAction / SessionCommand / reducer / replay` 边界完成。
- R03：V3 单档自动保存与恢复回归完成。
- R04：V2 Game Shell 完成。
- C00：`V2_CONTENT_BIBLE.md` 已成为首版具体内容真源。
- R05：出生三选一完成。
- R06：每个正式出身的首批两段童年关键节点完成；结束后准确到 16 岁并停在成年入口。
- legacy Action/Event/Result/End 与旧出生 wrapper 只为旧人生、旧测试与迁移兼容保留，不得继续扩张。
- 不另开仓库，不建立长期并行 `src/v2/` 或第二套 GameState。

## 内容真源与仍待后续冻结的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

仍需在对应开发轮前补齐，但当前不得由 Codex 自行发明：

1. 炼气 → 筑基、筑基 → 金丹的具体突破资源与流程；
2. 筑基至金丹级主修传承；
3. 2～3 个具体延寿物；
4. 8～12 个随机子地点和 1～2 个小秘境；
5. 8～12 个重大机缘具体内容；
6. 30 个普通事件的正式正文。

## 已完成核心轮次

### R05｜出生三选一

- `phase = birth-selection` 已成为真实可玩阶段；
- 一次生成并保存 3 个候选，刷新 / 重开不会重抽；
- 三候选出身互不重复，强弱不做补偿；
- 使用 Content Bible 的 8 个出身、正式灵根、无特殊体质 + 7 体质、12 个首版天赋；
- 出身把出生地、关系、地点认知、童年池、成年入口、资源写成可读取 seed/tag；
- 天赋 / 体质通过 `ruleTags` 提供真实规则接口；
- 选择后只保留一个权威 `GameState`；
- `pendingBirthSelection` 进入 V3 存档 / checksum；
- selected birth seed 可由 replay 重建；
- legacy 旧出生 / Archive / replay 保持兼容。

R05 主实现：`1a69418ef90ff50e93f3c60f2c1e3bab02a81854`

### R06｜童年关键节点

首版已实现 8 个出身 × 2 个节点，共 16 个正式童年节点：

- 白石村佃户：收成不好 / 山里来的伤者；
- 黑风山猎户：第一次跟猎 / 不该出现的脚印；
- 青石镇药铺：混进药材里的怪草 / 出价异常的客人；
- 临河县武馆：正式学武 / 真正的修士；
- 青霞坊散修：第一次测灵 / 家里缺灵石；
- 谢家旁支：测灵与登记 / 第一次学符；
- 陆家嫡系：家族测灵 / 灵田见习；
- 青云宗执事后人：宗门测灵 / 观看弟子切磋。

实现边界：

- 新增权威 `ChildhoodProgress`，进入唯一 GameState；
- `childhood-choice` 走现有 SessionCommand → resolver → debug log → digest → replay → persistence；
- 每世固定两节点，第一节点约 8 岁、第二节点约 12 岁；中间年份聚合跳过；
- 选项只显示可知耗时、明显风险和直接成本；
- choice 可真实改变 flags / tags / relation / stats / spirit stones；
- 测灵事件只确认 R05 已经确定的 `spiritRootId`，绝不重抽；
- 猎户事件读取察微知著 / 危机直觉；药铺事件读取百草灵体 / 辨药；武馆与宗门切磋读取兵器熟手；
- 天赋 / 体质优先改变信息或可选行动，而不是只加数值；
- Chronicle 只记录两个关键节点，不逐年写流水账；
- 第二节点完成后强制 `worldDay = birthDay + 16 * DAYS_PER_YEAR`、`lifeStage = adult`；
- 成年状态停在安全过渡页，不显示 legacy 四按钮，不提前实现 R07；
- 旧 schema-3 存档允许没有 `childhood` 字段，新人生会明确写入该状态。

R06 主实现：`0b6d1d81d2d56e2f0fe134166c122d749c05a82f`

R06-FIX：`f453d75ea292634d3efb6fce8aac8a791929dee6`

R06-FIX CI：run `31863503118`，verify job `94960710083`：

- typecheck：通过；
- test：通过；
- build：通过。

## 当前唯一状态与调度规则

正式 V2 系统继续使用：

```text
UI / feature
→ SessionCommand
→ GameAction / 对应 resolver
→ 唯一 GameState
→ debug log / digest / replay
→ PersistentGame
→ auto-save
```

禁止：

- React 页面直接 mutate 核心状态；
- React 页面自己写 localStorage；
- 新建 `GameStateV2`；
- 新建长期并行 V2 store；
- 为单个内容绕过统一 resolver / persistence；
- 把未冻结内容临时编成正式设定。

## 当前可复用基础设施

- React + TypeScript + Vite + Vitest；
- Seeded RNG；
- 单一 `worldDay`；
- Session / Command / GameAction；
- state digest / debug log / replay；
- `PersistentGame` + V3 checksum / migration；
- Chronicle / Archive；
- V2 Game Shell；
- 正式出生 data；
- `ChildhoodProgress` / childhood resolver / 16 个童年节点。

## 当前迁移主线

```text
出生三选一 ✅
→ 童年关键节点 ✅
→ 成年 / 入道入口（R07）
→ 地点节点与旅行（R08+）
→ 探索 / 世界活动
→ 资源 / 修炼 / 战斗 / 宗门 / 职业
→ 世界事件 / 完整一世
```

## 下一轮

执行：

> **R07｜成年 / 入道入口**

R07 只负责把 16 岁角色从童年结果接到符合出身、灵根、关系与经历的成年起点，并形成不同的仙道接触入口。它不实现正式地图旅行、修炼数值循环、宗门完整玩法、战斗或职业系统。

具体范围以 `CURRENT_TASK.md` 为准。
