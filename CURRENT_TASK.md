# 当前任务：V2 R14 - 背包与储物袋

## 本轮唯一目标

在 R13 已经产生真实材料的基础上，建立首版**唯一正式物品库存与携带容量**，并把沉脉石室的 `pendingMaterials` 安全接管进背包：

```text
R13 结构化待接管材料
→ R14 InventoryState
→ 同类物品堆叠
→ 容量 / 大型物品占位
→ 丢弃
→ 小型储物袋扩容
→ save / replay 保持
```

本轮只解决“物品在哪里、能不能继续拿、占多少携带空间”。

**不实现 R15 装备、不实现丹药使用、不实现商店、不实现掉落系统扩张。**

---

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md`，重点第 12～15 节
4. `HANDOFF.md` 的 R13
5. `V2_GITHUB_ROADMAP.md` 的 R14

具体物品名称、世界来源与品阶只能来自 Content Bible；不得因为做背包自行增加新丹药、新法器或新材料。

---

# 一、兼容与唯一状态原则

R14 必须继续保护 R05～R13 已有 replay digest。

## 1. InventoryState 必须 optional

允许新增等价结构：

```ts
interface InventoryStack {
  itemId: string
  quantity: number
}

interface InventoryState {
  stacks: Record<string, InventoryStack>
  baseCapacitySlots: number
  storageBagItemId: string | null
}
```

字段名可按代码风格调整，但要求：

- `GameState.inventory` 必须 optional；
- `createInitialGameState()` 不得给所有旧人生补空背包；
- 通过显式 `initialize-inventory` SessionCommand 第一次 materialize；
- bootstrap 进入 debug log / digest / replay / persistence；
- UI 不显示“初始化背包”按钮；
- 不创建第二套 React inventory store；
- 不把 R13 `pendingMaterials` 留成长期第二库存。

旧 R13 存档存在 `pendingMaterials` 时，R14 bootstrap 必须尝试一次性迁入正式背包；成功后清空对应 pending claims。

---

# 二、物品数据层

新增或扩展 `src/data/items` 等静态目录，定义 canonical `ItemDefinition`。

首版 schema 至少支持类别：

```text
material
pill
artifact
weapon
armor
talisman
special
storage-bag
```

类别是数据结构能力，不代表 R14 要把所有物品玩法做完。

每个定义至少包含：

```ts
id
name
category
stackLimit
slotCost
```

需要时可包含：

```ts
tier
quality
capacityBonus
```

R14 不添加使用效果、装备效果、战斗数值和商店价格计算逻辑。

## 本轮必须登记的真实物品

至少覆盖 R13 已经会产出的 canonical item：

- 青露草；
- 水灵苔；
- 玉髓芝；
- 黑铁；
- 赤纹铁；
- 碎灵晶；
- 岩甲蜥背甲；
- 岩甲蜥矿性结晶；
- 小型储物袋。

可以顺带登记 Content Bible 已冻结的其他物品元数据，但不得扩大到使用 / 装备功能。

---

# 三、容量模型

首版使用**整数槽位**，禁止公斤、小数重量和逐克模拟。

冻结本轮实现锚点：

- 基础携带容量：**12 槽**；
- 同一种可堆叠物品按 `stackLimit` 分栈；
- 一般材料首版默认每 10 份为 1 栈，除非数据定义另有要求；
- 普通丹药 / 符箓后续可复用同一 stack 机制；
- 明显大型物品可以 `slotCost > 1`；
- 一件小型储物袋本身占 1 槽，并提供 **+12 槽**有效容量。

### 储物袋防递归规则

首版同一时间只允许 **1 个储物袋提供容量加成**。

额外储物袋若未来进入库存，只作为普通货物占位，不叠加容量。

本轮不做：

- 袋中袋；
- 多层容器 UI；
- 不同袋子分别存物；
- 活物装袋；
- 空间法器嵌套。

`capacityUsed` 必须由 stacks + item definitions 派生，不额外维护一个容易不同步的可变计数真源。

---

# 四、堆叠规则

同一个 canonical `itemId` 必须合并数量，而不是生成十个相同对象。

容量计算：

```text
需要栈数 = ceil(quantity / stackLimit)
占用槽位 = 需要栈数 × slotCost
```

例如：

```text
青露草 quantity = 14
stackLimit = 10
slotCost = 1
→ 占 2 槽
```

不做随机品质导致同名材料无法堆叠；首版普通材料只有 canonical item id。

如果未来同物品存在阶 / 品差异，应使用不同 canonical item variant，而不是背包运行时随机词条。

---

# 五、接管 R13 pendingMaterials

R13 当前可能保存：

```text
green_dew_grass
water_spirit_moss
jade_marrow_fungus
black_iron
red_pattern_iron
shattered_spirit_crystal
rock_lizard_carapace
rock_lizard_mineral_crystal
```

R14 bootstrap 必须：

1. 读取所有非零 pending claims；
2. 验证每个 canonical id 在 item data 中存在；
3. 计算合并后需要容量；
4. 容量允许时一次性写入 InventoryState；
5. 清空已经成功接管的 R13 pending claims；
6. 不重复迁入；
7. 不推进世界时间；
8. 不消耗 RNG。

由于 R13 当前最大全部资源种类仍可放入 12 个基础槽，正常迁移不应需要特殊 overflow 仓库。

如果遇到非法 item id 或异常超容量旧状态，必须明确拒绝并保留原 pending claims，不允许静默丢物。

---

# 六、获得物品的底层接口

建立纯 engine helper，例如：

```ts
canAddItem(state, itemId, quantity)
addItem(state, itemId, quantity)
removeItem(state, itemId, quantity)
getInventoryUsage(state)
```

要求：

- 非法 id 拒绝；
- quantity 必须为正整数；
- 超容量 `addItem` 拒绝且 state 不变；
- remove 超过现有数量拒绝；
- 数量归零时移除 stack；
- 不推进时间；
- 不调用 RNG；
- helper 不直接写 localStorage。

本轮不要为了测试方便添加“玩家凭空获得任意物品”的公开按钮。

---

# 七、丢弃

新增真实玩家命令，例如：

```text
inventory-drop(itemId, quantity)
```

必须经过 SessionCommand → engine → GameState → debug log / replay / save。

规则：

- 只能丢自己实际拥有的物品；
- 数量为正整数；
- 丢弃后容量立即释放；
- 不返还灵石；
- 不触发商店；
- 不写“确认丢弃将影响命运”类文案；
- 小型储物袋若当前正在提供容量，只有在移除后剩余物品仍能放入基础容量时才允许丢弃，否则拒绝并说明“取下后背包容量不足”。

本轮无需二次确认弹窗；按钮必须明确写物品与数量即可。

---

# 八、小型储物袋

首版只验证 Content Bible 已冻结的：

> **小型储物袋**

R14 不实现商店购买，因此测试 / 已有状态可以通过 engine fixture 验证其扩容规则，但 UI 不提供凭空领取按钮。

真实进入玩家库存后：

- `storageBagItemId` 或等价状态指向该袋；
- 有效容量从 12 提升到 24；
- 袋本身仍作为 1 个真实物品存在；
- 只有一个袋提供加成；
- 移除 / 丢弃前重新校验剩余容量。

R15 是否把储物袋视为辅助法器槽位或独立携带状态，再由 R15 决定；R14 不提前做装备槽。

---

# 九、UI

新增一个简单 `InventoryPanel` 或等价区域，要求玩家能看到：

- 当前容量：例如 `7 / 12 槽`；
- 若有储物袋：`7 / 24 槽`；
- 按类别或至少稳定顺序列出实际物品；
- 名称；
- 数量；
- 占用槽位；
- 当前真实可丢弃操作。

不展示：

- 白蓝紫橙稀有度；
- 战力评分；
- 未实现的装备按钮；
- 未实现的“使用丹药”；
- 未实现的出售价格；
- 未拥有物品图鉴；
- 空的“强化 / 分解 / 合成”页签。

如果背包为空，直接显示“当前没有随身物品”，不要放假物品填 UI。

---

# 十、保存与 replay

必须深拷贝并保存：

- inventory stacks；
- storage bag active id / 等价状态；
- R13 pendingMaterials 清空结果。

旧 R05～R13 状态没有 `inventory` 仍然合法。

`initialize-inventory` 与 `inventory-drop` 必须可 replay；相同命令序列得到相同 digest。

---

# 十一、本轮禁止

- 不做 R15 装备栏；
- 不装备武器 / 护甲 / 护心镜；
- 不使用丹药、符箓、雷火珠；
- 不做商店购买 / 出售；
- 不做拾取 UI 动画；
- 不做怪物通用掉落；
- 不让区域探索开始无限产材料；
- 不做仓库 / 家族仓储；
- 不做物品耐久；
- 不做随机词条；
- 不做强化 +1/+2；
- 不做重量小数模拟；
- 不做物品制作；
- 不做第二种储物袋；
- 不补 8～12 个正式随机子地点；
- 不开始 R15；
- 不接 LLM API。

---

# 十二、验收标准

必须测试：

1. R05～R13 初始 / 旧状态没有 inventory 仍合法；
2. `initialize-inventory` 只执行一次；
3. bootstrap 不推进 worldDay、不改 rngState；
4. R13 pending materials 全量迁入且不重复；
5. 迁移成功后 pending claims 被清空；
6. 非法 pending id 不静默丢失；
7. 同物品正确堆叠；
8. 超过 stackLimit 正确增加槽位；
9. 容量满时 add 拒绝且 state 不变；
10. remove / drop 数量正确；
11. 丢到 0 后 stack 删除；
12. 基础容量为 12；
13. 小型储物袋有效容量为 24；
14. 多个袋不叠加容量；
15. 容量不足时不能丢掉正在提供容量的袋；
16. 大型 item `slotCost > 1` 计算正确；
17. save / reload 保留 InventoryState；
18. initialize / drop 可以 replay；
19. UI 不出现使用 / 装备 / 强化假按钮；
20. `npm run typecheck`；
21. `npm test`；
22. `npm run build`。

---

# 十三、允许修改

- `src/types/*` 中 inventory / command / GameState 必要扩展；
- `src/data/items/*` 或等价静态物品定义；
- 新增 `inventoryEngine.ts` 与测试；
- Session / persistence 最小接线；
- R13 pendingMaterials 最小接管；
- `InventoryPanel` 与必要样式；
- `HANDOFF.md`（完成时）；
- `CURRENT_TASK.md`（完成后切 R15）。

不要借机重构 R05～R13 已稳定模块。

---

# 十四、完成纪律

本轮完成后：

1. 确认 typecheck / test / build 全通过；
2. 更新 `HANDOFF.md`；
3. 把 `CURRENT_TASK.md` 切换到 **R15｜装备栏与品阶**；
4. 立即停下，不顺手实现 R15。
