import { getAvailableChildhoodChoices, getCurrentChildhoodEvent, getVisibleChildhoodInsights } from '../core/childhoodEngine'
import type { GameState } from '../types/game'

export function ChildhoodPanel({ state, onChoice }: { state: GameState; onChoice: (choiceId: string) => void }) {
  const event = getCurrentChildhoodEvent(state)
  if (!event) {
    return <section className="story-card childhood-card"><p className="story-kicker">童年</p><h2>童年节点无法读取</h2><p className="story-text">当前存档没有可执行的童年节点。为避免误写状态，本页没有继续推进。</p></section>
  }
  const choices = getAvailableChildhoodChoices(state, event)
  const insights = getVisibleChildhoodInsights(state, event)
  return (
    <section className="story-card childhood-card">
      <div className="childhood-heading"><div><p className="story-kicker">童年 · {event.ageYears}岁</p><h2>{event.title}</h2></div><span>{state.childhood ? `${state.childhood.currentIndex + 1} / ${state.childhood.nodeIds.length}` : ''}</span></div>
      <p className="story-text">{event.narrative}</p>
      {insights.length > 0 && <div className="childhood-insights">{insights.map((text) => <p key={text}>{text}</p>)}</div>}
      <div className="childhood-choices">
        {choices.map((choice) => <button className="childhood-choice" key={choice.id} onClick={() => onChoice(choice.id)} type="button"><strong>{choice.label}</strong>{(choice.timeText || choice.riskText) && <span>{[choice.timeText, choice.riskText].filter(Boolean).join(' ')}</span>}</button>)}
      </div>
    </section>
  )
}
