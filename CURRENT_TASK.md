# 当前任务：V2 R15 - 装备栏与品阶

## 本轮唯一目标

在 R14 已建立的唯一正式背包上，实现首版最小装备状态：

```text
背包中的可装备物
→ 主武器 / 护甲 / 护身法器 / 辅助法器
→ 装备 / 卸下
→ 被替换物仍留在背包
→ 阶 + 品数据结构与克制展示
→ save / replay 保持
```

本轮只解决“角色当前穿 / 带着什么”和“物品的品阶如何结构化展示”。

**不实现强化、耐久、随机词条、商店、正式战斗、武器技能、丹药使用或装备掉落扩张。**

---

## 必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`
3. `V2_CONTENT_BIBLE.md` 第 12.4、15 节
4. `HANDOFF.md` 的 R14
5. `V2_GITHUB_ROADMAP.md` 的 R15

具体装备名称与机制只能来自 Content Bible。

### 已知内容缺口

Content Bible 已冻结统一品阶规则：

> 阶 + 品

但当前**没有逐件冻结**青锋剑、黑铁重剑、赤纹刀、青竹灵弓、黑铁护甲、青狼软甲、护心镜、镇灵玉、流云靴、寻灵盘的具体“下品 / 中品 / 上品”。

因此 R15：

- 必须实现正式 `tier / quality` 数据结构、formatter 与 UI 展示能力；
- 对 Content Bible 已明确品阶的物品才允许写具体值；
- **不得自行给上述十件装备编造具体品阶；**
- 未冻结的具体品阶保持 `undefined / 未标定`，并把缺口继续留在 HANDOFF；
- 不使用颜色稀有度、SSR、战力评分代替品阶。

这不是理由去新增 C15 内容或顺手改 Content Bible；本轮仍只实现 R15 系统能力。

---

# 一、兼容与唯一状态原则

R15 必须继续保护 R05～R14 已有 replay digest。

## 1. EquipmentState 必须 optional

允许新增等价结构：

```ts
interface EquipmentState {
  mainWeaponItemId: string | null
  armorItemId: string | null
  protectiveArtifactItemId: string | null
  supportArtifactItemId: string | null
}
```

要求：

- `GameState.equipment` 必须 optional；
- `createInitialGameState()` 不给旧人生补空装备对象；
- 通过显式 `initialize-equipment` SessionCommand 第一次 materialize；
- bootstrap 不推进 `worldDay`、不消耗 RNG；
- 进入 debug log / digest / replay / persistence；
- UI 不显示“初始化装备”按钮；
- 不创建 React 第二套装备真源。

R14 inventory 仍是唯一物品所有权真源。

---

# 二、正式装备槽

首版只允许四槽：

```text
主武器
护甲
护身法器
辅助法器
```

与 Content Bible 15.1 完全一致。

禁止增加：

- 头盔；
- 手套；
- 项链；
- 戒指；
- 鞋子独立槽；
- 双武器副手；
- 宝石槽；
- 套装槽。

`流云靴` 在首版按“辅助法器”进入 support slot，不建立独立鞋槽。

`小型储物袋` 继续由 R14 `inventory.storageBagItemId` 管理容量，**不同时占辅助法器槽**，避免一个物品存在两套激活状态。

---

# 三、ItemDefinition 扩展

在 R14 `ItemDefinition` 上最小扩展：

```ts
type EquipmentSlot = 'main-weapon' | 'armor' | 'protective-artifact' | 'support-artifact'
type ItemQuality = 'low' | 'mid' | 'high'

interface ItemDefinition {
  ...
  equipmentSlot?: EquipmentSlot
  tier?: number
  quality?: ItemQuality
}
```

要求：

- `equipmentSlot` 决定能进哪个槽；
- `tier + quality` 只表示世界品阶，不等于强化等级；
- 不新增 rarity/color/score/affix/durability/enhanceLevel；
- formatter 使用中文：`一阶下品 / 一阶中品 / 一阶上品 / 二阶下品`；
- 具体品阶未冻结时 UI 显示“品阶未标定”或等价克制文案，不猜值。

---

# 四、首版可装备物数据

只能登记 Content Bible 15 节已经存在的十件可装备物：

## 主武器

1. `青锋剑`
2. `黑铁重剑`
3. `赤纹刀`
4. `青竹灵弓`

## 护甲

5. `黑铁护甲`
6. `青狼软甲`

## 护身法器

7. `护心镜`
8. `镇灵玉`

## 辅助法器

9. `流云靴`
10. `寻灵盘`

### 明确后续

- `柳叶双刃` 不进入 R15；
- `破灵锥 / 雷火珠 / 困兽索` 是一次性器物，不进入四槽；
- 小型储物袋只继续承担 R14 容量功能。

R15 可以把上述十件加入 item definitions，但**不新增获取来源**。没有商店、掉落或出生来源的物品不会凭空出现在玩家背包。

---

# 五、装备 / 卸下语义

新增正式 SessionCommand，例如：

```text
equip-item(itemId)
unequip-slot(slot)
```

## equip-item

必须检查：

1. inventory 已初始化；
2. equipment 已初始化；
3. item definition 存在；
4. item 实际在背包中，quantity ≥ 1；
5. item 有合法 equipmentSlot。

成功后：

- 对应 equipment slot 写入 itemId；
- **物品仍保留在 inventory stack 中**，装备状态是对已拥有物品的引用，不是第二库存；
- 同槽已有装备时直接替换引用，旧物仍在背包；
- 不推进时间；
- 不消耗 RNG。

## unequip-slot

- 只把对应槽清空；
- 物品本来就仍在 inventory，不需要“返还一份”；
- 空槽再次卸下应拒绝或 no-op，不产生重复物品。

---

# 六、与 R14 丢弃的冲突保护

R14 当前允许从 inventory 丢弃物品。R15 后必须新增保护：

- 如果某 itemId 当前正被任意装备槽引用，不能把该 item 的 quantity 丢到 0；
- 如果 quantity > 1，可丢弃多余份，只要最终至少保留 1 份供当前装备引用；
- 禁止出现 equipment 引用一个 inventory 中已经不存在的 itemId；
- 被装备物不能因为普通丢弃留下悬空引用。

不得通过“自动卸下再丢弃”偷偷替玩家做决定；应明确拒绝并提示先卸下。

小型储物袋继续沿用 R14 自己的 active-bag 容量检查，不混入 EquipmentState。

---

# 七、装备机制在 R15 的实现边界

Content Bible 已冻结装备的未来实际机制：

- 黑铁重剑：慢、伤害高、天然护甲穿透；
- 赤纹刀：火灵力驱动强招更好；
- 青竹灵弓：正常开战有一次远程先手，近身后效率下降；
- 黑铁护甲：防御高、影响身法 / 逃跑；
- 青狼软甲：防御略低但不明显影响移动；
- 护心镜：重伤级攻击减伤，触发后暂时失效；
- 镇灵玉：防神识 / 心神干扰；
- 流云靴：移动 / 逃跑 / 山野赶路；
- 寻灵盘：探测附近明显灵气异常。

**R15 只允许把这些机制写成结构化 ruleTags / description / future hook，不执行正式战斗数值。**

尤其禁止：

- 为黑铁重剑提前建立攻击速度系统；
- 为青竹灵弓提前建立战斗先手机制；
- 为护心镜提前建立 HP / 伤势状态；
- 为寻灵盘现在就回填沉脉石室发现路径；
- 为装备计算综合战力。

这些分别等后续旅行 / 探索 / R20 战斗相关轮次再接真实 resolver。

---

# 八、UI

InventoryPanel 在真实背包物品上显示：

- 名称；
- 类别；
- 数量；
- 占槽；
- 已冻结时显示“阶 + 品”；
- 未冻结具体值显示“品阶未标定”；
- 对可装备且当前未装备物显示真实“装备”动作；
- 当前已装备物显示“已装备”。

新增或扩展角色装备面板显示：

```text
主武器 · 未装备 / 物品名
护甲 · 未装备 / 物品名
护身法器 · 未装备 / 物品名
辅助法器 · 未装备 / 物品名
```

每个已装备槽提供真实“卸下”动作。

禁止显示：

- 战力；
- DPS；
- 强化；
- 升星；
- 洗词条；
- 耐久；
- “推荐装备”；
- 不存在的比较箭头。

---

# 九、保存 / replay

- save / normalize / clone 深拷贝 optional EquipmentState；
- 没有 equipment 的旧存档继续保持没有；
- initialize / equip / unequip 进入 debug log；
- 同 command sequence 从同 snapshot 得到同 digest；
- 不改变无关 worldDay / rngState / cultivation / relations / location knowledge。

---

# 十、必须测试

至少覆盖：

1. R05～R14 旧状态没有 equipment 仍合法；
2. equipment bootstrap 只执行一次；
3. bootstrap 不推进时间、不改 RNG；
4. 四槽固定，不出现第五槽；
5. 非装备物不能 equip；
6. 不在 inventory 的物品不能 equip；
7. 主武器只能进 main weapon；
8. 护甲只能进 armor；
9. 护心镜 / 镇灵玉只能进 protective；
10. 流云靴 / 寻灵盘只能进 support；
11. 同槽替换不会复制 / 删除 inventory 物品；
12. unequip 不会新增 inventory 数量；
13. 正在装备的最后一份物品不能丢弃；
14. 装备两份同 id 时可以丢掉多余一份但至少保留 1；
15. 小型储物袋不进入 EquipmentState；
16. 柳叶双刃不进入首版 item definitions；
17. grade formatter 正确输出阶 + 品；
18. 未冻结装备具体品阶不会被自动猜值；
19. save / reload 保持四槽；
20. initialize / equip / unequip 可 replay；
21. R05～R14 既有测试继续通过；
22. UI 不出现强化 / 耐久 / 战力 / 推荐装备；
23. `npm run typecheck` 通过；
24. `npm test` 通过；
25. `npm run build` 通过。

---

# 十一、本轮禁止

- 不做 R16 修炼系统；
- 不做 R20 战斗系统；
- 不执行装备战斗数值；
- 不做装备强化；
- 不做耐久；
- 不做随机词条；
- 不做套装；
- 不做锻造 / 重铸；
- 不做商店；
- 不新增掉落；
- 不新增获取来源；
- 不做丹药 / 符箓使用；
- 不做武器技能；
- 不做柳叶双刃；
- 不给十件装备擅自编具体品阶；
- 不接 LLM API；
- 不回到 legacy `ActionPanel` 扩功能。

---

# 十二、验收标准

1. 正式四槽 equipment 状态可保存 / replay；
2. 玩家只能装备真实拥有的可装备物；
3. 装备只是 inventory 引用，不形成第二库存；
4. 替换 / 卸下不会复制物品；
5. 丢弃不会制造悬空装备引用；
6. 小型储物袋继续独立承担容量；
7. “阶 + 品”结构和 formatter 正式存在；
8. 没有冻结的具体装备品阶不被臆造；
9. UI 能真实装备 / 卸下，不出现假功能；
10. R14 背包与 R13 秘境不回归；
11. `npm run typecheck` 通过；
12. `npm test` 通过；
13. `npm run build` 通过；
14. 更新 `HANDOFF.md`；
15. 完成后再把 `CURRENT_TASK.md` 切到下一轮。

完成后立即停下，不得自行进入 R16。
