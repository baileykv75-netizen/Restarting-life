# 当前任务：V2 R05 - 出生三选一

## 本轮唯一目标

把当前 landing 上“点击后直接随机生成一个 16 岁角色”的 legacy 开局，替换为 V2.0 正式的：

> **一次生成三个完整出生候选 → 自动保存 → 玩家选择其一 → 写入唯一 GameState → 进入童年阶段。**

本轮只做“这一世是谁”的选择，不开始童年事件本身。

## 内容来源约束

R05 的正式世界内容必须读取并遵守 `V2_CONTENT_BIBLE.md`，不得让 Codex 自行改名、临时发明或用旧路线中的占位内容替换已冻结内容。

本轮具体使用：

- `V2_CONTENT_BIBLE.md` 第 5 节：8 个正式出身；
- 第 6 节：灵根体系；
- 第 7 节：无特殊体质 + 7 个正式特殊体质；
- 第 8 节：首版正式 12 个天赋。

本轮只把这些内容作为出生候选和后续可读的结构化定义接入，不得提前实现童年、地图、战斗、职业或事件逻辑。

## 必须实现

1. `phase = birth-selection` 必须成为真正可玩的出生选择阶段，不再只是一个空壳状态。
2. 每一世一次性生成 **3 个不同候选**；候选至少完整展示：
   - 出身；
   - 灵根；
   - 体质；
   - 1～3 个主要天赋；
   - 明确可理解的初始资源 / 规则效果；
   - 与成年入口有关的出身倾向或标签（只展示真实已写入数据的内容）。
3. 三个候选生成后必须进入 V3 单档：
   - 刷新页面仍是同一组三人；
   - 关闭页面再打开仍是同一组三人；
   - 不提供“刷新候选 / 重抽 / 换一批”按钮；
   - 不能通过重复点击“开始”重新生成当前这一世的三人。
4. 候选生成必须继续使用 seeded RNG；同一 pending birth seed 可复现同一组三人。
5. `PersistentGame` 允许增加**最小的 pending birth selection 状态**，但不得创建第二套长期角色 store。
6. 选择一个候选后：
   - 建立唯一 `GameState`；
   - `GameState.lifeStage = childhood`；
   - `PersistentGame.phase = life`；
   - `identity.backgroundId / spiritRootId / physiqueIds / talentIds` 正确写入；
   - 初始属性、灵石、tags / flags 等候选真实效果一次性结算；
   - 未选两个候选从当前 pending selection 中清除；
   - 选择结果立即自动保存。
7. 出身不能继续只是“属性 + 灵石”包装。扩展现有 background 数据时，至少要能表达 2 类以上真正影响后续人生的结构性信息，例如：
   - 成年入道入口类型 / 身份倾向；
   - 初始关系种子；
   - 已知世界 / 出生地倾向（R08 地图落地前只存合法 seed/tag，不伪造可访问地图）；
   - 童年事件池倾向；
   - 初始资源 / 身份标签。
   数值修正可以保留，但只能是其中一部分。
8. 天赋必须有明确机制说明，不再只靠文学描述 + 数值加点。数据结构至少允许表达若干类真实规则：
   - 修炼倾向；
   - 探索 / 感知倾向；
   - 特殊事件解锁 tag；
   - 战斗 / 职业倾向；
   - 属性修正。
   R05 不需要把未来战斗/职业系统提前实现，但候选数据必须结构化，后续系统能直接读取。
9. 新增正式 `Physique` 数据定义，并让候选显示 0～1 个主要体质；普通角色可以是“无特殊体质”。不得把体质等同于第三组纯属性天赋。
10. 首轮内容量严格控制：
    - 出身：固定使用 Content Bible 的 8 个正式出身；
    - 天赋：固定使用 Content Bible 的首版 12 个正式天赋；
    - 体质：固定使用“无特殊体质 + 7 个正式特殊体质”；
    - 灵根继续复用并按 Content Bible 做最小扩展，不做纯度或随机词条系统。
11. 保留 legacy 读取能力：已有旧人生 / Archive 仍能正确显示其 background / talent 等历史 ID；不要为了 R05 删除旧内容导致旧档案报错。
12. 新增一个真正的出生选择 UI；重点是信息清楚、可比较，不堆大段小说式文案。
13. 选择按钮必须明显，但不得用“推荐 / 最优 / 稀有度评分”暗示系统替玩家做决定。
14. 出生候选之间允许明显不平衡；不要偷偷做三选一强制等价补偿。
15. 更新测试覆盖：
    - 同 seed 候选可复现；
    - 三个候选 ID / 实体不同；
    - pending selection 保存 / 加载保持；
    - 刷新不会重抽；
    - 不允许二次选择；
    - 选择后进入 `life + childhood`；
    - 选中候选的数据真实写入 GameState；
    - 未选候选不残留为当前角色状态。
16. 更新 `HANDOFF.md`，完成后把 `CURRENT_TASK.md` 切换到 R06。

## 关于当前 legacy `generateBirthState`

可以重构，但必须小步迁移。

推荐结构：

```text
create / ensure pending birth selection
→ generateBirthCandidates(seed)
→ persist three candidates
→ chooseBirthCandidate(candidateId)
→ create one authoritative GameState
```

如果旧测试 / 旧 Archive 仍需要 legacy wrapper，可以暂时保留兼容入口，但不得继续让新玩家绕过三选一直接生成角色。

## 允许修改

- `src/core/birthEngine.ts`
- `src/core/persistentGameEngine.ts`
- `src/store/browserGameStore.ts`
- 必要的 persistence / migration 类型与 clone 逻辑
- `src/types/game.ts`
- `src/types/content.ts`
- 可新增最小 `src/types/birth.ts`
- `src/data/backgrounds.ts`
- `src/data/talents.ts`
- `src/data/spiritRoots.ts`（最小扩展）
- 可新增 `src/data/physiques.ts`
- `src/App.tsx`
- 可新增 1 个出生选择展示组件
- 对应 CSS 与测试
- `HANDOFF.md`
- `CURRENT_TASK.md`

## 本轮禁止

- 不实现童年事件内容；只在选择后进入 `lifeStage = childhood`。
- 不进入成年 / 入道流程；留给 R07。
- 不新增真实地点地图、旅行、探索。
- 不新增背包、装备、战斗、宗门、炼丹、炼器、御兽。
- 不新增元成长 / reroll 点数。
- 不允许重新生成当前三候选。
- 不做候选平衡补偿算法。
- 不做候选稀有度评分或“系统推荐”。
- 不接 LLM API。
- 不用大段 AI 式宿命文案包装候选差异。
- 不删除 legacy Archive 所依赖的数据 ID。
- 不把 `V2_CONTENT_BIBLE.md` 中尚未冻结的突破、高阶功法、延寿物、秘境或重大机缘内容提前塞进 R05。

## UI 原则

1. **先让玩家知道“这个人到底有什么不同”**。
2. 出身 / 灵根 / 体质 / 天赋各自承担不同含义，不要重复成四组属性词条。
3. 能明确说机制就明确说机制，例如“更容易触发感知类事件”，不要只写“天生灵台澄明”。
4. 不展示后端概率数字、隐藏气运或未来未发生结果。
5. 不把候选做成 RPG 战力评分卡。

## 验收标准

1. 新游戏进入真正的三出生候选界面。
2. 三个候选均可读懂其出身、灵根、体质、天赋和关键实际影响。
3. 候选生成后刷新页面不变化。
4. 无重抽入口。
5. 选择一次后不可返回当前三选一重新选。
6. 选择后 `PersistentGame.phase = life`。
7. 选择后 `GameState.lifeStage = childhood`。
8. 角色关键字段和候选完全一致。
9. 出身 / 天赋数据结构已经不再局限于纯属性加点。
10. 旧人生 / Archive 不因数据重构而报错。
11. `npm run typecheck` 通过。
12. `npm test` 通过。
13. `npm run build` 通过。
14. `HANDOFF.md` 已更新。

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`
4. `V2_MIGRATION_AUDIT.md`
5. `V2_GITHUB_ROADMAP.md`
6. `HANDOFF.md`

完成后立即停下，不得自行进入 R06。
