# Restarting Life

纯文字、规则驱动、不接入大模型 API 的修仙人生 Roguelike。

游戏设计与 V1 技术边界以 [`GAME_DESIGN_V1.md`](./GAME_DESIGN_V1.md) 为唯一功能基线。

## 当前开发阶段

**阶段 3：事件引擎**

阶段 0、1、2 已通过 GitHub Actions 自动验收。阶段 3 只建立数据驱动事件系统，并使用 8 个明确以 `test_` 开头的测试事件验证机制；这些测试事件不是正式游戏剧情。

## 阶段 3 固定结构

```text
GameEvent
→ Condition[]
→ EventChoice
→ Effect[]
→ nextEventId / EventQueue
```

事件数据不得直接修改 `GameState`。所有条件统一经过 `conditionEngine.ts`，所有效果统一经过 `effectEngine.ts`。

### Condition 白名单

- ageMin / ageMax
- realm
- stageMin / stageMax
- statMin / statMax
- hasTag / notTag
- flagEquals / flagMissing
- faction
- relationshipMin
- resourceMin

### Effect 白名单

- addStat
- addSpiritStones
- addCultivation
- addTag / removeTag
- setFlag
- addRelationship
- advanceTime
- queueEvent
- killPlayer
- changeFaction
- setRealm

`setRealm` 默认禁止执行，只有 `breakthrough` 类事件解析时才获得权限。

## 事件运行规则

随机事件：

```text
读取事件池
→ category 过滤
→ Condition 过滤
→ 排除已经发生的 once 事件
→ seeded weightedPick
→ 写入 currentEventId + history
```

事件选择：

```text
验证当前事件
→ 验证 Choice Condition
→ 清空当前事件
→ 按顺序执行 Effect
→ 每次时间推进立即检查寿终
→ 死亡/通关立即停止后续 Effect
→ nextEventId 放到队首
→ 处理 EventQueue
```

`nextEventId` 和 `queueEvent` 是明确的事件链调度，不重新进入随机事件池；`nextEventId` 优先于同一选择中排队的普通 `queueEvent`。`once` 事件仍然只能激活一次。

## GameState 新增事件状态

```ts
events: {
  currentEventId: string | null
  queue: string[]
  history: string[]
}
```

这些状态属于唯一真相来源。UI 后续只能读取并调用引擎，不得自行维护另一套事件历史。

## 阶段 3 测试事件

当前仅有 8 个测试事件，用于验证：

- 年龄 / 属性 / 资源 / 势力 / Flag / Relationship 条件；
- Tag 与 Flag 写入；
- 资源与属性变化；
- 时间推进；
- `nextEventId`；
- `queueEvent`；
- `once`；
- 死亡后立即停止；
- Seeded RNG 的事件抽取复现。

所有测试事件 ID 必须以 `test_` 开头，正式内容阶段再另建正式事件文件。

## 主要文件

```text
src/
├─ core/
│  ├─ conditionEngine.ts
│  ├─ effectEngine.ts
│  ├─ eventEngine.ts
│  ├─ gameState.ts
│  └─ rng.ts
├─ data/events/
│  ├─ testEvents.ts
│  └─ eventDataIntegrity.test.ts
└─ types/
   ├─ event.ts
   └─ game.ts
```

## 自动验收

每次提交到 `main` 后，GitHub Actions 自动执行：

```bash
npm install
npm run typecheck
npm test
npm run build
```

阶段 3 验收要求：Condition / Effect 白名单可用，事件抽取可复现，once 不重复，事件链顺序稳定，坏引用在启动测试中失败，死亡后不继续执行效果或后续事件，并且 TypeScript、单元测试和生产构建全部通过。

## 下一阶段

阶段 4 才开始搭建第一条真正可玩的纵向闭环：凡人 → 寻找仙缘 → 炼气 → 筑基 → 金丹 / 死亡，并逐步接入青云宗、散修和四类行动。阶段 4 仍然先用少量内容验证闭环，不一次性填充 30+ 正式事件。
