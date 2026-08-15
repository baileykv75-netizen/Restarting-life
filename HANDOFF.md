# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R08 固定世界骨架已完成，下一轮进入 R09 地点知识状态。**
- R00.1～R00.3：迁移、存档 V3 与开发规则已完成。
- R01：唯一 `GameState` V2 扩展完成。
- R02：统一 `GameAction / SessionCommand / reducer / replay` 边界完成。
- R03：V3 单档自动保存与恢复回归完成。
- R04：V2 Game Shell 完成。
- C00：`V2_CONTENT_BIBLE.md` 为首版具体内容真源。
- R05：出生三选一完成。
- R06：8 个出身 × 2 个童年关键节点完成，结束后准确到 16 岁。
- R07：成年处境与入道渠道分流完成。
- R08：青霞地界 11 个固定节点、连接关系、当前地点初始化与最小世界骨架 UI 完成。
- legacy Action/Event/Result/End 与旧出生 wrapper 只为旧人生、旧测试与迁移兼容保留，不得继续扩张。
- 不另开仓库，不建立长期并行 `src/v2/` 或第二套 GameState。

## 内容真源与仍待后续冻结的缺口

具体出身、地点、人物、功法、物品、妖兽、事件与世界设定以 `V2_CONTENT_BIBLE.md` 为准。

仍需在对应开发轮前补齐，但当前不得临时发明：

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
- 使用 Content Bible 的 8 个出身、正式灵根、无特殊体质 + 7 体质、首版天赋；
- 出身把出生地、关系、地点种子、童年池、成年入口与资源写成可读取 seed/tag；
- 选择后只保留一个权威 `GameState`；
- `pendingBirthSelection` 进入 V3 存档 / checksum；
- selected birth seed 可由 replay 重建；
- legacy 旧出生 / Archive / replay 保持兼容。

R05 主实现：`1a69418ef90ff50e93f3c60f2c1e3bab02a81854`

### R06｜童年关键节点

- 首版 8 个出身 × 2 个节点，共 16 个正式童年节点；
- `ChildhoodProgress` 进入唯一 GameState；
- `childhood-choice` 走 SessionCommand → resolver → debug log → digest → replay → persistence；
- 第一节点约 8 岁、第二节点约 12 岁，中间年份聚合跳过；
- 测灵只确认 R05 已有灵根，绝不重抽；
- 天赋 / 体质可改变信息和可选行动；
- Chronicle 只记关键节点；
- 第二节点结束后准确到 16 岁 / `lifeStage = adult`。

R06 主实现：`0b6d1d81d2d56e2f0fe134166c122d749c05a82f`

R06-FIX：`f453d75ea292634d3efb6fce8aac8a791929dee6`

### R07｜成年 / 入道入口

- 8 个出身拥有不同成年处境和 2～3 个实际方向；
- 无灵根不会获得普通吐纳 / 基础功法修炼入口；
- 有灵根也不会自动加入青云宗；
- 散修、谢家、陆家、青云宗背景分别拥有不同的功法 / 招录渠道；
- `AdultEntryProgress` 进入唯一 GameState；
- 选项读取出身、灵根、R05 seeds 以及 R06 flags / tags / relationships；
- 成年选择记录 `adult_path:*`、`adult_access:*`、`cultivation_method_access:*`、关系与 starting-location seed；
- `adult-entry-choice` 进入 debug log / digest / replay / persistence；
- 成年选择只结算一次，不提前实现正式地图旅行、修炼或宗门玩法。

R07 主实现：`f752f0914091b0da23a3d03718a582588deb4cd9`

R07 CI：run `31863932876`，verify job `94961840185`：typecheck / test / build 全通过。

### R08｜固定世界骨架

已把青霞地界正式落成静态世界 data，而不是 UI 临时文案。

固定节点共 11 个：

1. `baishi_village`｜白石村；
2. `qingstone_town`｜青石镇；
3. `linhe_county`｜临河县；
4. `qingxia_market`｜青霞坊市；
5. `qingyun_sect`｜青云宗；
6. `blackwind_mountain`｜黑风山；
7. `blackwind_foothill`｜黑风山山脚；
8. `lingxi_valley`｜灵溪谷；
9. `lu_estate`｜陆家庄；
10. `beast_ridge`｜万兽岭；
11. `qingyun_family_quarters`｜青云宗家属区。

关键实现：

- 新增 `WorldLocationDefinition`，地点拥有类型、简介、客观危险、灵气环境、邻接、activity tags、父区域与地图坐标；
- 地图连接按 Content Bible 固定骨架建立，并保证正式连接双向、无孤立起始节点；
- `blackwind_foothill → blackwind_mountain`、`lu_estate → lingxi_valley`、`qingyun_family_quarters → qingyun_sect` 明确为固定子节点 / 父区域关系；
- 新增 `resolveWorldInitialization()`，只读取 R07 已结算的 `adultEntry.startingLocationSeed`，兼容 `flags.adult_starting_location_seed`；
- `initialize-world` 通过 SessionCommand → resolver → 现有 `SET_CURRENT_LOCATION` GameAction → debug log / digest / replay / persistence；
- world 初始化只写 `world.currentLocationId`，**没有修改 `knowledge.locations`**；
- 8 个出身在有灵根 / 无灵根两种情况下，成年路线的合法起始地点都通过测试；
- 当前地点刷新恢复，初始化命令可 replay；
- legacy adult 不会被强制套入新地点；
- 新增纯 React / CSS / SVG 的固定世界骨架图，显示 11 个地点、连接线和“你在这里”；
- 地点详情只展示名称、类型、简介、客观危险、灵气环境、父区域与相邻地点；
- 地图无旅行按钮、无探索按钮、无商店 / 宗门假入口，不推进时间；
- 非法 `currentLocationId` 会显示明确安全错误，不静默回落到青霞坊或 legacy 主循环。

R08 主实现：`74bfbe5eac57f6e8fa0ef4bbf432bd93002bcca9`

R08-FIX：`13f73a771ea47376b133df8d48c02cf7c8cabcb3`

首轮 CI 仅因 `WORLD_LOCATIONS` 的 TypeScript 字面量联合类型过窄失败；R08-FIX 只扩大静态数组类型，没有改变玩法设计。

R08-FIX CI：run `31875605946`，verify job `94990763976`：

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
- `ChildhoodProgress` / childhood resolver / 16 个童年节点；
- `AdultEntryProgress` / adult-entry resolver / 8 出身成年路径；
- 11 个固定 `WorldLocationDefinition`；
- R07 starting-location seed → `world.currentLocationId` 初始化闭环；
- 最小世界骨架 SVG 视图。

## 当前迁移主线

```text
出生三选一 ✅
→ 童年关键节点 ✅
→ 成年 / 入道入口 ✅
→ 固定世界骨架 ✅
→ 地点知识状态（R09）
→ 节点旅行与时间（R10）
→ 区域探索（R11+）
→ 资源 / 修炼 / 战斗 / 宗门 / 职业
→ 世界事件 / 完整一世
```

## 下一轮

执行：

> **R09｜地点知识状态**

R09 只负责把现有 `knowledge.locations` 真正接入 fixed-world：明确 absent = unknown，建立 `unknown → rumored → discovered` 单向知识状态；将出生 / 成年已有的地点 seed 一次性物化为玩家知识，并让地图按玩家实际知道的地点展示信息。R09 不实现旅行、不推进 travelDays、不做正式探索收益或随机地点。

具体范围以 `CURRENT_TASK.md` 为准。
