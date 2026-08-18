import { getItemDefinition } from '../data/items'
import { getInventoryUsage } from '../core/inventoryEngine'
import type { GameState } from '../types/game'

interface BeastLootPanelProps {
  state: GameState
  onClaim: (itemId: string, quantity: number) => void
  onAbandon: () => void
}

export function BeastLootPanel({ state, onClaim, onAbandon }: BeastLootPanelProps) {
  const pending = state.pendingBeastLoot
  if (!pending) return null
  const usage = getInventoryUsage(state)
  const entries = Object.entries(pending.remaining).filter(([, quantity]) => quantity > 0)

  return <section className="story-card beast-loot-card">
    <p className="story-kicker">战后 · 尸体材料</p>
    <h2>{pending.beastName}</h2>
    <p className="story-text">战斗已经结束。下面这些材料仍留在尸体旁，只有明确领取后才进入背包。</p>
    <div className="beast-loot-capacity">
      <span>背包占用</span>
      <strong>{usage.usedSlots} / {usage.capacitySlots}</strong>
    </div>
    <div className="beast-loot-list">
      {entries.map(([itemId, quantity]) => {
        const definition = getItemDefinition(itemId)
        return <div className="beast-loot-row" key={itemId}>
          <div>
            <strong>{definition?.name ?? itemId}</strong>
            <span>剩余 ×{quantity}</span>
          </div>
          <div className="beast-loot-actions">
            <button className="secondary-button" onClick={() => onClaim(itemId, 1)} type="button">领取 1</button>
            {quantity > 1 && <button className="secondary-button" onClick={() => onClaim(itemId, quantity)} type="button">全部领取</button>}
          </div>
        </div>
      })}
    </div>
    <p className="muted">如果背包装不下，本次领取会直接失败，尸体上的剩余材料不会消失。</p>
    <button className="text-button beast-loot-abandon" onClick={onAbandon} type="button">放弃剩余材料并离开</button>
  </section>
}
