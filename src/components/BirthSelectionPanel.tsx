import { BACKGROUNDS } from '../data/backgrounds'
import { PHYSIQUES } from '../data/physiques'
import { SPIRIT_ROOTS } from '../data/spiritRoots'
import { TALENTS } from '../data/talents'
import type { PendingBirthSelection } from '../types/birth'

interface BirthSelectionPanelProps {
  pending: PendingBirthSelection
  archiveCount: number
  onChoose: (candidateId: string) => void
  onOpenArchive: () => void
}

const STAT_LABELS = {
  constitution: '根骨',
  comprehension: '悟性',
  spiritSense: '神识',
  mentality: '心性',
} as const

export function BirthSelectionPanel({ pending, archiveCount, onChoose, onOpenArchive }: BirthSelectionPanelProps) {
  return (
    <main className="birth-selection-shell">
      <header className="birth-selection-header">
        <div>
          <p className="eyebrow">此世问长生 · V2.0</p>
          <h1>这一世，你会是谁？</h1>
          <p className="birth-selection-lead">三个出生已经落定。只能选一次，也不能换一批。</p>
        </div>
        <button className="text-button" onClick={onOpenArchive} type="button">人生档案 {archiveCount}</button>
      </header>

      <section className="birth-candidate-grid" aria-label="出生候选">
        {pending.candidates.map((candidate) => {
          const background = BACKGROUNDS.find((item) => item.id === candidate.backgroundId)
          const root = SPIRIT_ROOTS.find((item) => item.id === candidate.spiritRootId)
          const physique = PHYSIQUES.find((item) => item.id === candidate.physiqueId)
          const talents = candidate.talentIds.map((id) => TALENTS.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => item !== undefined)
          if (!background || !root || !physique) return null

          return (
            <article className="birth-candidate" key={candidate.id}>
              <div className="birth-candidate-heading">
                <p className="story-kicker">{background.origin}</p>
                <h2>{candidate.name}</h2>
                <strong>{background.name}</strong>
                <p>{background.description}</p>
              </div>

              <dl className="birth-facts">
                <div><dt>家境</dt><dd>{background.socialClass}</dd></div>
                <div><dt>灵根</dt><dd>{root.name}</dd></div>
                <div><dt>体质</dt><dd>{physique.name}</dd></div>
                <div><dt>下品灵石</dt><dd>{candidate.spiritStones} 枚</dd></div>
              </dl>

              <div className="birth-section">
                <p className="birth-section-title">灵根</p>
                <p>{root.description}</p>
              </div>

              <div className="birth-section">
                <p className="birth-section-title">体质</p>
                <p>{physique.description}</p>
              </div>

              <div className="birth-section">
                <p className="birth-section-title">天赋</p>
                <div className="birth-talent-list">
                  {talents.map((talent) => (
                    <div className="birth-talent" key={talent.id}>
                      <strong>{talent.name}</strong>
                      <span>{talent.mechanics}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="birth-section">
                <p className="birth-section-title">从小拥有与知道</p>
                <p>{background.resourceSummary.join('；')}。</p>
                <p>{background.knownLocationSeeds.map((seed) => `${seed.label}${seed.status === 'rumored' ? '（只听说过）' : ''}`).join('、')}。</p>
              </div>

              <div className="birth-section">
                <p className="birth-section-title">最初的人际关系</p>
                <p>{background.familySummary}</p>
                {background.relationSeeds.length > 0 && <p>{background.relationSeeds.map((seed) => seed.label).join('、')}。</p>}
              </div>

              <div className="birth-section birth-entry">
                <p className="birth-section-title">往后的路</p>
                <p>{background.adultEntrySummary}</p>
              </div>

              <div className="birth-stat-row" aria-label="先天能力">
                {(Object.keys(STAT_LABELS) as Array<keyof typeof STAT_LABELS>).map((key) => (
                  <div key={key}><span>{STAT_LABELS[key]}</span><strong>{candidate.stats[key]}</strong></div>
                ))}
              </div>

              <button className="primary-button birth-choose" onClick={() => onChoose(candidate.id)} type="button">选择这一世</button>
            </article>
          )
        })}
      </section>
      <p className="birth-selection-footnote">这里没有系统推荐，也没有强弱补偿。出身好，就是这一世起点更好。</p>
    </main>
  )
}
