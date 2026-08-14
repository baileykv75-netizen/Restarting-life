import { BACKGROUNDS } from '../data/backgrounds'
import { SPIRIT_ROOTS } from '../data/spiritRoots'
import { TALENTS } from '../data/talents'
import { getEffectiveStat, getRealmStatBonus } from '../core/effectiveStats'
import { getCharacterDisplayName } from '../core/nameEngine'
import type { StatModifiers } from '../types/content'
import type { GameState } from '../types/game'
import { formatAge, formatFaction, formatRealm, formatRemainingLifespan } from '../ui/formatters'

interface CharacterPanelProps {
  state: GameState
}

const STAT_LABELS: Record<keyof GameState['stats'], string> = {
  constitution: '根骨',
  comprehension: '悟性',
  spiritSense: '神识',
  mentality: '心性',
  luck: '气运',
}

function findName<T extends { id: string; name: string }>(items: readonly T[], id: string): string {
  return items.find((item) => item.id === id)?.name ?? id
}

function effectLabels(statModifiers: StatModifiers, spiritStones: number): string[] {
  const labels = Object.entries(statModifiers)
    .filter(([, value]) => value !== undefined && value !== 0)
    .map(([key, value]) => {
      const amount = value ?? 0
      return `${STAT_LABELS[key as keyof GameState['stats']]} ${amount > 0 ? '+' : ''}${amount}`
    })

  if (spiritStones !== 0) {
    labels.push(`下品灵石 ${spiritStones > 0 ? '+' : ''}${spiritStones}`)
  }

  return labels
}

export function CharacterPanel({ state }: CharacterPanelProps) {
  const background = BACKGROUNDS.find((item) => item.id === state.identity.backgroundId)
  const talents = state.identity.talentIds
    .map((id) => TALENTS.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined)
  const rootName = state.tags.includes('spirit_root:reformed')
    ? '后天杂灵根'
    : findName(SPIRIT_ROOTS, state.identity.spiritRootId)
  const spiritBonus = getRealmStatBonus(state, 'spiritSense')
  const effectiveSpiritSense = getEffectiveStat(state, 'spiritSense')
  const displayName = getCharacterDisplayName(state.identity.name, state.runSeed)

  return (
    <aside className="panel character-panel" aria-label="人物状态">
      <div className="panel-heading"><span>人物</span><strong>{formatFaction(state)}</strong></div>
      <div className="identity-block">
        <p className="character-name">{displayName}</p>
        <p className="realm-title">{formatRealm(state)}</p>
        <p className="muted">{formatAge(state.worldDay, state.identity.birthDay)}</p>
      </div>

      <dl className="facts-grid">
        <div><dt>灵根</dt><dd>{rootName}</dd></div>
        <div><dt>寿元余量</dt><dd>{formatRemainingLifespan(state)}</dd></div>
        <div><dt>下品灵石</dt><dd>{state.resources.spiritStones} 枚</dd></div>
        <div><dt>修为</dt><dd>{state.resources.cultivation}</dd></div>
      </dl>

      <div className="subsection">
        <p className="subsection-title">出身</p>
        {background ? (
          <div className="trait-card trait-card-origin">
            <strong>{background.name}</strong>
            <p>{background.description}</p>
            <div className="trait-effects">
              {effectLabels(background.statModifiers, background.spiritStones).map((effect) => (
                <span key={effect}>{effect}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted">{state.identity.backgroundId}</p>
        )}
      </div>

      <div className="subsection">
        <p className="subsection-title">天赋</p>
        <div className="trait-stack">
          {talents.map((talent) => (
            <div className="trait-card" key={talent.id}>
              <strong>{talent.name}</strong>
              <p>{talent.description}</p>
              <div className="trait-effects">
                {effectLabels(talent.statModifiers, talent.spiritStones).map((effect) => (
                  <span key={effect}>{effect}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="subsection">
        <p className="subsection-title">修行资质与能力</p>
        <div className="stats-grid">
          <div><span>根骨</span><strong>{state.stats.constitution}</strong></div>
          <div><span>悟性</span><strong>{state.stats.comprehension}</strong></div>
          <div className="stat-emphasis"><span>神识</span><strong>{effectiveSpiritSense}</strong>{spiritBonus > 0 && <small>先天 {state.stats.spiritSense} · 境界 +{spiritBonus}</small>}</div>
          <div><span>心性</span><strong>{state.stats.mentality}</strong></div>
          <div><span>气运</span><strong>{state.stats.luck}</strong></div>
        </div>
      </div>
    </aside>
  )
}
