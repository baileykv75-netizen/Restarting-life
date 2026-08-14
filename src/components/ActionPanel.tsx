import { getActionDuration } from '../data/actionDurations'
import type { PlayerAction } from '../types/command'
import type { GameState } from '../types/game'
import type { Duration } from '../types/time'
import { formatDuration } from '../core/timeEngine'

interface ActionPanelProps {
  state: GameState
  actions: readonly PlayerAction[]
  onAction: (action: PlayerAction) => void
}

function durationPreview(duration: Duration | null): string {
  if (!duration) return ''
  if (duration.type === 'fixed') return formatDuration(duration.days)
  return `${formatDuration(duration.minDays)}～${formatDuration(duration.maxDays)}`
}

function actionLabel(action: PlayerAction, state: GameState): string {
  if (action === 'breakthrough') return '尝试突破 · 进入大境界考验'

  const duration = durationPreview(getActionDuration(action))
  if (action === 'cultivate') return `闭关修炼 · 约${duration} · 稳定积累修为`
  if (action === 'explore') return `外出历练 · 约${duration} · 机缘与风险并存`
  if (state.identity.faction === 'qingyun') return `宗门事务 · 约${duration} · 灵石 / 人情 / 机会`
  if (state.identity.faction === 'loose') return `散修谋生 · 约${duration} · 委托 / 坊市 / 人脉`
  return state.tags.includes('has_spirit_root')
    ? `凡尘谋生 · 约${duration} · 攒资源并寻找仙缘`
    : `凡尘谋生 · 约${duration} · 在有限寿元里寻找改命机会`
}

export function ActionPanel({ state, actions, onAction }: ActionPanelProps) {
  return (
    <section className="story-card">
      <p className="story-kicker">安排下一段人生</p>
      <h2>这一段岁月，你准备把时间花在哪里？</h2>
      <p className="story-text">不同事情会消耗不同时间；事件选择之后会先展示明确的时间、灵石、修为、属性与关系变化。</p>
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
