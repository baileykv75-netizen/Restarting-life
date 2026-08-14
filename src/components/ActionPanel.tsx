import { getActionDuration } from '../data/actionDurations'
import type { PlayerAction } from '../types/command'
import type { GameState } from '../types/game'
import type { Duration } from '../types/time'
import { formatDuration } from '../core/timeEngine'

/**
 * V2 migration boundary: this component is the V1.2 legacy gameplay shell.
 * Keep its current behavior stable during migration, but do not expand it into
 * the V2 world interaction model. It should retire only after the location-
 * driven World Shell has been implemented and verified.
 */

interface ActionPanelProps {
  state: GameState
  actions: readonly PlayerAction[]
  onAction: (action: PlayerAction) => void
}

interface ActionCopy {
  title: string
  duration?: string
  description: string
}

function durationPreview(duration: Duration | null): string {
  if (!duration) return ''
  if (duration.type === 'fixed') return `约${formatDuration(duration.days)}`
  return `约${formatDuration(duration.minDays)}～${formatDuration(duration.maxDays)}`
}

function actionCopy(action: PlayerAction, state: GameState): ActionCopy {
  if (action === 'breakthrough') {
    return {
      title: '尝试突破',
      description: '把已经积累的修为推向下一个境界。',
    }
  }

  const duration = durationPreview(getActionDuration(action))
  if (action === 'cultivate') {
    return {
      title: '闭关修炼',
      duration,
      description: '静下心来打磨当前境界。',
    }
  }
  if (action === 'explore') {
    return {
      title: '外出走走',
      duration,
      description: '离开熟悉之地一阵，路上未必总有收获。',
    }
  }
  if (state.identity.faction === 'qingyun') {
    return {
      title: '接宗门差事',
      duration,
      description: '替宗门做些事情，换取报酬，也会遇见同门。',
    }
  }
  if (state.identity.faction === 'loose') {
    return {
      title: '接些散修营生',
      duration,
      description: '靠委托和手头本事维持修行。',
    }
  }
  return {
    title: '在镇上谋生',
    duration,
    description: state.tags.includes('has_spirit_root')
      ? '先把眼前日子过稳，再想修行需要的资源。'
      : '先活下去，也留心那些可能改变命运的消息。',
  }
}

export function ActionPanel({ state, actions, onAction }: ActionPanelProps) {
  return (
    <section className="story-card">
      <p className="story-kicker">接下来做什么</p>
      <h2>眼下没有非做不可的事。</h2>
      <p className="story-text">你可以自己安排这一段时间。</p>
      <div className="action-grid">
        {actions.map((action) => {
          const copy = actionCopy(action, state)
          return (
            <button className="action-button action-button-rich" key={action} onClick={() => onAction(action)} type="button">
              <strong>{copy.title}</strong>
              {copy.duration && <span>{copy.duration}</span>}
              <small>{copy.description}</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}
