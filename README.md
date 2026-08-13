# Restarting Life

纯文字、规则驱动、不接入大模型 API 的修仙人生 Roguelike。

游戏设计与 V1 技术边界以 [`GAME_DESIGN_V1.md`](./GAME_DESIGN_V1.md) 为唯一功能基线。

## 当前开发阶段

**阶段 6：存档与可重放记录**

阶段 0～5 已通过 GitHub Actions 自动验收。阶段 6 不增加正式剧情或玩法系统，只解决三件事：**完整存档、前世档案、可复现调试**。

## 当前正式内容

阶段 5 已冻结第一批 V1 内容：

```text
30 个普通事件
10 个奇遇
5 条长期事件链（每条 3 节点）
3 个大境界突破事件
共 53 个正式事件
```

阶段 3 的 8 个 `test_` 事件仅用于回归测试，不进入正式事件池。

## 阶段 6 状态结构

### GameSession

```text
GameSession
├─ state: GameState
└─ debugLog: DebugLogEntry[]
```

`GameState` 仍然是游戏规则唯一真相来源。调试记录只描述“玩家做了什么以及前后状态摘要”，不反向修改游戏状态。

### DebugLogEntry

每个成功事务记录：

- `seq`：本世操作序号；
- `command`：玩家行动或事件选择；
- `timeMonthsBefore / After`；
- `eventIdBefore / After`；
- `rngBefore / After`；
- `effectTypes`；
- `stateDigestBefore / After`。

失败或非法操作不写日志，因此同一条日志可以直接用于重放。

## 可重放调试

重放规则：

```text
同一个 runSeed
+ 同一个 runId
+ 同一串 SessionCommand
= 同一个最终 GameState 摘要与 rngState
```

`replayEngine.ts` 会从出生状态重新开始，逐条调用正常游戏引擎，而不是直接把旧状态复制回来。

这意味着以后出现：

> “第 8 世某次历练后事件乱跳”

只需要该世 `runSeed + debugLog`，就能用规则引擎重新走一遍定位问题。

## 前世档案

终局后生成 `LifeRecord`，保存：

- 本世序号；
- Seed；
- 最终状态摘要；
- 出身 / 灵根 / 天赋 / 身份；
- 五项属性；
- 最终资源和境界；
- 事件历史；
- 人生评价；
- 本世完整可重放操作记录。

同一个 `runId` 只允许归档一次。进入下一世不会删除旧档案。

## 人生总结

当前结算层根据最终状态生成：

```text
人生称号
最终境界
享年
结局 / 死因
最大机缘
主要遗憾
```

例如：

- 金丹 → `金丹真人`；
- 筑基 → `筑基修士`；
- 炼气 → `炼气行者`；
- 未入仙途 → `凡尘一世`。

后续 UI 只负责展示这些已经算好的数据，不自行判断称号或死因。

## 本地存档

存档入口：

```text
src/store/saveRepository.ts
```

V1 使用浏览器本地存储，键名固定：

```text
restarting-life:v1
```

保存对象：

```text
PersistentGame
├─ schemaVersion: 1
├─ currentSession
├─ archives[]
└─ meta.totalRuns
```

### 事务原则

游戏引擎先完整执行一次行动 / 选择，产生新的稳定 `GameSession`，然后才把整个 `PersistentGame` 一次性写入存储。

禁止：

```text
执行 Effect A
→ 保存
→ 执行 Effect B
→ 保存
```

这样刷新页面不会加载到“半个事件”的中间状态。

### 存档校验

保存时同时写入基于稳定序列化结果的短校验值。读取时重新计算；如果 JSON 被截断、手工改坏或内容与校验不一致，直接报错，不把损坏数据继续送入游戏引擎。

该校验只用于本地游戏存档完整性，不承担密码学安全用途。

## 阶段 6 关键文件

```text
src/types/
├─ command.ts
└─ persistence.ts

src/core/
├─ sessionEngine.ts
├─ replayEngine.ts
├─ persistentGameEngine.ts
├─ lifeSummary.ts
└─ stateDigest.ts

src/store/
└─ saveRepository.ts
```

## 自动验收

阶段 6 必须验证：

- 成功操作会写日志，非法操作不会污染日志；
- 日志包含 RNG 前后状态与 GameState 摘要；
- 同 Seed + 同操作可以重放到相同结果；
- 寿终 / 通关后只归档一次；
- 新一世保留已有前世档案；
- `totalRuns` 正确递增；
- 完整存档可保存并原样恢复；
- 被修改但未同步校验值的存档必须拒绝加载；
- 阶段 0～5 的所有回归测试继续通过；
- TypeScript、单元测试和生产构建全部通过。

## 下一阶段

阶段 7 才开始真正做玩家界面：出生页、角色状态、事件卡、四类行动、突破交互、人生结算、前世档案和本地继续游戏。阶段 7 只接已经验证过的引擎与存档层，不新增核心规则。
