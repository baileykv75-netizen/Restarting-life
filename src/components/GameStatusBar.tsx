import type { GameState } from '../types/game'
import { formatAge, formatRealm, formatRemainingLifespan } from '../ui/formatters'

interface GameStatusBarProps {
  state: GameState
}

export function GameStatusBar({ state }: GameStatusBarProps) {
  return (
    <section className="status-strip" aria-label="当前人生状态">
      <div className="status-item">
        <span>年龄</span>
        <strong>{formatAge(state.worldDay, state.identity.birthDay)}</strong>
      </div>
      <div className="status-item">
        <span>境界</span>
        <strong>{formatRealm(state)}</strong>
      </div>
      <div className="status-item">
        <span>寿元</span>
        <strong>{formatRemainingLifespan(state)}</strong>
      </div>
      <div className="status-item">
        <span>灵石</span>
        <strong>{state.resources.spiritStones} 枚</strong>
      </div>
    </section>
  )
}
