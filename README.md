# Restarting Life

纯文字、规则驱动、不接入大模型 API 的修仙人生 Roguelike。

游戏设计与 V1 技术边界以 [`GAME_DESIGN_V1.md`](./GAME_DESIGN_V1.md) 为唯一功能基线。

## 当前开发阶段

**阶段 4：完整修仙闭环**

阶段 0～3 已通过 GitHub Actions。阶段 4 第一次把出生、事件、行动、修炼、突破、寿元和结局串成一条纵向闭环；内容仍然刻意保持很少，先证明整个游戏能够从头运行到结局。

## 当前可运行闭环

```text
凡人
→ 谋生 / 寻找仙缘
→ 青云宗或散修身份
→ 引气入体
→ 炼气 1～9 层
→ 筑基
→ 筑基前 / 中 / 后期
→ 结丹
→ 金丹通关
```

任何阶段都可能因寿元耗尽结束本世。突破可以失败，失败后保留当前境界并扣除对应资源，满足条件后可以再次尝试。

## 四类行动

- `cultivate`：闭关 12 个月，根据根骨、悟性、灵根和境界系数获得修为；
- `explore`：推进 6 个月后进入历练事件池；
- `livelihood`：推进 6 个月，凡人 / 散修进入凡俗生计池，青云宗弟子进入宗门事件池；
- `breakthrough`：不直接判定结果，先进入专属突破事件。

有事件正在处理时，普通行动全部锁定，必须先解决当前事件。

## 修炼规则

基础修为公式严格采用 V1 策划：

```text
base = 55
attributeFactor = 1 + (根骨 + 悟性 - 10) × 0.03
rootFactor = 灵根倍率
realmFactor = 当前境界效率
finalGain = round(base × attributeFactor × rootFactor × realmFactor)
```

当前 `realmFactor`：炼气 `1.00`，筑基 `0.75`。

小境界是确定性成长：

- 炼气每层消耗 100 修为，自动从 1 层推进到 9 层；
- 筑基前期 → 中期消耗 300；
- 筑基中期 → 后期消耗 400；
- 炼气九层保留至少 100 修为后才可尝试筑基；
- 筑基后期保留至少 500 修为后才可尝试结丹。

## 突破规则

突破是两步流程：

```text
选择 breakthrough
→ 进入 breakthrough 专属事件
→ 玩家选择 attempt
→ breakthroughEngine 使用 Seeded RNG 判定
```

通用 `eventEngine` 被明确禁止直接解析 `breakthrough/attempt`，避免 UI 误接接口后跳过概率判定。

基础成功率：

- 引气入体：60%
- 筑基：35%
- 金丹：25%

修正公式：

```text
chance = baseChance
       + (根骨 - 5) × 0.03
       + (悟性 - 5) × 0.03
       + (心性 - 5) × 0.02
```

最终限制在 5%～95%。

当前失败代价：

| 突破 | 时间 | 修为损失 | 根骨损失 |
|---|---:|---:|---:|
| 引气入体 | 1个月 | 0 | 0 |
| 筑基 | 6个月 | 50 | 1 |
| 结丹 | 12个月 | 100 | 1 |

这些数值集中在 `src/data/realms.ts`，以后平衡调整只改数据表。

## 出生与事件连接

出生时除了具体灵根 ID，还会写入：

```text
has_spirit_root / no_spirit_root
spirit_root:<id>
```

正式事件只通过 Condition / Tag / Flag 判断资格，不在 UI 中硬编码“某灵根能不能触发某剧情”。

## 阶段 4 正式事件

当前只有 8 个极小正式事件，用来撑通闭环：

- 山门来客；
- 凡尘营生；
- 散修委托；
- 宗门差事；
- 山涧灵草；
- 引气入体；
- 筑基；
- 结丹。

阶段 3 的 `test_` 事件仍保留，仅作为事件引擎回归测试，不会混入正式事件池。

## 关键文件

```text
src/core/
├─ actionEngine.ts
├─ breakthroughEngine.ts
├─ cultivationEngine.ts
├─ conditionEngine.ts
├─ effectEngine.ts
└─ eventEngine.ts

src/data/
├─ realms.ts
└─ events/
   ├─ formalEvents.ts
   └─ testEvents.ts
```

## 自动验收

每次提交到 `main` 后自动执行：

```bash
npm install
npm run typecheck
npm test
npm run build
```

阶段 4 的集成测试必须真实跑通两条路线：

1. **金丹路线**：凡人 → 山门仙缘 → 青云宗 → 引气 → 炼气九层 → 筑基失败并重试 → 筑基后期 → 结丹失败并重试 → 金丹通关；
2. **寿终路线**：无灵根凡人在时间推进到 80 岁时寿元耗尽，死亡后不得继续抽取事件。

只有这两条路线与全部单元测试、TypeScript、生产构建同时通过，阶段 4 才算封板。

## 下一阶段

阶段 5 才开始扩充正式内容：把事件从“验证闭环用的 8 个”逐步扩充到约 30 个普通事件、8～10 个奇遇和 5 条长期事件链。阶段 5 不再发明新的核心引擎，主要工作应当是填数据、调权重和做内容一致性测试。
