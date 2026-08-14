import type { EventChoice, GameEvent } from '../types/event'

interface EventPanelProps {
  event: GameEvent
  choices: readonly EventChoice[]
  onChoice: (choiceId: string) => void
}

export function EventPanel({ event, choices, onChoice }: EventPanelProps) {
  const authoredAsSingleChoice = event.choices.length === 1

  return (
    <section className="story-card event-card">
      <p className="story-kicker">眼前之事</p>
      <h2>{event.title}</h2>
      <p className="story-text">{event.text}</p>
      <div className="choice-list">
        {choices.map((choice, index) => (
          <button className="choice-button choice-button-rich" key={choice.id} onClick={() => onChoice(choice.id)} type="button">
            {!authoredAsSingleChoice && <span className="choice-index">{index + 1}</span>}
            <span>{authoredAsSingleChoice ? '继续' : choice.text}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
