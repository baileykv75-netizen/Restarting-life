# 当前任务：UX-02C 聚落成为真实信息节点

## 背景

UX-02A 已把成年自由行动改成固定游戏壳层；UX-02B 已把青霞地界从节点关系图改成可交互的地形地图，并通过真实 Pages artifact 的桌面与 390px 移动端试玩。

现在最明显的问题变成：地图更像世界了，但青石镇、青霞坊市、临河县等有人烟地点仍缺少“为什么要来这里”的真实行为。

现有仓库还没有成熟的商店 / 交易经济系统，旧 `livelihood` 也是 V1 随机事件壳。因此本轮不做假的商铺、客栈按钮，先补一个建立在现有地点知识系统上的真实闭环。

R27 炼丹继续暂停。

---

## 本轮目标

让有人烟的地点承担“信息节点”功能：

```text
抵达聚落 / 坊市 / 家族据点 / 宗门
→ 打听去路 · 1日
→ 时间真实推进 1 日
→ 从当前位置未知的相邻地点中获得一条传闻
→ knowledge: unknown → rumored
→ 地图立即出现新的传闻地点
```

这不是直接发现地点，也不提供可执行旅行路线；玩家仍需要通过现有探索 / 行路机制真正抵达并发现那里。

---

## 规则

- 只在 adult + location knowledge 已初始化时可用；
- 当前地点必须已经 discovered；
- 可用地点类型：凡俗聚落、修仙坊市、家族据点、宗门；
- 只从当前地点 authoritative `adjacentLocationIds` 中寻找未知地点；
- 已 rumored / discovered 的地点不会重复获得；
- 每次只获得一条新传闻；
- 每次消耗 1 个 authoritative `worldDay`；
- 时间推进必须复用 `advanceWorldTime()`，寿元、中毒、妖兽生态等时间系统照常结算；
- 若这 1 日内角色死亡，不再强行写入传闻；
- 不新增第二套地图状态、随机事件壳或经济系统。

---

## 架构

玩家入口必须走现有：

```text
WorldMapPanel
→ SessionCommand { type: 'game-action' }
→ GameAction: GATHER_LOCAL_RUMOR
→ gameActionReducer
→ localRumorEngine
→ authoritative GameState
→ debug log / save / replay path
```

UI 不直接修改 `knowledge` 或 `worldDay`。

---

## 玩家界面

当前位置仍以情境行动栏为主。

当存在可获得的新传闻时显示：

`打听去路 · 1日`

当周边没有新的未知相邻地点时，这个按钮不显示，不做灰色占位。

行动完成后不进入 ResultPanel，不打断地图；地图直接更新出新的“传闻”地点。

---

## 本轮明确不做

- 商店 / 买卖；
- 客栈；
- 完整 NPC 社交；
- 城镇随机事件扩写；
- 新货币 / 价格字段；
- R27 炼丹。

这些以后必须建立在真实底层规则上，不能先造空按钮。

---

## 验收标准

- Typecheck 通过；
- Vitest 全量通过；
- Production build 通过；
- Pages 部署成功；
- 青石镇等合格地点在有未知相邻地点时显示“打听去路 · 1日”；
- 点击后 `worldDay + 1`；
- 恰好一个 unknown 相邻地点变成 rumored；
- 已知地点不被降级或重复；
- 荒野不出现该行为；
- 没有新传闻时不出现按钮；
- debug log 记录 `game-action:GATHER_LOCAL_RUMOR`；
- 存档 / 读取不丢失新传闻；
- 真实 Pages artifact 中地图立即出现新的传闻标记；
- 桌面与 390px 移动端入口不把主界面重新撑成长页面。

**UX-02C 实际试玩通过前仍不开始 R27。**
