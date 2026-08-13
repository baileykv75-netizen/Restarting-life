import type { PlayerAction } from '../types/command'
import type { GameState } from '../types/game'

interface ActionPanelProps {
  state: GameState
  actions: readonly PlayerAction[]
  onAction: (action: PlayerAction) => void
}

function actionLabel(action: PlayerAction, state: GameState): string {
  if (action === 'cultivate') return '闭关修炼 · 一年'
  if (action === 'explore') return '外出历练 · 半年'
  if (action === 'breakthrough') return '尝试突破'
  if (state.identity.faction === 'qingyun') return '宗门任务 · 半年'
  if (state.identity.faction === 'loose') return '接取委托 · 半年'
  return state.tags.includes('has_spirit_root') ? '凡尘谋生 / 寻找仙缘 · 半年' : '凡尘谋生 · 半年'
}

export function ActionPanel({ state, actions, onAction }: ActionPanelProps) {
  return (
    <section className="story-card">
      <p className="story-kicker">接下来</p>
      <h2>这一段岁月，你打算如何度过？</h2>
      <p className="story-text">每个行动都会真实推进时间。寿元、修为与旧日因果会继续累积。</p>
      <div className="action-grid">
        {actions.map((action) => (
          <button className="action-button" key={action} onClick={() => onAction(action)} type="button">
            {actionLabel(action, state)}
          </button>
        ))}
      </div>
    </section>
  )
}
