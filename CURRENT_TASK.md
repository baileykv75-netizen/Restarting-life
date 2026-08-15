# 当前任务：V2 R09 - 地点知识状态

## 本轮唯一目标

把 R08 已建立的固定世界与现有 `GameState.knowledge.locations` 真正接起来：

> **出生 / 成年已有地点 seed → 玩家初始地点认知 → Unknown / Rumored / Discovered 单向状态规则 → 地图只展示角色实际知道的信息 → 为 R10 旅行与 R11 探索留下稳定接口。**

本轮不是旅行系统，也不是探索收益系统。重点是区分：

> **世界里真实存在什么** 和 **角色现在知道什么**。

## 内容来源约束

必须先阅读：

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`
4. `V2_MIGRATION_AUDIT.md`
5. `V2_GITHUB_ROADMAP.md`
6. `HANDOFF.md`

继续使用 R08 的 11 个固定 `WorldLocationDefinition`。不得增加随机洞府、秘境或新的大区域。

## 状态语义冻结

现有类型只保存：

```ts
knowledge.locations: Record<string, 'rumored' | 'discovered'>
```

R09 正式规定：

- **Unknown**：该 id 不存在于 `knowledge.locations`；
- **Rumored**：`knowledge.locations[id] === 'rumored'`；
- **Discovered**：`knowledge.locations[id] === 'discovered'`。

状态只能：

```text
Unknown → Rumored → Discovered
Unknown → Discovered
```

禁止：

```text
Discovered → Rumored
Rumored / Discovered → Unknown
```

除非未来存在明确遗忘系统；首版没有。

## 初始知识来源

R05 已把出生地点认知写成：

- `location_seed:known:<locationId>`；
- `location_seed:rumored:<locationId>`。

R09 将其正式物化：

- `known` → `discovered`；
- `rumored` → `rumored`；
- R08 已确认的 `world.currentLocationId` 必须至少为 `discovered`。

R07 成年路线产生的起始地点不应被重复推导为另一套状态；只以当前已确认 `currentLocationId` 为准。

如果出生 seed 引用的地点不存在于 R08 fixed world，必须明确报开发错误，不得静默忽略。

## 必须实现

1. 新增最小地点知识 initializer / resolver；不得在 React 首次渲染时直接修改 GameState。
2. initializer 必须通过统一 SessionCommand / GameAction / resolver 边界，将 R05 的 `location_seed:*` 与 R08 当前地点物化到 `knowledge.locations`。
3. 初始化必须只执行一次 / 幂等。可以使用一个明确 flag，例如 `location_knowledge_initialized = true`，但不得创建第二套知识 store。
4. 继续复用现有 `SET_LOCATION_KNOWLEDGE` GameAction；不要新造重复 reducer。
5. `SET_LOCATION_KNOWLEDGE` 的升级规则必须保持：
   - unknown → rumored：允许；
   - unknown → discovered：允许；
   - rumored → discovered：允许；
   - discovered → rumored：拒绝；
   - 同状态重复写入：拒绝 / no-op。
6. 对任何知识写入先验证该 `locationId` 存在于 R08 fixed world；不能让拼错 id 污染 `knowledge.locations`。
7. 为未来系统提供一个很薄的正式接口，使后续事件 / 探索能安全调用“获得地点传闻”或“确认地点”，但 R09 本轮不要制造测试按钮、随机传闻事件或探索小游戏。
8. R09 不需要为了表现 Unknown 而把所有 11 个 id 写进 state；unknown 必须继续通过“缺少 key”表达。
9. 地图 UI 接入知识状态：
   - Discovered：显示地点正式名称、类型、完整静态简介、客观危险、灵气环境与已知连接；
   - Rumored：地图上可以显示为传闻节点，但信息必须明显更模糊；不得直接暴露完整危险、灵气环境、资源与全部详情；
   - Unknown：地图上不显示具体地点卡片 / 正式名称 / 完整详情。
10. 当前地点永远按 Discovered 处理；如果存档出现 `currentLocationId` 合法但知识缺失，initializer 必须修正，而不是让玩家“站在一个自己不知道的地方”。
11. 连接线也要遵守玩家认知：不能通过隐藏节点的完整连线结构反向泄露整个世界骨架。至少只有两端均可见时才画正式连接。
12. Rumored 节点需要短而模糊的展示文本。可以在 R08 static data 上新增 `rumorText` / 等价字段，但只能描述角色可能听到的大致印象，不新增新的剧情或资源结论。
13. R09 页面仍然没有“前往”按钮；地点是否可访问与 travelDays 属于 R10。
14. 不在 R09 实现“探索几天后发现地点”的玩家流程。R09 只把状态机、初始化、UI 和未来调用接口做好；R11 正式探索时再调用 `rumored → discovered`。
15. 保持 R05 / R06 / R07 / R08 / Archive / legacy replay 兼容。
16. 新增测试至少覆盖：
    - unknown 由缺 key 表示；
    - `location_seed:known:*` 正确物化为 discovered；
    - `location_seed:rumored:*` 正确物化为 rumored；
    - 当前地点一定 discovered；
    - 初始化幂等且不会覆盖更高知识状态；
    - rumored 可升级 discovered；
    - discovered 无法降级 rumored；
    - 非法 fixed-world id 无法进入知识状态；
    - 刷新保存后知识状态保持；
    - 初始化 command 可 replay；
    - legacy adult 不被强行初始化新地点知识；
    - 地图过滤逻辑不会把 unknown 节点或隐藏连接泄露出来。
17. 更新 `HANDOFF.md`；本轮成功后把 `CURRENT_TASK.md` 切换到 R10。

## UI 原则

1. **地图显示的是角色认知，不是开发者全知地图。**
2. Discovered 与 Rumored 必须有视觉差异，但不要使用手游式稀有度颜色。
3. Rumored 应类似“听说那里有一个地方”，不是半透明展示所有正式数据。
4. Unknown 不要写成一排 `???` 节点把世界规模全部暴露出来；真正未知就不显示。
5. 当前地点继续明确显示“你在这里”。
6. 不显示推荐等级。
7. 不计算“对当前角色的危险”；仍只保留 discovered 地点的客观危险。
8. 不增加地图拖拽、缩放或第三方地图库。

## 本轮禁止

- 不实现 R10 节点旅行；
- 不推进 travelDays；
- 不做快速旅行；
- 不做旅行事件；
- 不实现 R11 的探索时长与探索阶段；
- 不通过假按钮模拟探索发现；
- 不做随机子地点；
- 不做秘境；
- 不做资源刷新；
- 不做战斗；
- 不做商店交易；
- 不做宗门任务；
- 不做正式修炼；
- 不接 LLM API；
- 不回到 legacy `ActionPanel`。

## 验收标准

1. `knowledge.locations` 成为玩家地点认知的唯一运行时真源。
2. 世界真相与玩家知识在 UI 和状态上真正分离。
3. 同一出生 / 成年结果刷新后拥有同样的已知 / 传闻地点。
4. Unknown / Rumored / Discovered 单向状态规则有测试保护。
5. 地图不再全知展示 11 个固定地点。
6. Rumored 不泄露完整静态详情，Unknown 不泄露节点和完整连线。
7. 当前地点始终 discovered。
8. 没有提前实现旅行或探索。
9. replay 与 V3 单档保存保持正常。
10. legacy 四按钮不会重新出现。
11. `npm run typecheck` 通过。
12. `npm test` 通过。
13. `npm run build` 通过。
14. `HANDOFF.md` 已更新。

完成后立即停下，不得自行进入 R10。
