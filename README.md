# Restarting Life

纯文字、规则驱动、不接入大模型 API 的修仙人生 Roguelike。

游戏设计与 V1 技术边界以 [`GAME_DESIGN_V1.md`](./GAME_DESIGN_V1.md) 为唯一功能基线。

## 当前开发阶段

**阶段 5：正式内容扩充**

阶段 0～4 已通过 GitHub Actions 自动验收。阶段 5 不再发明新的玩法系统，主要工作是把已经验证通过的 `Event → Condition → Choice → Effect` 结构填成第一批正式修仙内容，并用自动测试锁死内容规模与长期因果链。

## 当前 V1 正式内容规模

```text
30 个普通事件
10 个奇遇事件
5 条长期事件链（每条 3 个节点）
3 个大境界突破事件
共 53 个正式事件
```

阶段 3 的 8 个 `test_` 事件继续保留为回归测试，但不会进入正式游戏事件池。

### 30 个普通事件

按来源拆分：

- 凡人 / 散修生计：6 个；
- 修炼：8 个；
- 青云宗：8 个；
- 历练：8 个。

对应文件：

```text
src/data/events/
├─ mortalEvents.ts
├─ cultivationEvents.ts
├─ sectEvents.ts
└─ explorationEvents.ts
```

### 10 个奇遇

统一放在：

```text
src/data/events/encounterEvents.ts
```

包括山门来客、无灵根老乞机缘、李青受伤、长老收徒、断崖古洞、灵药之争、夜半鬼市、一梦问道、无名古殿、游方丹师。

奇遇只通过较低 `weight`、属性条件、身份条件、Flag 和 `once` 控制，不额外建立“奇遇引擎”。

## 五条长期因果链

定义清单位于：

```text
src/data/events/contentManifest.ts
```

当前五条：

1. **无灵根改命**：路边老乞 → 旧梦葫芦 → 崖底石髓；
2. **李青善缘**：受伤同门 → 同门论道 → 旧日善缘；
3. **师门传承**：长老驻足 → 师门点拨 → 师门旧匣；
4. **古修遗府**：断崖石门 → 石门残纹 → 再入断崖；
5. **陈羽旧怨**：灵药之争 → 林中伏击 → 旧怨了结。

这些“因果”底层仍然只是：

```text
Flag + Tag + Relationship + Condition
```

没有隐藏的自由剧情逻辑。

## 无灵根改命的实现边界

出生时 `spiritRootId = none` 仍然保持不变，代表先天检测结果；极稀有事件链成功后不会偷偷改出生历史，而是写入：

```text
reformed_spirit_root_multiplier = 0.7
has_spirit_root
spirit_root:reformed
has_cultivation_method = true
```

修炼引擎与突破引擎统一读取“有效灵根倍率”。因此这条路线不是文字彩蛋：完成后可以真实引气、进入炼气并继续走完整仙途。

## 修炼事件接入

阶段 4 已验证基础闭环，阶段 5 按策划补齐：

```text
点击修炼
→ 基础修为结算
→ 时间推进 12 个月
→ 小境界自动结算
→ 寿元检查
→ 若仍存活，从 cultivation 事件池抽取一次事件
```

任何事件产生的 `addCultivation` 也立即调用同一套小境界晋级规则，避免出现“事件送了修为但境界必须等下一年才刷新”的不同步问题。

## 四类行动

- `cultivate`：12 个月，基础修为 + 修炼事件；
- `explore`：6 个月，历练 / 奇遇 / 长期因果事件；
- `livelihood`：6 个月，凡人 / 散修生计或青云宗事件；
- `breakthrough`：进入专属突破事件，再由 Seeded RNG 判定。

当前仍然没有：

- 回合制战斗；
- 装备系统；
- 法宝系统；
- 炼丹子系统；
- 多宗门；
- 自由文本输入；
- 大模型 API。

## 数据层目录

```text
src/data/events/
├─ formalEvents.ts             # 正式事件总入口
├─ mortalEvents.ts             # 6 个普通生计事件
├─ cultivationEvents.ts        # 8 个普通修炼事件
├─ sectEvents.ts               # 8 个普通宗门事件
├─ explorationEvents.ts        # 8 个普通历练事件
├─ encounterEvents.ts          # 10 个奇遇 / 五条链的起点
├─ chainEvents.ts              # 五条长期链的后续 10 个节点
├─ breakthroughEvents.ts       # 3 个突破事件
├─ contentManifest.ts          # 长期链清单
└─ testEvents.ts               # 阶段 3 回归测试专用
```

## 自动验收

每次提交到 `main` 后，GitHub Actions 自动执行：

```bash
npm install
npm run typecheck
npm test
npm run build
```

阶段 5 额外验收：

- 正式普通事件必须恰好 30 个；
- 奇遇必须恰好 10 个；
- 长期事件链必须恰好 5 条，每条 3 个真实存在的节点；
- 正式事件总数必须为 53；
- 所有 ID 唯一，引用合法，权重大于 0；
- 事件修为奖励必须立即触发小境界结算；
- 修炼行动必须真实触发 `cultivation` 事件；
- 无灵根改命路线必须真实进入炼气并获得非零修炼收益；
- 阶段 4 的凡人→金丹与寿终回归测试不能退化；
- TypeScript、全部测试和生产构建必须全绿。

## 下一阶段

阶段 6 开始处理 **存档、前世档案与可重放调试记录**：`localStorage`、`schemaVersion`、事务式保存、操作日志、人生结算与前世记录。阶段 6 不再扩充正式剧情。
