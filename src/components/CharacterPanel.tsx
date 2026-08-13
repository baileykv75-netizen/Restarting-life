import type { GameState } from '../types/game'
import { BACKGROUNDS } from '../data/backgrounds'
import { SPIRIT_ROOTS } from '../data/spiritRoots'
import { TALENTS } from '../data/talents'
import { formatAge, formatFaction, formatRealm, formatRemainingLifespan } from '../ui/formatters'

interface CharacterPanelProps {
  state: GameState
  runNumber: number
}

function findName<T extends { id: string; name: string }>(items: readonly T[], id: string): string {
  return items.find((item) => item.id === id)?.name ?? id
}

export function CharacterPanel({ state, runNumber }: CharacterPanelProps) {
  const rootName = state.tags.includes('spirit_root:reformed')
    ? '后天杂灵根'
    : findName(SPIRIT_ROOTS, state.identity.spiritRootId)
  const talentNames = state.identity.talentIds.map((id) => findName(TALENTS, id))

  return (
    <aside className="panel character-panel" aria-label="角色状态">
      <div className="panel-heading"><span>此世命格</span><strong>第 {runNumber} 世</strong></div>
      <div className="identity-block">
        <p className="realm-title">{formatRealm(state)}</p>
        <p className="muted">{formatAge(state.timeMonths)} · {formatFaction(state)}</p>
      </div>
      <dl className="facts-grid">
        <div><dt>出身</dt><dd>{findName(BACKGROUNDS, state.identity.backgroundId)}</dd></div>
        <div><dt>灵根</dt><dd>{rootName}</dd></div>
        <div><dt>寿元余量</dt><dd>{formatRemainingLifespan(state)}</dd></div>
        <div><dt>灵石</dt><dd>{state.resources.spiritStones}</dd></div>
        <div><dt>修为</dt><dd>{state.resources.cultivation}</dd></div>
      </dl>
      <div className="subsection">
        <p className="subsection-title">天赋</p>
        <div className="tag-row">{talentNames.map((name) => <span className="tag" key={name}>{name}</span>)}</div>
      </div>
      <div className="subsection">
        <p className="subsection-title">根骨五维</p>
        <div className="stats-grid">
          <div><span>根骨</span><strong>{state.stats.constitution}</strong></div>
          <div><span>悟性</span><strong>{state.stats.comprehension}</strong></div>
          <div><span>神识</span><strong>{state.stats.spiritSense}</strong></div>
          <div><span>心性</span><strong>{state.stats.mentality}</strong></div>
          <div><span>气运</span><strong>{state.stats.luck}</strong></div>
        </div>
      </div>
    </aside>
  )
}
