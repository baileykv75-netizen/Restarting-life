import type { GameState } from '../types/game'

export function LocationKnowledgeSetupPanel({ state, onInitialize }: { state: GameState; onInitialize: () => void }) {
  const inheritedClues = state.tags.filter((tag) => tag.startsWith('location_seed:')).length
  return (
    <section className="story-card knowledge-setup-card">
      <p className="story-kicker">青霞地界 · 既有见闻</p>
      <h2>整理你真正知道的地方</h2>
      <p className="story-text">出生以来听过、去过的地点，以及你现在亲自站着的地方，将成为这一世最初的地图认知。没有听说过的地方不会提前出现在地图上。</p>
      <p className="muted">已有地点见闻线索 {inheritedClues} 条。这一步只整理已有经历，不推进时间，也不会发现新的地点。</p>
      <button className="primary-button knowledge-setup-button" onClick={onInitialize} type="button">整理已有见闻</button>
    </section>
  )
}
