# 当前任务：V2 R06 - 童年关键节点

## 本轮唯一目标

把 R05 已确定的出生自然推进成一段短而有因果的童年：

> **根据出身生成本世固定的 2 个关键童年节点 → 玩家逐个选择 → 推进唯一 worldDay / 记录可见后果 → 童年结束到 16 岁 → `lifeStage = adult`。**

本轮只完成童年，不实现 16 岁以后的入道选择；成年入口属于 R07。

## 内容来源约束

必须先阅读并遵守：

- `V2_CONTENT_BIBLE.md` 第 9 节童年结构与各出身事件池；
- 第 30 节事件文本规则；
- R05 已写入 GameState 的 `childhood_pool:* / birthplace_seed:* / relation_seed:* / location_seed:* / adult_entry:*` 等 seed/tag。

本轮首批只落地下面 16 个已认可事件骨架，每个出身 2 个；不要自行再扩写第三批事件：

1. 白石村佃户之家：`收成不好`、`山里来的伤者`；
2. 黑风山猎户之家：`第一次跟猎`、`不该出现的脚印`；
3. 青石镇药铺之家：`混进药材里的怪草`、`出价异常的客人`；
4. 临河县武馆之家：`正式学武`、`真正的修士`；
5. 青霞坊散修之家：`第一次测灵`、`家里缺灵石`；
6. 谢家旁支：`测灵与登记`、`第一次学符`；
7. 陆家嫡系：`家族测灵`、`灵田见习`；
8. 青云宗执事后人：`宗门测灵`、`观看弟子切磋`。

正式文案必须克制、直接、基于 Content Bible 已写事实，不得用宿命、感悟或“代价已落在这一世”式句法填充篇幅。

## 必须实现

1. 新增最小 `ChildhoodProgress` / 等价权威状态，并把它放进唯一 GameState 或其正式 V2 状态结构中；不得只存在 React state。
2. 每个已选择出生在进入 childhood 时，根据其 `childhoodPoolId` 与 run seed 生成并锁定本世 **2 个首批关键节点**；刷新不能换节点、换顺序或重抽结果。
3. 童年节点必须走统一 SessionCommand / resolver / GameState 边界，不允许组件直接改时间、flags、关系或 Chronicle。
4. 两个节点安排在不同年龄段。节点之间未发生重要事情的年份直接聚合跳过，不逐日 / 逐月模拟。
5. 仍然只使用唯一 `worldDay`。最终童年完成时角色年龄必须准确到 **16 岁**，不得新增第二套年龄计时。
6. 每个事件提供 2～3 个自然行为选项；选择只展示角色合理知道的：
   - 行为本身；
   - 明确时间成本；
   - 明显直接风险；
   - 明确会付出的资源成本（如果有）。
   不展示未来事件概率、隐藏关系值或远期奖励。
7. 每个选项必须至少产生一种真实差异：
   - flags / tags；
   - 已有 relation seed 对应的轻量关系变化；
   - 已知地点 seed / 传闻 seed 的变化；
   - 少量合理属性变化；
   - 凡俗技能 / 兴趣 seed；
   - 资源变化。
   禁止把所有选项写成对称的“属性 A +1 / 属性 B +1”。
8. 灵根相关童年事件（散修 / 谢家 / 陆家 / 青云宗）不能重新随机灵根。R05 已经确定灵根；童年测灵只是**世界中的人第一次确认它并产生反应**。
9. 黑风山猎户、药铺、武馆等事件必须读取 R05 已有天赋 / 体质 rule tag，在合理时提供额外信息或选项；至少覆盖：
   - `察微知著` / `危机直觉`；
   - `百草灵体` / `辨药`；
   - `兵器熟手`；
   不要求为所有 12 天赋写专属童年分支。
10. 童年节点结束后写 Chronicle；无事发生的多年不能逐条记流水账。
11. 两个节点完成后：
   - `worldDay = birthDay + 16 * DAYS_PER_YEAR`；
   - `lifeStage = adult`；
   - 清除当前童年 pending node；
   - 保留童年形成的 flags / tags / relations / knowledge seeds；
   - 页面停在“成年起点尚未展开”的安全状态。
12. R06 不把 `location_seed:*` 直接伪造成 R08 的正式 discovered 地图。需要记录童年地点认知时，继续使用 seed/tag/flag，真实地图状态等 R08。
13. R06 不让成年后的 legacy `ActionPanel` 自动出现。即使 `lifeStage = adult`，在 R07 正式成年入口完成前也必须停在 V2 过渡页，避免玩家绕回旧四按钮。
14. 新增测试至少覆盖：
   - 同一 run seed / 同一出生得到同一两个童年节点；
   - 刷新后节点与当前进度不变；
   - 每个出身都只从自己首批两个事件中取节点；
   - 测灵事件不改变 `spiritRootId`；
   - choice 时间、flags / relation / seed 等只结算一次；
   - 两节点结束后准确 16 岁且 `lifeStage = adult`；
   - Chronicle 有关键节点但没有逐年流水账；
   - 旧 legacy session / archive / replay 不退化。
15. 更新 `HANDOFF.md`；成功后把 `CURRENT_TASK.md` 切换到 R07。

## 允许修改

- `src/types/game.ts`
- 可新增最小 `src/types/childhood.ts`
- `src/types/command.ts`
- `src/core/sessionEngine.ts`
- 可新增 `src/core/childhoodEngine.ts`
- 必要的 state digest / clone / persistence 兼容代码
- 可新增 `src/data/childhoodEvents.ts`
- `src/App.tsx`
- 可新增 1 个童年事件展示组件
- 对应 CSS 与测试
- `HANDOFF.md`
- `CURRENT_TASK.md`

如果必须扩展 GameAction，只允许增加完成 R06 所必需的最小 action；不要借此把地图、背包、关系系统整体提前实现。

## 本轮禁止

- 不实现 R07 成年入道选择；
- 不真正加入青云宗；
- 不创建真实地点地图和旅行；
- 不实现背包 / 装备；
- 不实现正式修炼、突破、战斗；
- 不实现炼丹、炼器、御兽；
- 不增加家庭经营或日常养成；
- 不把童年扩成十几个节点；
- 不实现 Content Bible 里尚未冻结的重大机缘、秘境、延寿物或高阶功法；
- 不接 LLM API；
- 不批量生成长篇童年小说；
- 不重新抽取或改变 R05 已经确定的出身、灵根、体质和天赋；
- 不让 adult 过渡状态回到 legacy 四按钮。

## UI 原则

1. 一次只展示当前关键节点，不做时间线选择菜单。
2. 事件正文约 80～200 中文字以内；能短则短。
3. 选项写“做什么”，不是“选择勇敢 / 选择谨慎”。
4. 明确可知的耗时、资源、直接危险用自然短句写在选项附近。
5. 结果只写发生了什么，不写设计说明和宿命总结。
6. 两个节点之间允许直接显示“几年过去”，不需要制造事件填空。

## 验收标准

1. R05 选完出生后能直接进入第一个童年关键节点。
2. 每世首批童年固定 2 个节点，刷新不变化。
3. 两个节点均来自当前出身对应的首批池。
4. 选择产生真实且可保存的状态差异。
5. worldDay 与节点耗时 / 年龄推进正确。
6. 童年结束年龄准确为 16 岁。
7. `lifeStage = adult`，但不进入 R07 内容、不显示 legacy 四按钮。
8. Chronicle 只记录关键童年经历。
9. R05 三选一和旧 Archive / replay 不退化。
10. `npm run typecheck` 通过。
11. `npm test` 通过。
12. `npm run build` 通过。
13. `HANDOFF.md` 已更新。

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`
4. `V2_MIGRATION_AUDIT.md`
5. `V2_GITHUB_ROADMAP.md`
6. `HANDOFF.md`

完成后立即停下，不得自行进入 R07。
