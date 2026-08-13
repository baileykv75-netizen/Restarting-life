import type { EventChoice, GameEvent } from '../types/event'

interface EventPanelProps {
  event: GameEvent
  choices: readonly EventChoice[]
  onChoice: (choiceId: string) => void
}

export function EventPanel({ event, choices, onChoice }: EventPanelProps) {
  return (
    <section className="story-card event-card">
      <div className="event-heading-row">
        <p className="story-kicker">当前事件</p>
        <span className="choice-count">{choices.length} 条可行之路</span>
      </div>
      <h2>{event.title}</h2>
      <p className="story-text">{event.text}</p>
      <div className="choice-list">
        {choices.map((choice, index) => (
          <button className="choice-button choice-button-rich" key={choice.id} onClick={() => onChoice(choice.id)} type="button">
            <span className="choice-index">{index + 1}</span>
            <span>{choice.text}</span>
          </button>
        ))}
      </div>
      <p className="choice-footnote">选择后会先结算真实数值与因果，再进入下一段人生。</p>
    </section>
  )
}
