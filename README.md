# Restarting Life

纯文字、规则驱动、不接入大模型 API 的修仙人生 Roguelike。

游戏设计与 V1 技术边界以 [`GAME_DESIGN_V1.md`](./GAME_DESIGN_V1.md) 为唯一功能基线。

## 当前开发阶段

**阶段 2：出生系统**

阶段 0 与阶段 1 均已通过 GitHub Actions 自动验收。阶段 2 只把人物出生所需的数据表和确定性生成流程接到 `GameState`，不加入正式剧情、宗门流程或事件系统。

阶段 2 固定生成顺序：

```text
基础属性
→ 出身
→ 灵根
→ 天赋 1
→ 天赋 2
```

所有步骤共用同一个 `rngState`。因此：

```text
同一 runSeed = 同一出生结果
```

## V1 出生内容

- 5 个出身：山村猎户之子、小镇商贾之家、没落书香门第、修仙家族旁系、无依孤儿
- 6 类灵根：无灵根、五灵根、三灵根、双灵根、单灵根、特殊灵根
- 10 个天赋，每世无放回抽取 2 个
- 五项基础属性在修正前分别从 4~6 中确定性抽取
- 出身与天赋的属性 / 灵石修正全部集中在 `src/data`，不写进 UI
- 灵根倍率严格采用 `GAME_DESIGN_V1.md` 中的 0 / 0.70 / 0.90 / 1.05 / 1.20 / 1.25

灵根当前抽取权重为：

| 灵根 | 权重 |
|---|---:|
| 无灵根 | 20 |
| 五灵根 | 30 |
| 三灵根 | 25 |
| 双灵根 | 15 |
| 单灵根 | 8 |
| 特殊灵根 | 2 |

权重属于集中数据，可后续平衡调整，但不能散落在逻辑代码中。

## 主要文件

```text
src/
├─ core/
│  ├─ birthEngine.ts
│  ├─ gameState.ts
│  └─ rng.ts
├─ data/
│  ├─ backgrounds.ts
│  ├─ spiritRoots.ts
│  ├─ talents.ts
│  └─ dataIntegrity.test.ts
└─ types/
   ├─ content.ts
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

## 阶段 2 验收条件

- 同一个 seed 的完整出生结果必须完全相同；
- 每局恰好获得 2 个且不重复的天赋；
- 出身、灵根和天赋 ID 全局唯一；
- 出生结果只能引用数据表里存在的 ID；
- 初始属性不得低于 1；
- 5 / 6 / 10 的内容数量由测试锁定；
- 灵根修炼倍率由测试锁定；
- 所有随机权重必须为正数；
- TypeScript、单元测试和生产构建全部通过 CI。

阶段 2 通过前，不进入事件引擎。
