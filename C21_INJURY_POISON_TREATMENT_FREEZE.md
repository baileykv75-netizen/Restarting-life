# C21｜伤势 / 中毒 / 治疗内容冻结

> 本文件是 C21 的独立审阅稿；正式实现真源同步进入 `V2_CONTENT_BIBLE.md` 第 38 节。若二者出现冲突，以 Content Bible 第 38 节为准。

## 1. 不推翻 R18 injury runtime

R18 已有：

```text
light
severe
meridian
```

现有 `startedDay / recoveryDay` 继续是唯一恢复时间语义。

- 不新增第二套“静养进度”；
- 安全休养只是推进 `worldDay`；
- 药物通过缩短某条伤势的 `recoveryDay` 生效；
- R20 普通 light 仍为 10 日；
- R20 普通 severe 仍为 45 日；
- 明确极端来源已有 90 日 severe / meridian 继续有效；
- 旧记录 / 旧 replay 不补写历史字段。

## 2. light

- 正常旅行：允许；
- wilderness 探索：允许；
- 普通修炼：现有 `×0.90`；
- 大境界突破：不单独硬锁，但保留已有负面修正；
- Combat：不改 maxHP / maxQi / baseAttack；
- flee：`-5pp`；
- 普通活动不恶化。

## 3. severe

- 正常节点旅行 / 寻医：允许；
- 新开启 wilderness 系统探索：禁止；
- 新进入秘境 / 明确高风险探索：禁止；
- 已处于不可回头地点时，退出 / 泄压 / 返回安全处必须允许；
- 普通修炼：禁止；
- 筑基 / 结丹：禁止；
- Combat：开战时 `maxHP ×0.70`，向下取整；baseAttack 不变；
- flee：`-15pp`；
- 普通安全旅行 / 休养不随机恶化。

已经 severe 的角色又打一场，并在该战结束时再次满足 severe 判定：

```text
active severe recoveryDay +15日
但从当前 worldDay 计算的剩余 severe 时间最多90日
```

不新增 critical injury。

## 4. meridian

- 普通生活 / 旅行：允许；
- wilderness 探索：本身不禁止；
- 普通修炼：禁止；
- 所有大境界突破：禁止；
- Combat：`maxQi ×0.65`，向下取整；招式 Qi cost 不变；baseAttack 不变；
- flee：`-10pp`；
- 普通旅行不随机恶化。

组合：

- severe `maxHP ×0.70` 与 serious poison `maxHP ×0.85` 同时存在时，只取更强的 `×0.70`；
- meridian `maxQi ×0.65` 可同时存在；
- light / mild poison 的修炼 `×0.90` 不相乘；
- C20 flee injury 合计仍最低只计到 `-20pp`。

## 5. poison 最小 runtime

首版只做：

```text
mild → serious → death
```

碧水蛇低阶毒 canonical family：

```text
bishui_venom
```

每个 active poison family 至少保存：

```text
poisonId / family
severity
appliedDay
nextWorsenDay
```

首次成功施加：

```text
mild
nextWorsenDay = current worldDay +10
```

同 family 再次施加：

- mild：立即变 serious，新的 `nextWorsenDay = current worldDay +10`；
- serious：不叠第三层，不刷新 / 延后原死亡期限。

时间恶化：

```text
mild 到期
→ serious
→ nextWorsenDay +10

serious 到期
→ 非战斗死亡
```

长行动跨过多个 milestone 时按真实时间顺序处理；如果第 20 日毒发死亡，一次 30 日行动就在第 20 日结束，不能继续领取后 10 日收益。

## 6. poison 行动影响

### mild

- 旅行 / wilderness 探索：允许；
- 普通修炼：`×0.90`；
- 筑基 / 结丹：禁止；
- Combat：显示状态，不做每 beat DOT，不改 maxHP / maxQi。

### serious

- 正常旅行寻医：允许，但路上会继续走死亡时钟；
- wilderness 系统探索 / 新秘境进入：禁止；
- 普通修炼：禁止；
- 筑基 / 结丹：禁止；
- Combat：`maxHP ×0.85`；
- 不做每 beat DOT。

安全休养不清毒，只推进 worldDay。

## 7. 止血散

canonical id：

```text
zhixue_san
```

对一个选定 active injury：

```text
light  → remaining recovery -7日
severe → remaining recovery -5日
```

- 到期则立即恢复；
- 不治 meridian / poison；
- 每条 injury record 最多受益一次；
- 使用本身不推进 worldDay；
- active combat 中不可直接使用。

## 8. 清毒散

canonical id：

```text
qingdu_san
```

首版 `bishui_venom` 属于可治疗 common low-grade poison。

```text
mild
→ 1包清除

serious
→ 1包降为 mild
→ nextWorsenDay = current worldDay +10
```

第二包可按 mild 规则清除，因此 serious 低阶毒想立即彻底解决需要 2 包。

未知 / 高阶 poison 没有明确可治疗 tag 时，清毒散不可用且不消耗。

## 9. 养脉丹

canonical id：

```text
yangmai_dan
```

对一个选定 active meridian injury：

```text
remaining recovery -30日
```

- 到期则立即恢复；
- 不治 light / severe / poison；
- severe + meridian 同时存在时只处理 meridian；
- 每条 meridian injury record 最多受益一次；
- 45 日经脉伤服后剩 15 日；
- 90 日极端经脉伤服后剩 60 日。

## 10. 治疗渠道

R21 只实现：

1. 自己使用真实药物；
2. 既有 10 / 30 日安全休养。

休养不额外加速。

医者 / 青云宗 / 家族只保留后续内容 hook；R21 不发明免费医生、医疗商店或宗门医院菜单。

## 11. 死亡边界

继续：

```text
Combat HP = 0 → death
```

R21 新通用非战斗死亡：

```text
serious poison 到 death milestone → death
```

severe 不会仅因日历流逝随机暴毙。其代价来自 maxHP 降低、行动限制、带伤再战与 recovery 延长。

## 12. R21 / R22 边界

R21：generic injury gates、poison runtime、worldDay milestone、三个治疗物、Combat penalty、UI、save / replay。

R22：碧水蛇正式攻击施毒、8 种妖兽正式 combat data、真实掉落、毒囊 / 妖丹 / 精血、刷新、named / unique death 与生态。