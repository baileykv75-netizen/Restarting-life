import type { EventChoice, GameEvent } from '../types/event'

interface EventPanelProps {
  event: GameEvent
  choices: readonly EventChoice[]
  onChoice: (choiceId: string) => void
}

export function EventPanel({ event, choices, onChoice }: EventPanelProps) {
  return (
    <section className="story-card event-card">
      <p className="story-kicker">当前事件</p>
      <h2>{event.title}</h2>
      <p className="story-text">{event.text}</p>
      <div className="choice-list">
        {choices.map((choice) => (
          <button className="choice-button" key={choice.id} onClick={() => onChoice(choice.id)} type="button">
            {choice.text}
          </button>
        ))}
      </div>
    </section>
  )
}
