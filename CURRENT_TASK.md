# 当前任务：V2 R21 - 伤势 / 中毒 / 治疗闭环

## 本轮唯一目标

C21 已经把伤势、中毒与三种治疗物的执行规则冻结到 `V2_CONTENT_BIBLE.md` 第 38 节。

本轮只把这些规则接入现有 V2 authoritative state，完成：

```text
R18 injury runtime
+ R20 Combat runtime
+ C21 poison / treatment rules
→ 伤势真实限制行动
→ poison 随 worldDay 恶化
→ 止血散 / 清毒散 / 养脉丹真实消耗
→ 长行动不会跳过中毒死亡
→ save / replay / UI
```

**本轮不实现 R22 的 8 种妖兽正式战斗数据、妖兽掉落、刷新、妖丹 / 精血来源、unique death，也不进入 R23。**

完成后更新 `HANDOFF.md`，运行 CI；绿后立即停止。

---

# 一、必须先阅读

1. `AGENTS.md`
2. `V2_GAME_DESIGN.md`：伤势、死亡、风险、时间推进
3. `V2_CONTENT_BIBLE.md`：
   - 第 14 节丹药；
   - 第 17 节伤势 / 中毒；
   - 第 18.4 节碧水蛇；
   - 第 35 节突破伤势；
   - 第 37 节 R20 Combat；
   - **第 38 节 C21 伤势 / 中毒 / 治疗执行规则（唯一数值真源）**
4. `HANDOFF.md`
5. 现有实现：
   - `src/types/game.ts`
   - `src/types/injury.ts`
   - `src/types/combat.ts`
   - `src/types/gameAction.ts`
   - `src/types/command.ts`
   - `src/core/injuryEngine.ts`
   - `src/core/combatEngine.ts`
   - `src/core/worldEngine.ts`
   - `src/core/cultivationEngine.ts`
   - `src/core/foundationBreakthroughEngine.ts`
   - `src/core/goldenCoreBreakthroughEngine.ts`
   - `src/core/sessionEngine.ts`
   - `src/core/persistentGameEngine.ts`
   - `src/store/saveRepository.ts`
   - `src/data/items.ts`
   - `src/App.tsx`
6. R18～R20 的 injury / save / replay / combat tests。

若与现有架构冲突，只做最小兼容扩展，不借机重构。

---

# 二、最高架构原则

## 2.1 继续只有一套 injury truth

现有：

```ts
state.injuries?.conditions
```

继续是 light / severe / meridian 的唯一权威状态。

不得再建：

- `wounds`；
- `persistentHP`；
- 伤势等级 1～100；
- 第二套恢复倒计时。

现有 `startedDay / recoveryDay` 语义继续保留。旧 R18～R20 记录不补写历史字段，不改变历史命令 replay 结果。

如果治疗需要记录“一条伤势已经吃过一次某药”，允许给单条 InjuryCondition 增加 optional treatment metadata，或使用等价 optional map；旧记录没有该字段必须合法。

## 2.2 poison 是 optional 新 runtime

建议：

```ts
state.poison?: PoisonState
```

或等价 optional state。

旧状态没有 poison 合法；`createInitialGameState()` 不塞空 poison object。

每个真实 poison family 至少保存：

- poison id / family；
- severity: mild | serious；
- appliedDay；
- nextWorsenDay。

首版不要增加毒抗属性、毒性 1～100、十几种毒层级。

## 2.3 时间只有 worldDay

poison 恶化必须走统一 `worldDay` 推进。

所有会推进时间的正式路径最终都必须经过同一套时间结算，使：

```text
旅行
探索
修炼
功法练习
调养
突破
其他长行动
```

都不能绕过 poison milestone。

禁止 React timer、现实秒数、combat beat 当 worldDay、页面加载随机恶化。

---

# 三、三类 injury 的最终执行规则

实现必须逐条对齐 Content Bible 38.2～38.4。

## light

- 正常旅行：允许；
- wilderness 探索：允许；
- 普通修炼：允许，保持现有 `×0.90`；
- 大境界突破：不因 light 单独硬锁，但继续进入已有可见负面修正；
- Combat：不新增 maxHP / maxQi / baseAttack penalty；
- flee：继续 C20 `-5pp`；
- 普通活动不恶化；
- R20 普通战斗 light 继续默认 10 日 recoveryDay。

## severe

- 正常节点旅行 / 离开危险区寻医：允许；
- 新开启的 wilderness 系统探索：禁止；
- 新进入秘境 / 明确高风险探索：禁止；
- 已经处在不可回头地点时必须允许执行“离开 / 泄压 / 返回安全处”等退出动作，不能把角色锁死；
- 普通修炼：禁止；
- 筑基 / 结丹：禁止；
- Combat：允许被迫或主动迎战，但开战时 `maxHP ×0.70`，向下取整；baseAttack 不变；
- flee：继续 `-15pp`；
- 普通安全旅行 / 休养不随机恶化；
- R20 普通 severe 继续 45 日；明确极端来源已有 90 日记录继续 90 日。

若一名已经 severe 的角色又经历一次战斗，并在该战斗结束时再次满足 R20 severe 判定：

```text
该 active severe 的 recoveryDay 延长 15 日
但从当前 worldDay 计算的剩余 severe 恢复时间最多不超过 90 日
```

不新增 critical injury 类型。

## meridian

- 普通生活 / 旅行：允许；
- wilderness 探索：本身不禁止；
- 普通修炼：禁止；
- 所有大境界突破：禁止；
- Combat：开战时 `maxQi ×0.65`，向下取整；主动招式 Qi cost 不变；baseAttack 不变；
- flee：继续 `-10pp`；
- 普通走路 / 旅行不随机恶化；
- recoveryDay 继续由真实来源决定，已有 45 / 90 日等历史记录原样保留。

## 同时存在多个状态

- severe 与 serious poison 都修改 maxHP 时，只取**更强的一项**，不相乘；因此 severe `×0.70` 优先于 serious poison `×0.85`；
- meridian 的 maxQi `×0.65` 可与 maxHP penalty 同时存在，因为影响不同资源；
- light 与 mild poison 对修炼都为 `×0.90` 时，只取最强单项健康 penalty，不叠成 `×0.81`；
- C20 flee injury 合计仍保持最低只计到 `-20pp`，不得改变。

---

# 四、poison 最小状态机

## 4.1 首版只有 mild / serious

```text
mild → serious → death
```

不做第三档。

## 4.2 碧水蛇低阶毒 family

正式 canonical family：

```text
bishui_venom
```

R21 只需建立 generic poison runtime 和测试入口；**R22 才负责把碧水蛇正式攻击 / AI 接到该 family 上。**

首次成功施加：

```text
severity = mild
appliedDay = current worldDay
nextWorsenDay = current worldDay + 10
```

同 family 再次施加：

- 当前 mild：立即升级 serious，并把 `nextWorsenDay = current worldDay + 10`；
- 当前 serious：不增加第三层，不刷新 / 延后原有死亡期限。

同一 family 不创建多条重复 poison stack。

## 4.3 worldDay 恶化

mild 到期：

```text
到 nextWorsenDay
→ serious
→ nextWorsenDay += 10
```

serious 到期：

```text
到 nextWorsenDay
→ 非战斗死亡
```

因此从一次未经处理的 mild 碧水蛇毒开始，最长约 20 日后死亡；再次中毒可提前进入 serious。

长行动一次跨越多个 milestone 时必须按时间顺序全部处理。例如 mild 状态下直接开始 30 日动作：

```text
第10日 mild→serious
第20日 serious→death
动作在死亡日中止
不得继续结算第21～30日奖励
```

死亡 `worldDay` 应落在真正的 poison death milestone，而不是动作原计划结束日。

## 4.4 poison 对行动的影响

### mild

- 正常旅行：允许；
- wilderness 探索：允许；
- 普通修炼：允许，健康修正 `×0.90`；
- 筑基 / 结丹：禁止；
- Combat：只显示已中毒；不做每 beat DOT；不额外改 maxHP / maxQi。

### serious

- 正常旅行去寻医：允许，但时间推进仍可能触发死亡；
- wilderness 系统探索 / 新秘境进入：禁止；
- 普通修炼：禁止；
- 筑基 / 结丹：禁止；
- Combat：开战时 `maxHP ×0.85`，向下取整；不做每 beat DOT；
- UI 必须明确显示下一次恶化 / 死亡还剩多少 worldDays。

安全休养本身不会清毒，只会推进 worldDay。因此 mild / serious poison 下选择调养必须先展示恶化风险。

---

# 五、三种治疗物

R21 在 `src/data/items.ts` 中正式登记：

```text
zhixue_san  止血散
qingdu_san  清毒散
yangmai_dan 养脉丹
```

继续读取第 14 节既有世界定位，不新造同质药物。

三种都：

- 使用真实 inventory stack；
- 使用动作本身不推进 worldDay；
- 只能在 active CombatState 之外使用；
- 目标无可治疗状态时拒绝并不消耗；
- 已知无效目标必须在消耗前拒绝，不允许“先吃掉再告诉玩家没用”。

## 5.1 止血散

对一个选定 active injury：

```text
light  → remaining recovery -7日
severe → remaining recovery -5日
```

如果扣减后 `recoveryDay <= current worldDay`，该 injury 立即视为恢复。

- 不治疗 meridian；
- 不治疗 poison；
- 每条 injury record 最多受益一次；
- 另一条新的 injury 可以再次使用新的止血散。

## 5.2 清毒散

只针对已知 common low-grade poison family；首版 `bishui_venom` 属于可处理对象。

```text
mild
→ 1包直接清除

serious
→ 1包降为 mild
→ nextWorsenDay = current worldDay +10
```

降为 mild 后若再使用第 2 包，可按 mild 规则直接清除。

因此 serious 低阶毒可以真实消耗 2 包清毒散当场彻底处理；1 包只能先压回 mild。

未知 / 高阶毒如果未来进入游戏，需要 content 明确标记是否能被清毒散处理；没有标记则清毒散不可用，不消耗。

## 5.3 养脉丹

对一个选定 active meridian injury：

```text
remaining recovery -30日
```

如果扣减后到期，立即恢复。

- 不治疗 light；
- 不治疗 severe；
- 不治疗 poison；
- severe + meridian 同时存在时，只处理 meridian；
- 每条 meridian injury record 最多受益一次。

因此：

```text
45日普通经脉伤 → 服药后剩15日
90日极端经脉伤 → 服药后剩60日
```

一枚一阶中品养脉丹不能把严重经脉 / 丹田损伤瞬间清空。

---

# 六、治疗渠道

R21 只实现：

1. 自己使用真实药物；
2. 既有 10 / 30 日 `recuperate-days` 安全休养。

安全休养只按 worldDay 自然推进已有 `recoveryDay`，不另送 ×2 恢复加速。

医者 / 青云宗 / 家族治疗只预留 authoritative resolver / 内容 hook，不在 R21 伪造免费医生、商店或宗门医疗菜单。实际谁能治疗、价格、关系与地点由后续 NPC / 宗门内容轮承载。

---

# 七、非战斗死亡与恶化边界

继续保持：

```text
Combat HP = 0 → 立即死亡
```

R21 新增的通用非战斗死亡只有：

```text
serious poison 到达 death milestone → 死亡
```

severe 本身不会因为日历自然流逝而随机死亡。其危险来自：

- maxHP 降低；
- 探索 / 修炼 / 突破限制；
- 带 severe 再战时更容易真实 HP=0；
- 再次满足 severe 条件会延长恢复；
- 某个未来明确事件若声明“带重伤继续执行可能致死”，才按该事件规则处理。

R21 不做“每走一天重伤随机暴毙”。

poison 死亡需要克制因果记录，例如：

> 碧水蛇毒始终没有处理，毒性在十日后进一步加重；又过十日，最终毒发身亡。

不要写命运式升华。

---

# 八、统一时间结算要求

R21 必须把 poison milestone 放在 authoritative 时间推进路径，而不是只在某一个页面手动检查。

验收必须覆盖至少：

- 1日旅行跨 milestone；
- 10 / 30日探索或修炼跨 milestone；
- 10 / 30日 recuperate 跨 milestone；
- 14日筑基 / 60日结丹在 active poison 时应先被前置条件阻止；
- 一次跨过 mild→serious→death 的长行动会在 death day 中止。

若现有 `advanceWorldTime()` 需要最小扩展，允许修改；不要在旅行、探索、修炼分别复制一套 poison tick。

---

# 九、UI 最小要求

玩家必须能看到：

- 当前 active light / severe / meridian；
- 每条 injury 预计还需多少天自然恢复；
- 当前 poison family 的可读名称、mild / serious；
- 距离下次恶化 / 死亡还有多少天；
- 当前状态为什么阻止探索 / 修炼 / 突破；
- 三种治疗药当前可治疗什么；
- 使用后实际缩短多少天 / poison 如何降级。

不要显示内部 key，不写“状态系统已 materialize”之类工程文案。

治疗 UI 可以放在 Character / Inventory 附近的最小区块，不建立医院页面。

---

# 十、Session / save / replay

所有治疗和 poison state mutation 必须经过 SessionCommand / GameAction 或等价现有 authoritative dispatch。

不得 React 直接改 injury / poison。

必须：

- active poison 进入 state digest；
- save/reload 深拷贝；
- 旧存档无 poison 合法；
- treatment metadata optional；
- replay 同命令序列得到相同 state digest；
- poison 恶化不依赖 `Math.random()`。

若为测试 poison 创建 generic command / action，命名应表达“施加已冻结 poison condition”，不要把它做成玩家常驻作弊按钮。

---

# 十一、R21 必须测试

至少覆盖：

1. 旧 state 无 poison 合法；
2. light 仍修炼 ×0.90、探索允许、flee -5pp；
3. severe 阻止探索 / 修炼 / 突破，旅行允许；
4. severe Combat maxHP ×0.70；
5. severe 再次 severe 战斗结果延长 15 日且剩余 ≤90日；
6. meridian 阻止修炼 / 突破但允许旅行 / 探索；
7. meridian Combat maxQi ×0.65；
8. mild poison 10日后变 serious；
9. serious 再10日死亡；
10. same-family mild 再中毒立即 serious；
11. serious 再中毒不延长死亡 deadline；
12. long time advance 不跳过 mild→serious→death；
13. mild cultivation ×0.90；
14. serious 阻止探索 / 修炼；
15. serious Combat maxHP ×0.85；
16. severe + serious 只取 maxHP ×0.70；
17. 止血散 light -7日、severe -5日、每伤一次；
18. 清毒散 mild 一包清除；
19. 清毒散 serious 一包降 mild、第二包可清；
20. 养脉丹 meridian -30日、每伤一次；
21. 止血散不能治 meridian；养脉丹不能治 severe；
22. 无效用药不消耗库存；
23. 三种治疗不能在 active combat 中绕过 CombatEngine；
24. save/reload poison 与 treatment metadata；
25. replay digest；
26. R20 Combat / R18 injury / R19 breakthrough 既有测试不退化。

最后运行：

```text
npm run typecheck
npm test
npm run build
```

GitHub Actions 三项必须全绿。

---

# 十二、本轮明确禁止

- 不实现 R22 妖兽全量战斗；
- 不把碧水蛇正式敌人提前接进野外；
- 不做妖兽掉落 / 刷新 / unique death；
- 不新增第三毒性等级；
- 不做毒抗属性；
- 不做战斗每 beat poison DOT；
- 不做 persistent HP；
- 不做伤势 1～100；
- 不新增万能解毒药；
- 不做医院 / 宗门医疗系统；
- 不补商店来源；
- 不改 C20 战斗倍率；
- 不顺手做 R23 危险领地；
- 不补第二秘境 / 重大机缘 / 普通事件正文。

---

# 十三、验收标准

R21 完成必须实际跑通：

```text
战斗受伤
→ 带伤状态影响下一场战斗 / 行动
→ 用真实药物缩短恢复
→ worldDay 自然恢复
```

以及：

```text
施加 mild poison
→ 10日 untreated 变 serious
→ 清毒散可正确处理
或
→ 再10日 untreated 真死亡
```

同时：

- save/reload 不丢；
- replay 一致；
- 长行动不能跨过 poison death 继续领收益；
- 旧 R05～R20 state / replay 合法；
- 不包含 R22 功能；
- `HANDOFF.md` 更新；
- CI 全绿。

完成后停止，下一轮才考虑 C22 / R22。