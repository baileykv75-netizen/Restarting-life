import { getItemDefinition } from '../data/items'
import {
  getAvailableCombatItems,
  getCombatMoveViews,
  getCombatOpponentName,
  getCombatOpponentRealmLabel,
  getCombatStatusLabels,
  getPlayerFleePreview,
} from '../core/combatEngine'
import { getEquippedItemId } from '../core/equipmentEngine'
import type { CombatAction } from '../types/combat'
import type { GameState } from '../types/game'

interface CombatPanelProps {
  state: GameState
  onAction: (action: CombatAction) => void
}

function hpPercent(current: number, max: number): number {
  return Math.max(0, Math.min(100, (current / max) * 100))
}

export function CombatPanel({ state, onAction }: CombatPanelProps) {
  const combat = state.combat
  if (!combat) return null
  const opponentName = getCombatOpponentName(combat.opponentId)
  const moves = getCombatMoveViews(state)
  const items = getAvailableCombatItems(state)
  const flee = getPlayerFleePreview(state)
  const weaponId = getEquippedItemId(state, 'main-weapon')
  const weaponName = weaponId ? (getItemDefinition(weaponId)?.name ?? weaponId) : '未持法器'
  const playerStatuses = getCombatStatusLabels(combat.player, combat.beat)
  const opponentStatuses = getCombatStatusLabels(combat.opponent, combat.beat)
  const backupWeapons = Object.values(state.inventory?.stacks ?? {})
    .filter((stack) => stack.quantity > 0 && getItemDefinition(stack.itemId)?.equipmentSlot === 'main-weapon' && stack.itemId !== weaponId)

  return <section className="story-card combat-card">
    <div className="combat-heading">
      <div><p className="story-kicker">正式交锋 · 第 {combat.beat} 拍</p><h2>{opponentName}</h2><p className="muted">{getCombatOpponentRealmLabel(combat.opponentId)}</p></div>
      <span className={combat.source === 'sunken-vein-core' ? 'combat-source locked' : 'combat-source'}>{combat.source === 'sunken-vein-core' ? '脉心室 · 无法撤离' : '当前地点交锋'}</span>
    </div>

    <div className="combat-vitals">
      <div className="combat-vital"><div><span>你</span><strong>{combat.player.currentHP} / {combat.player.maxHP} HP</strong></div><div className="combat-bar"><i style={{ width: `${hpPercent(combat.player.currentHP, combat.player.maxHP)}%` }} /></div><small>灵力 {combat.player.currentQi} / {combat.player.maxQi} · {weaponName}</small>{playerStatuses.length > 0 && <p>{playerStatuses.join(' · ')}</p>}</div>
      <div className="combat-vital"><div><span>{opponentName}</span><strong>{combat.opponent.currentHP} / {combat.opponent.maxHP} HP</strong></div><div className="combat-bar"><i style={{ width: `${hpPercent(combat.opponent.currentHP, combat.opponent.maxHP)}%` }} /></div>{opponentStatuses.length > 0 && <p>{opponentStatuses.join(' · ')}</p>}</div>
    </div>

    {combat.telegraph && <div className="combat-telegraph"><strong>敌方动作已经显露</strong><p>{combat.telegraph.label}</p><span>这一拍可以进攻、防御、用物品，或在允许时尝试撤离。</span></div>}

    <div className="combat-section">
      <p className="subsection-title">本拍行动</p>
      <button className="primary-button combat-wide" onClick={() => onAction({ type: 'basic' })} type="button">普通攻击 / 继续交锋</button>
      {moves.length > 0 && <div className="combat-action-grid">{moves.map((move) => <button disabled={!move.ready} key={move.key} onClick={() => onAction({ type: 'move', techniqueId: move.techniqueId, moveId: move.moveId })} type="button"><strong>{move.name}</strong><span>耗灵 {move.qiCost}{move.reason ? ` · ${move.reason}` : ''}</span></button>)}</div>}
    </div>

    {items.length > 0 && <div className="combat-section"><p className="subsection-title">战斗物品</p><div className="combat-action-grid">{items.map((item) => <button disabled={item.itemId === 'huiqi_dan' && combat.qiPillsUsed >= 2} key={item.itemId} onClick={() => onAction({ type: 'item', itemId: item.itemId })} type="button"><strong>{item.name} ×{item.quantity}</strong><span>{item.itemId === 'huiqi_dan' ? `本场已用 ${combat.qiPillsUsed}/2` : '使用占用本拍行动'}</span></button>)}</div></div>}

    {backupWeapons.length > 0 && <div className="combat-section"><p className="subsection-title">快速换武器</p><div className="combat-action-grid">{backupWeapons.map((stack) => <button disabled={combat.weaponSwitchUsedThisBeat} key={stack.itemId} onClick={() => onAction({ type: 'switch-weapon', itemId: stack.itemId })} type="button"><strong>{getItemDefinition(stack.itemId)?.name ?? stack.itemId}</strong><span>{combat.weaponSwitchUsedThisBeat ? '本拍已经换过一次' : '不占本拍行动'}</span></button>)}</div></div>}

    <div className="combat-flee">
      <div><strong>撤离</strong>{flee?.blockedReason ? <span>当前无法撤离</span> : <span>成功率 {flee?.chance ?? 0}%</span>}</div>
      {!flee?.blockedReason && flee && <p>{flee.modifiers.length > 0 ? flee.modifiers.map((modifier) => `${modifier.label} ${modifier.percent >= 0 ? '+' : ''}${modifier.percent}%`).join(' · ') : '无额外修正'}</p>}
      <button className="secondary-button combat-wide" disabled={Boolean(flee?.blockedReason)} onClick={() => onAction({ type: 'flee' })} type="button">尝试撤离</button>
    </div>

    <div className="combat-log"><p className="subsection-title">最近交锋</p>{combat.log.map((line, index) => <p key={`${combat.beat}-${index}-${line}`}>{line}</p>)}</div>
  </section>
}
