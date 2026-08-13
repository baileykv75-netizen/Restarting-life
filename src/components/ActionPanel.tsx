import type { PlayerAction } from '../types/command'
import type { GameState } from '../types/game'

interface ActionPanelProps {
  state: GameState
  actions: readonly PlayerAction[]
  onAction: (action: PlayerAction) => void
}

function actionLabel(action: PlayerAction, state: GameState): string {
  if (action === 'cultivate') return '闭关修炼 · 1年 · 稳定积累修为'
  if (action === 'explore') return '外出历练 · 半年 · 机缘与风险并存'
  if (action === 'breakthrough') return '尝试突破 · 进入大境界考验'
  if (state.identity.faction === 'qingyun') return '宗门事务 · 半年 · 灵石 / 人情 / 机会'
  if (state.identity.faction === 'loose') return '散修谋生 · 半年 · 委托 / 坊市 / 人脉'
  return state.tags.includes('has_spirit_root')
    ? '凡尘谋生 · 半年 · 攒资源并寻找仙缘'
    : '凡尘谋生 · 半年 · 在有限寿元里寻找改命机会'
}

export function ActionPanel({ state, actions, onAction }: ActionPanelProps) {
  return (
    <section className="story-card">
      <p className="story-kicker">安排下一段人生</p>
      <h2>这一段岁月，你准备把时间花在哪里？</h2>
      <p className="story-text">行动会真实消耗寿元；事件选择之后会先展示明确的时间、灵石、修为、属性与关系变化。</p>
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
