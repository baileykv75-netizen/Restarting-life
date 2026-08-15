# HANDOFF.md

# 《此世问长生》V2.0 当前交接

## 当前状态

- 当前开发主线：**R07 成年 / 入道入口已完成，下一轮进入 R08 固定世界骨架。**
- R00.1～R00.3：迁移、存档 V3 与开发规则已完成。
- R01：唯一 `GameState` V2 扩展完成。
- R02：统一 `GameAction / SessionCommand / reducer / replay` 边界完成。
- R03：V3 单档自动保存与恢复回归完成。
- R04：V2 Game Shell 完成。
- C00：`V2_CONTENT_BIBLE.md` 为首版具体内容真源。
- R05：出生三选一完成。
- R06：8 个出身 × 2 个童年关键节点完成，结束后准确到 16 岁。
- R07：16 岁成年处境与入道渠道分流完成；不同出身、灵根与童年结果已真实影响成年入口。
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
- 三候选出身互不重复，强弱不做补偿；
- 使用 Content Bible 的 8 个出身、正式灵根、无特殊体质 + 7 体质、首版天赋；
- 出身把出生地、关系、地点种子、童年池、成年入口、资源写成可读取 seed/tag；
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

关键实现：

- `ChildhoodProgress` 进入唯一 GameState；
- `childhood-choice` 走 SessionCommand → resolver → debug log → digest → replay → persistence；
- 第一节点约 8 岁、第二节点约 12 岁，中间年份聚合跳过；
- 测灵只确认 R05 已有灵根，绝不重抽；
- 天赋 / 体质可改变信息和可选行动；
- Chronicle 只记关键节点；
- 第二节点结束后准确到 16 岁 / `lifeStage = adult`；
- 不提前展开成年、地图或旧四按钮。

R06 主实现：`0b6d1d81d2d56e2f0fe134166c122d749c05a82f`

R06-FIX：`f453d75ea292634d3efb6fce8aac8a791929dee6`

### R07｜成年 / 入道入口

已完成 8 个出身的正式成年分流：

- 白石村佃户：村中生活 / 宗门招录线索 / 黑风山脚生计 / 修士线索；
- 黑风山猎户：猎路 / 宗门招录 / 商路 / 黑风异常；
- 青石镇药铺：药铺 / 灵药贸易进青霞坊 / 凡俗医药 / 采药圈；
- 临河县武馆：镖局 / 修士引荐 / 凡俗武艺 / 青石商路；
- 青霞坊散修：坊市生计 / 家传《小周天吐纳法》 / 无灵根坊市差事 / 散修圈；
- 谢家旁支：符铺事务 / 家族基础修炼 / 青云宗渠道 / 无灵根家族岗位；
- 陆家嫡系：庄务 / 家族修炼 / 青云宗招录 / 无灵根庄务管理；
- 青云宗执事后人：宗门外围事务 / 正式招录 / 《青元引气诀》启蒙 / 无灵根外围差事。

关键规则：

- 新增 `AdultEntryProgress`，成年选择后进入唯一 GameState；
- R07 不修改 R06 已有童年命令语义，旧童年 replay 不因新字段被静默改变；
- 成年页面在未结算时由当前 GameState **确定性推导** 2～3 个选项，不依赖重新抽 RNG；
- 选项读取 `backgroundId`、`spiritRootId`、R05 的 `entry:* / relation_seed:* / location_seed:* / birth_resource_seed:*`，以及 R06 flags / tags / relationships；
- 至少白石村、猎户、药铺、武馆等童年结果会改变成年页可见信息；
- 无灵根不会获得任何普通吐纳 / 基础功法修炼入口；
- 有灵根也不会自动加入青云宗；宗门招录和引荐只写成机会 / access seed；
- 散修、谢家、陆家、青云宗背景的有灵根角色分别拥有真实而不同的基础功法渠道；
- 只记录 `adult_path:*`、`adult_access:*`、`cultivation_method_access:*`、关系与起始地点 seed，不实现 R16 的正式功法 / 修炼循环；
- `world.currentLocationId` 与 `knowledge.locations` 在 R07 仍未正式物化，留给 R08/R09；
- 成年选择走 `adult-entry-choice` → Session → debug log → digest → replay → persistence；
- 成年选择只结算一次并写入 Chronicle；
- 结算后停在“成年起点已确定”安全页，不出现 legacy 四按钮。

R07 主实现：`f752f0914091b0da23a3d03718a582588deb4cd9`

R07 CI：run `31863932876`，verify job `94961840185`：

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
- `AdultEntryProgress` / adult-entry resolver / 8 出身成年路径数据；
- 成年起始地点 seed 与功法 / 招录 access seed。

## 当前迁移主线

```text
出生三选一 ✅
→ 童年关键节点 ✅
→ 成年 / 入道入口 ✅
→ 固定世界骨架（R08）
→ 地点知识状态（R09）
→ 节点旅行与时间（R10）
→ 区域探索（R11+）
→ 资源 / 修炼 / 战斗 / 宗门 / 职业
→ 世界事件 / 完整一世
```

## 下一轮

执行：

> **R08｜固定世界骨架**

R08 只负责把 Content Bible 已冻结的青霞地界做成静态地点数据、连接关系和最小地图视图，并把 R07 的成年起始地点 seed 接到正式 `world.currentLocationId`。不实现地点知识状态流转、旅行耗时、探索、战斗或资源刷新。

具体范围以 `CURRENT_TASK.md` 为准。
