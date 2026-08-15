# 当前任务：V2 R13 - 沉脉石室秘境最小闭环

## 本轮唯一目标

严格按照 `V2_CONTENT_BIBLE.md` 第 34 节，把首版第一秘境 **黑风山「沉脉石室」** 做成一个真正可保存、可重放、可死亡、可永久清空的一次性小型分支秘境：

```text
发现入口
→ 进入裂隙矿廊
→ 自由选择外围分支
→ 可随时退出外围
→ 锁脉石门明确警告
→ 主动进入不可回头核心
→ 成年岩甲蜥最小危险遭遇
→ 成功泄压 / 或死亡
→ 从断层出口离开
→ 本世资源与历史状态永久改变
```

本轮只验证 **秘境运行闭环**，不是背包轮、正式战斗轮或第二秘境内容轮。

---

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`，重点第 34 节
4. `C13_SECRET_REALM_FREEZE.md`
5. `HANDOFF.md`
6. `V2_GITHUB_ROADMAP.md` 的 R13

冲突时遵循 `AGENTS.md` 的优先级；不得用旧路线中的示例覆盖 Content Bible 已冻结内容。

---

## 一、兼容与唯一状态原则

R13 必须继续保护 R05～R12 已有 replay digest。

### 1. 新运行态必须 optional

允许新增等价结构：

```ts
interface SecretRealmState {
  sunkenVeinChamber: SunkenVeinChamberRuntime
}

interface SunkenVeinChamberRuntime {
  anchorSublocationId: string
  discovered: boolean
  active: boolean
  currentNodeId: SecretRealmNodeId | null
  coreLockedBehindPlayer: boolean
  cleared: boolean
  nodeClaims: Record<string, boolean>
  knowledge: {
    ventSequence: boolean
    mineIncidentEvidence: boolean
  }
  materialClaims: Record<string, number>
}
```

字段名允许按现有代码风格调整，但语义必须等价。

要求：

- 新字段必须 optional；
- `createInitialGameState()` **不得给旧人生自动补空 secret-realm 对象**；
- 不得修改 R12 `INITIALIZE_SUBLOCATIONS` 的历史语义；
- 不得让旧 `explore-region` 命令在没有 R13 runtime 的状态里突然生成秘境；
- 不新建第二套 store / React local state 作为秘境真源。

### 2. 显式 bootstrap 命令

新增明确 SessionCommand，例如：

```text
initialize-secret-realm
```

职责只有：

- 为当前 V2 adult 人生确定沉脉石室的 R12 黑风山入口承载点；
- materialize optional runtime；
- 根据当时已经存在的探索 / 子地点 / 天赋 / 体质 / 真实 flags 判断是否已经满足发现条件；
- 不推进时间；
- 进入 debug log / digest / replay / persistence；
- 只执行一次。

UI 不显示“初始化秘境”按钮。

新版本玩家第一次执行 R13 相关探索时，可由 App 的操作封装先对当前 `PersistentGame` 执行 bootstrap，再基于返回的新 PersistentGame 执行 `explore-region`，最后一次性更新 React view；禁止连续对旧 React state 调两次命令造成 stale state。

旧存档若已经探索黑风山 30+ 天，bootstrap 时可立即按已有事实确认秘境，不要求玩家为了迁移再多点一次探索。

---

## 二、入口承载点生成

### 1. 来源

只能从本世 R12 已生成的黑风山子地点中选择：

```text
parentLocationId = blackwind_mountain
archetype = cave | ruin
```

不得额外生成第三个黑风山子地点。

### 2. 确定性

使用独立 seeded RNG 路径，例如：

```ts
seedToState(`${runSeed}:r13-sunken-vein-anchor`)
```

再调用现有 RNG 工具。

要求：

- 不使用 `Math.random()`；
- anchor 同一人生永远一致；
- 刷新 / replay 一致；
- anchor 生成本身不必消耗主 `rngState`，避免无意义改变其他未来事件序列。

如果 R12 runtime 尚不存在，bootstrap 必须拒绝，不能自己偷偷再实现一遍 R12 生成器。

---

## 三、发现条件

只有满足 Content Bible 第 34.2 节才可 `discovered = true`。

基础条件全部必须满足：

1. `blackwind_mountain` fixed location 已 discovered；
2. 本世选中的 anchor sublocation 已 discovered；
3. 黑风山累计探索至少 15 天。

### 15～29 天

必须额外满足至少一项**真实存在于当前状态**的条件：

- 孟家旧矿图相关正式 flag / knowledge；
- 天赋「察微知著」对应 canonical talent id；
- 体质「空明灵台」对应 canonical physique id；
- 玩家真实拥有并可使用「寻灵盘」。

R13 **禁止为了凑条件伪造“孟家旧图已知”或“持有寻灵盘” flag**。

如果当前项目尚未真正实现寻灵盘持有状态，则该路径本轮自然不可用；不要临时造背包。

### 30+ 天

黑风山达到基本探明后，只要 fixed location 与 anchor 都已 discovered，即可确认入口，无需特殊条件。

不新增硬境界门槛。

---

## 四、秘境节点与导航

固定节点只能有：

```text
裂隙矿廊  fissure-corridor
渗水药圃  seepage-herb-bed
引脉侧室  vein-guide-side-room
锁脉石门  vein-lock-gate
脉心室    vein-heart-chamber
```

canonical id 可以按代码风格缩写，但不得增加第六个剧情节点。

### 裂隙矿廊

- 进入秘境后的默认节点；
- 可去药圃、侧室、石门；
- 可退出到黑风山；
- 进入 / 退出本身不额外结算世界日，避免重复计算区域内短距离移动。

### 外围移动

- 药圃 / 侧室完成后回到裂隙矿廊；
- 外围未进入核心前始终允许退出；
- 不调用 R10 fixed-world travel；
- `world.currentLocationId` 仍保持 `blackwind_mountain`，秘境当前位置只存在于 secret-realm runtime。

因此秘境不能污染 11 个 fixed-world node 命名空间，也不能写进 `knowledge.locations`。

---

## 五、外围节点时间、风险与一次性领取

### 1. 渗水药圃

操作：检查并采集。

- 耗时：1 天；
- 先通过现有 `ADVANCE_TIME / worldDay` 推进；
- 若寿元在这 1 天内耗尽，死亡优先，不得标记领取完成；
- 成功完成后本世只可领取一次。

奖励在 runtime 中固定并一次性记录：

- 青露草 2～4；
- 水灵苔 1～3；
- 玉髓芝 0～1，是否存在由本世 seeded RNG 一次决定。

「辨药 / 百草灵体」只改善玩家可见判断文案，不增加数量。

本轮不实现毒伤系统；错误采集风险只作为已知世界风险和后续系统接口，不得为了它提前造状态系统。

### 2. 引脉侧室

操作：检查旧阵与可取材料。

- 耗时：1 天；
- 寿终边界同上；
- 本世只领取一次。

奖励：

- 黑铁 1～3；
- 赤纹铁 0～1；
- 碎灵晶 1～2。

完成后获得 realm-scoped knowledge：

```text
旧阵泄压顺序
```

不得把它伪装成新功法、技能或炼器配方。

### 3. 奖励生成规则

数量使用独立、可重放的 seeded 规则，在 secret-realm runtime 初始化时一次固定，或第一次对应节点生成时确定后持久化；不能每次点按钮重抽。

---

## 六、R14 前的材料暂存边界

R14 才是正式背包 / 物品系统。

因此 R13：

- **不新增通用 InventoryState；**
- 下品灵石可直接进入现有 `resources.spiritStones`；
- 青露草、水灵苔、玉髓芝、黑铁、赤纹铁、碎灵晶、岩甲蜥材料只记录在 secret-realm runtime 的结构化 `materialClaims / pendingLoot` 中；
- UI 可以明确显示“已收取”，但这些材料在 R14 前不能出售、使用、炼丹或炼器；
- R14 后必须由背包迁移 / 接管这些已领取事实；
- 无论 R14 是否已经完成，R13 领取 flag 都必须阻止重复刷取。

不要使用临时字符串数组冒充最终背包；至少使用 canonical material id + count 的结构化记录。

---

## 七、锁脉石门

石门页必须显示 C13 已冻结的可见危险：

- 门内外灵压不同；
- 大型爬行妖兽痕迹；
- 进入后旧阵可能重新闭锁。

### 可实现操作

1. **退回外围**：始终允许。
2. **按旧阵泄压顺序开启**：仅 `knowledge.ventSequence = true` 时出现；耗时 1 天。
3. **使用破灵锥**：只有项目存在真实“持有破灵锥”状态时才出现；R14 前若没有真实物品持有机制，本轮不显示，不伪造。
4. **强行开启**：始终允许；耗时 1 天；玩家必须看到风险较高。

R13 暂不实现完整禁制伤害 / 经脉伤系统，因此“泄压顺序”和“强开”的区别首先体现在：

- 可见风险描述不同；
- 核心危险遭遇的临时风险修正可以不同。

不得为了做出差异提前增加复杂伤势系统。

如果开门的 1 天内寿终，死亡优先，不能进入核心。

---

## 八、不可回头确认

真正进入脉心室必须是独立明确确认动作，不能把“开门”和“进入核心”合成一个无提示按钮。

确认页必须完整或等价表达：

> 石门后的灵压明显比外侧紊乱。现存阵纹显示，开门后旧阵会重新闭合，未找到内侧泄压口前无法原路返回。门内还有大型爬行妖兽活动痕迹。继续进入，可能受重伤，甚至死在里面。

确认后：

- `coreLockedBehindPlayer = true`；
- 当前节点进入脉心室；
- 外围退出按钮消失；
- 在核心危险解决前不能返回药圃 / 侧室 / 矿廊。

玩家可以在确认前取消并继续外围活动。

---

## 九、成年岩甲蜥最小危险遭遇

这是 R20 前的**专用临时遭遇解析器**，目的只验证秘境的生死状态流，不是正式战斗系统。

### 禁止提前实现

- 不新增 HP / 灵力战斗条；
- 不新增技能栏；
- 不新增武器切换；
- 不新增中毒 / 束缚 / 暴露等正式状态；
- 不实现岩甲蜥完整 AI；
- 不制作通用 CombatEngine；
- 不把这套临时规则扩给其他妖兽。

### 冻结的临时结果规则

首次在脉心室面对成年岩甲蜥时，使用当前境界 / 炼气层数与**主 `rngState` 的正式 seeded 随机判定**，只产生：

```text
victory | death
```

临时成功率：

| 当前修为 | 击退 / 击杀成功率 |
|---|---:|
| 凡人 | 0% |
| 炼气 1～2 层 | 20% |
| 炼气 3～5 层 | 60% |
| 炼气 6～9 层 | 90% |
| 筑基及以上 | 100% |

如果石门使用「旧阵泄压顺序」安全开启，则炼气角色成功率额外 +10 个百分点，上限 100%；它表示核心灵压更稳定，不是给角色永久战斗 buff。

UI **不显示具体百分比**，只显示自然语言危险判断。

失败即在脉心室死亡，使用标准 `GameState.status = dead / endReason` 路径；不得伪造“受伤后自动逃出”，因为 C13 已冻结进入核心后的不可回头规则，而正式伤势与逃跑系统尚未实现。

这一表只服务 R13 测试闭环；R20 接入正式战斗后必须替换该 resolver，但不改变秘境节点、奖励和世界后果。

---

## 十、核心成功、奖励与退出

### 成功遭遇后

- 岩甲蜥危险标记为 resolved；
- 玩家可以完成泄压；
- 写入历史知识：`沉脉石室古修引脉设施` / 等价 canonical fact；
- 写入 E01「黑风矿变遗痕」可读取的 evidence flag；
- 打开侧面断层出口。

### 核心一次性奖励

本世 seeded 固定：

- 碎灵晶 2～4；
- 赤纹铁 1～2；
- 下品灵石 8～15；
- 岩甲蜥材料类别先记录为结构化 pending material claims，数量只按本轮最小需要确定，不发随机装备。

灵石直接进入现有 `resources.spiritStones`；材料遵守“R14 前暂存边界”。

### 退出

完成泄压后：

- `cleared = true`；
- `active = false`；
- `currentNodeId = null`；
- `coreLockedBehindPlayer = false`；
- `world.currentLocationId` 仍是 `blackwind_mountain`；
- 对应 anchor sublocation 写入 realm runtime / sublocation 允许的“已深入确认”事实，不改变其 R12 archetype；
- 所有已领取资源永久保持 claimed；
- 再进入只显示已泄压遗迹状态，不得重复领取核心或外围资源。

发现与首次 clear 可以各写一条 major Chronicle；普通节点移动、反复进出外围不得刷 Chronicle。

---

## 十一、Session / replay / persistence

以下玩家可见动作都必须走 SessionCommand / resolver：

- initialize secret realm；
- enter realm；
- visit / inspect outer node；
- return / exit outer；
- operate gate；
- confirm core entry；
- resolve core encounter；
- vent and exit core。

允许把多个低层动作合并成少量语义清晰的 SessionCommand，但禁止 React 直接 mutate runtime。

每个命令必须：

- 进入 debug log；
- state digest 可重放；
- V3 save / reload 后保持当前秘境节点、claim、knowledge、core lock 与 cleared；
- 不依赖浏览器随机数；
- 不修改无关 fixed-location knowledge、关系、修为或其他区域探索状态。

保存 / normalize / clone 路径需要深拷贝已有 secret-realm runtime；没有该字段的旧存档保持没有该字段。

---

## 十二、UI 原则

### 黑风山区域页

秘境未 discovered：完全不显示。

秘境 discovered 后：

- 在黑风山已确认内容下显示「沉脉石室」；
- 说明它是已确认的地下遗迹；
- 提供真实「进入」动作；
- 不把它画成顶层世界节点。

### 秘境内

使用当前 story-card / node panel 风格即可：

- 当前节点名；
- 50～150 字以内环境描述；
- 实际可做动作；
- 时间与明显风险；
- 已经领取的节点显示“已检查 / 已取”，不能再点领取。

不做迷宫小游戏、3D 地图、粒子特效或大型 RPG 场景。

### 核心门

不可回头警告视觉上必须明显，但文案保持克制，不用“命运”“抉择”“最后机会”等 AI / 手游话术。

---

## 十三、必须测试

至少覆盖：

1. secret-realm runtime 不在旧初始 GameState 中自动出现；
2. R05～R12 没有该字段的旧状态仍合法；
3. bootstrap 只执行一次且不推进 worldDay；
4. anchor 只来自本世黑风山 `cave / ruin` 子地点；
5. 同 seed anchor 一致，不同 seed 有变化；
6. anchor 生成不污染 fixed `knowledge.locations`；
7. 15～29 天只有真实提前识别条件才发现；
8. 30+ 天在 anchor 已 discovered 时能发现；
9. anchor 未 discovered 时不泄露沉脉石室；
10. discovered 前 UI / view model 不暴露名字、节点、奖励；
11. 进入后 `world.currentLocationId` 仍是 blackwind_mountain；
12. 药圃和侧室各推进 1 天；
13. 寿终发生在节点检查途中时，不领取资源、不获得知识；
14. 外围资源只领取一次；
15. 玉髓芝 0/1、其他数量 deterministic；
16. 侧室完成后获得旧阵泄压顺序；
17. 不存在真实破灵锥持有状态时 UI 不显示破灵锥选项；
18. 石门安全开启 / 强开均推进 1 天；
19. 进入核心前必须经过明确 confirm；
20. confirm 后外围退出 / 返回被禁止；
21. 岩甲蜥临时 resolver 使用 seeded rng，可 replay；
22. 凡人核心遭遇必死；筑基以上必胜；炼气各档按冻结表工作；
23. 安全泄压开门只对炼气临时成功率 +10pp，不写永久 buff；
24. 核心失败走标准死亡，不伪造 clear / reward；
25. 核心胜利后灵石只增加一次；
26. 核心材料只进入 realm pending claims，不建立通用背包；
27. clear 后可从侧断层退出回黑风山；
28. clear 后再次进入不刷新任何资源 / 岩甲蜥；
29. 历史 evidence 永久保存，可供未来 E01 读取；
30. V3 save / reload 保持秘境当前节点、claims、knowledge、core lock、cleared；
31. 所有 R13 命令可 replay；
32. R05～R12 既有测试全部仍通过；
33. Archive / legacy replay 不回归。

---

## 十四、本轮禁止

- 不实现第二秘境；
- 不补 8～12 个随机子地点正式模板；
- 不做 R14 通用背包；
- 不做商店、卖材料、使用材料；
- 不做 R20 正式战斗系统；
- 不做通用 CombatEngine；
- 不做完整伤势 / 中毒系统；
- 不做完整禁制系统；
- 不新增妖兽；
- 不新增功法 / 法器 / 丹药；
- 不新增矿变最终真相；
- 不做孟家 / 青云宗后续报告任务；
- 不做大型阵营后果；
- 不做世界事件推进；
- 不接 LLM API；
- 不回到 legacy `ActionPanel`。

---

## 十五、验收标准

1. 玩家能在真实条件满足后发现沉脉石室；
2. 未发现前完全不泄露；
3. 五节点结构与 Content Bible 一致；
4. 外围可以自由探索和退出；
5. 两个外围分支有真实时间与一次性收益；
6. 核心门有真实开门差异与明确不可回头警告；
7. 玩家主动确认后才进入核心；
8. 成年岩甲蜥拥有可死亡、可重放的最小危险遭遇；
9. 成功后核心泄压、历史证据与资源永久写入本世；
10. 失败死亡不伪造完成；
11. 所有奖励不可重复刷；
12. 不提前建立 R14 / R20 系统；
13. 旧 V2 replay digest 不被 R13 bootstrap 被动改变；
14. `npm run typecheck` 通过；
15. `npm test` 通过；
16. `npm run build` 通过；
17. 更新 `HANDOFF.md`；
18. 成功后把 `CURRENT_TASK.md` 切到 **R14｜背包与物品基础**。

完成后立即停下，不得自行进入 R14。
