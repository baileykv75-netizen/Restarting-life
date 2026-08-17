import { getItemDefinition } from '../data/items'
import { getLifespanEffectByItemId } from '../data/lifespan'
import { isItemEquipped } from '../core/equipmentEngine'
import { getInventoryUsage, resolveInventoryDrop } from '../core/inventoryEngine'
import { hasLifespanEffect } from '../core/lifespanEngine'
import type { GameState } from '../types/game'
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
}

export function InventoryPanel({ state, onDrop, onEquip, onUseLifespanItem }: InventoryPanelProps) {
  const inventory = state.inventory
  if (!inventory) return null
  const usage = getInventoryUsage(state)
  const entries = Object.values(inventory.stacks)
    .map((stack) => ({ stack, definition: getItemDefinition(stack.itemId) }))
    .filter((entry) => entry.definition !== undefined)
    .sort((a, b) => {
      const categoryDelta = CATEGORY_ORDER.indexOf(a.definition!.category) - CATEGORY_ORDER.indexOf(b.definition!.category)
      return categoryDelta || a.definition!.name.localeCompare(b.definition!.name, 'zh-CN')
    })

  return <section className="story-card inventory-card" aria-label="随身背包">
    <div className="inventory-heading">
      <div><p className="story-kicker">随身物品</p><h2>背包</h2></div>
      <strong>{usage.usedSlots} / {usage.capacitySlots} 槽</strong>
    </div>
    {inventory.storageBagItemId && <p className="inventory-capacity-note">小型储物袋正在提供 +12 槽容量；额外储物袋不会重复叠加。</p>}
    {entries.length === 0
      ? <p className="muted inventory-empty">当前没有随身物品。</p>
      : <div className="inventory-list">{entries.map(({ stack, definition }) => {
          const item = definition!
          const slots = Math.ceil(stack.quantity / item.stackLimit) * item.slotCost
          const dropCheck = resolveInventoryDrop(state, stack.itemId, 1)
          const equipped = isItemEquipped(state, stack.itemId)
          const lifespanEffect = getLifespanEffectByItemId(stack.itemId)
          const lifespanApplied = lifespanEffect ? hasLifespanEffect(state, lifespanEffect.effectKey) : false
          return <div className="inventory-row" key={stack.itemId}>
            <div className="inventory-item-copy">
              <div><strong>{item.name}</strong><span>{CATEGORY_LABELS[item.category]}</span></div>
              <small>数量 {stack.quantity} · 占 {slots} 槽{item.equipmentSlot ? ` · ${formatEquipmentSlot(item.equipmentSlot)} · ${formatItemGrade(item)}` : ''}</small>
              {item.description && <p>{item.description}</p>}
              {lifespanEffect && lifespanApplied && <em>这一类延寿效果已经生效，再使用不会继续增加寿元。</em>}
              {!dropCheck.applied && (dropCheck.reason === '取下后背包容量不足' || dropCheck.reason === '请先卸下正在装备的物品') && <em>{dropCheck.reason}</em>}
            </div>
            <div className="inventory-actions">
              {item.equipmentSlot && state.equipment && (equipped
                ? <span className="inventory-equipped-label">已装备</span>
                : <button className="inventory-equip-button" onClick={() => onEquip(stack.itemId)} type="button">装备</button>)}
              {lifespanEffect && (lifespanApplied
                ? <span className="inventory-equipped-label">延寿已生效</span>
                : <button className="inventory-equip-button" disabled={state.status !== 'playing'} onClick={() => onUseLifespanItem(stack.itemId)} type="button">用于延寿 +{lifespanEffect.years} 年</button>)}
              <button className="inventory-drop-button" disabled={!dropCheck.applied} onClick={() => onDrop(stack.itemId, 1)} type="button">丢弃 1 份{item.name}</button>
            </div>
          </div>
        })}</div>}
  </section>
}
