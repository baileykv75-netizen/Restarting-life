import { getAdultEntryView } from '../core/adultEntryEngine'
import type { GameState } from '../types/game'

interface AdultEntryPanelProps {
  state: GameState
  onChoice: (optionId: string) => void
}

export function AdultEntryPanel({ state, onChoice }: AdultEntryPanelProps) {
  const view = getAdultEntryView(state)
  if (!view) {
    return <section className="story-card adult-entry-card"><p className="story-kicker">十六岁</p><h2>成年入口尚未建立</h2><p className="story-text">当前出身没有对应的成年入口数据。游戏已停在安全状态，没有回落到旧版行动循环。</p></section>
  }

  if (view.progress.resolved && view.selectedOption) {
    return <section className="story-card adult-entry-card adult-entry-resolved"><p className="story-kicker">成年起点已确定</p><h2>{view.selectedOption.label}</h2><p className="story-text">{view.selectedOption.resultText}</p><div className="adult-entry-origin"><span>下一阶段起点</span><strong>{view.selectedOption.startingLocationLabel}</strong></div><p className="muted adult-entry-stop">R07 到这里结束。地图、旅行和地点行动将在 R08 正式展开。</p></section>
  }

  return (
    <section className="story-card adult-entry-card">
      <div className="adult-entry-heading"><div><p className="story-kicker">十六岁 · {view.originLocationLabel}</p><h2>{view.title}</h2></div><span>{view.hasRoot ? '有灵根' : '无灵根'}</span></div>
      <p className="story-text">{view.situationText}</p>
      {view.contextNotes.length > 0 && <div className="adult-entry-context">{view.contextNotes.map((note) => <p key={note}>{note}</p>)}</div>}
      <p className="subsection-title adult-entry-subtitle">成年后的第一步</p>
      <div className="adult-entry-options">
        {view.options.map((option) => <button className="adult-entry-option" key={option.id} onClick={() => onChoice(option.id)} type="button"><strong>{option.label}</strong><span>{option.description}</span><em>起点 · {option.startingLocationLabel}</em></button>)}
      </div>
    </section>
  )
}
