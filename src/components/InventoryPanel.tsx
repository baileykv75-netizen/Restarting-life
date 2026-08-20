import { useState } from 'react'
import { getItemDefinition } from '../data/items'
import { getPoisonDefinition } from '../data/poisons'
import { getLifespanEffectByItemId } from '../data/lifespan'
import { isItemEquipped } from '../core/equipmentEngine'
import { getActiveInjuries } from '../core/injuryEngine'
import { getInventoryQuantity, getInventoryUsage, resolveInventoryDrop } from '../core/inventoryEngine'
import { hasLifespanEffect } from '../core/lifespanEngine'
import { getActivePoisonConditions } from '../core/poisonEngine'
import type { GameState } from '../types/game'
import type { InjuryCondition } from '../types/injury'
import type { ItemCategory } from '../types/inventory'
import { formatEquipmentSlot, formatItemGrade } from '../ui/itemFormatters'

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  material: '材料', pill: '丹药', artifact: '法器', weapon: '兵器', armor: '护具', talisman: '符箓', special: '特殊物', 'storage-bag': '储物袋',
}
const CATEGORY_ORDER: ItemCategory[] = ['storage-bag', 'material', 'pill', 'talisman', 'weapon', 'armor', 'artifact', 'special']

interface InventoryPanelProps {
  state: GameState
  onDrop: (itemId: string, quantity: number) => void
  onEquip: (itemId: string) => void
  onUseLifespanItem: (itemId: string) => void
  onUseTreatment: (itemId: string, injuryId?: string) => void
  onRecuperate: (days: 10 | 30) => void
}

function injuryLabel(injury: InjuryCondition): string {
  if (injury.kind === 'light') return '轻伤'
  if (injury.kind === 'severe') return '重伤'
  return '经脉伤'
}

function injuryEffect(injury: InjuryCondition): string {
  if (injury.kind === 'light') return '修炼效率 ×0.90；逃跑 -5%。'
  if (injury.kind === 'severe') return '不能新开荒野探索、修炼或突破；战斗最大气血 ×0.70；逃跑 -15%。'
  return '不能修炼或突破；战斗最大灵力 ×0.65；逃跑 -10%。'
}

export function InventoryPanel({ state, onDrop, onEquip, onUseLifespanItem, onUseTreatment, onRecuperate }: InventoryPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const inventory = state.inventory
  if (!inventory) return null
  const usage = getInventoryUsage(state)
  const injuries = getActiveInjuries(state)
  const poisons = getActivePoisonConditions(state)
  const hasHealthCondition = injuries.length > 0 || poisons.length > 0
  const entries = Object.values(inventory.stacks)
    .map((stack) => ({ stack, definition: getItemDefinition(stack.itemId) }))
    .filter((entry) => entry.definition !== undefined)
    .sort((a, b) => {
      const categoryDelta = CATEGORY_ORDER.indexOf(a.definition!.category) - CATEGORY_ORDER.indexOf(b.definition!.category)
      return categoryDelta || a.definition!.name.localeCompare(b.definition!.name, 'zh-CN')
    })

  return <section className={`story-card inventory-card compactible-card ${expanded ? 'expanded' : 'collapsed'}`} aria-label="随身背包">
    <div className="inventory-heading">
      <div><p className="story-kicker">随身物品</p><h2>背包</h2></div>
      <strong>{usage.usedSlots} / {usage.capacitySlots} 槽</strong>
    </div>
    <div className="inventory-summary-row">
      <span>{entries.length === 0 ? '没有随身物品' : `${entries.length} 类物品`}</span>
      {hasHealthCondition && <em>{injuries.length > 0 ? `${injuries.length} 条伤势` : ''}{injuries.length > 0 && poisons.length > 0 ? ' · ' : ''}{poisons.length > 0 ? `${poisons.length} 条中毒` : ''}</em>}
      <button className="panel-expand-button" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? '收起背包' : '打开背包'}</button>
    </div>

    {expanded && <div className="panel-expanded-content">
      {inventory.storageBagItemId && <p className="inventory-capacity-note">小型储物袋正在提供 +12 槽容量；额外储物袋不会重复叠加。</p>}

      {hasHealthCondition && <div className="inventory-list" aria-label="身体状况">
        <div className="inventory-row">
          <div className="inventory-item-copy"><div><strong>身体状况</strong><span>伤势 / 中毒</span></div><p>伤势会随静养恢复；中毒需要处理，否则会继续恶化。</p></div>
          <div className="inventory-actions"><button className="secondary-button" disabled={state.status !== 'playing'} onClick={() => onRecuperate(10)} type="button">静养 10 日</button><button className="secondary-button" disabled={state.status !== 'playing'} onClick={() => onRecuperate(30)} type="button">静养 30 日</button></div>
        </div>
        {injuries.map((injury) => {
          const remaining = Math.max(0, injury.recoveryDay - state.worldDay)
          const medicineId = injury.kind === 'meridian' ? 'yangmai_dan' : 'zhixue_san'
          const medicineName = getItemDefinition(medicineId)?.name ?? medicineId
          const treated = injury.treatmentKeys?.includes(medicineId) ?? false
          const owned = getInventoryQuantity(state, medicineId) > 0
          return <div className="inventory-row" key={injury.id}><div className="inventory-item-copy"><div><strong>{injuryLabel(injury)}</strong><span>预计还需 {remaining} 日恢复</span></div><p>{injuryEffect(injury)}</p>{treated && <em>这条伤势已经用过{medicineName}。</em>}</div><div className="inventory-actions"><button className="inventory-equip-button" disabled={treated || !owned || state.status !== 'playing'} onClick={() => onUseTreatment(medicineId, injury.id)} type="button">{treated ? `${medicineName}已用` : owned ? `使用${medicineName}` : `缺少${medicineName}`}</button></div></div>
        })}
        {poisons.map((poison) => {
          const definition = getPoisonDefinition(poison.family)
          const remaining = Math.max(0, poison.nextWorsenDay - state.worldDay)
          const serious = poison.severity === 'serious'
          const owned = getInventoryQuantity(state, 'qingdu_san') > 0
          return <div className="inventory-row" key={poison.family}><div className="inventory-item-copy"><div><strong>{definition.name}</strong><span>{serious ? '严重中毒' : '轻度中毒'}</span></div><small>{serious ? `${remaining} 日后若仍未处理将毒发身亡` : `${remaining} 日后会恶化为严重中毒`}</small><p>{serious ? '不能新开荒野探索、修炼或突破；战斗最大气血 ×0.85。' : '修炼效率 ×0.90；不能进行大境界突破。'}</p></div><div className="inventory-actions"><button className="inventory-equip-button" disabled={!owned || state.status !== 'playing'} onClick={() => onUseTreatment('qingdu_san')} type="button">{owned ? '使用清毒散' : '缺少清毒散'}</button></div></div>
        })}
      </div>}

      {entries.length === 0 ? <p className="muted inventory-empty">当前没有随身物品。</p> : <div className="inventory-list">{entries.map(({ stack, definition }) => {
        const item = definition!
        const slots = Math.ceil(stack.quantity / item.stackLimit) * item.slotCost
        const dropCheck = resolveInventoryDrop(state, stack.itemId, 1)
        const equipped = isItemEquipped(state, stack.itemId)
        const lifespanEffect = getLifespanEffectByItemId(stack.itemId)
        const lifespanApplied = lifespanEffect ? hasLifespanEffect(state, lifespanEffect.effectKey) : false
        return <div className="inventory-row" key={stack.itemId}>
          <div className="inventory-item-copy"><div><strong>{item.name}</strong><span>{CATEGORY_LABELS[item.category]}</span></div><small>数量 {stack.quantity} · 占 {slots} 槽{item.equipmentSlot ? ` · ${formatEquipmentSlot(item.equipmentSlot)} · ${formatItemGrade(item)}` : ''}</small>{item.description && <p>{item.description}</p>}{lifespanEffect && lifespanApplied && <em>这一类延寿效果已经生效。</em>}{!dropCheck.applied && (dropCheck.reason === '取下后背包容量不足' || dropCheck.reason === '请先卸下正在装备的物品') && <em>{dropCheck.reason}</em>}</div>
          <div className="inventory-actions">
            {item.equipmentSlot && state.equipment && (equipped ? <span className="inventory-equipped-label">已装备</span> : <button className="inventory-equip-button" onClick={() => onEquip(stack.itemId)} type="button">装备</button>)}
            {lifespanEffect && (lifespanApplied ? <span className="inventory-equipped-label">延寿已生效</span> : <button className="inventory-equip-button" disabled={state.status !== 'playing'} onClick={() => onUseLifespanItem(stack.itemId)} type="button">用于延寿 +{lifespanEffect.years} 年</button>)}
            <button className="inventory-drop-button" disabled={!dropCheck.applied} onClick={() => onDrop(stack.itemId, 1)} type="button">丢弃 1 份{item.name}</button>
          </div>
        </div>
      })}</div>}
    </div>}
  </section>
}
