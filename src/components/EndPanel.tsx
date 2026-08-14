import { getCharacterDisplayName } from '../core/nameEngine'
import type { LifeRecord } from '../types/persistence'

interface EndPanelProps {
  record: LifeRecord | undefined
  onRestart: () => void
  onOpenArchive: () => void
}

export function EndPanel({ record, onRestart, onOpenArchive }: EndPanelProps) {
  const name = record ? getCharacterDisplayName(record.identity.name, record.runSeed) : null

  return (
    <section className="story-card end-card">
      <p className="story-kicker">此生已结</p>
      <h2>{name ? `${name} · ${record?.summary.title ?? ''}` : (record?.summary.title ?? '一生终了')}</h2>
      <p className="end-reason">{record?.summary.endReason ?? '这段人生已经结束。'}</p>
      {record && (
        <div className="end-summary">
          <div><span>享年</span><strong>{record.summary.ageYears}岁{record.summary.ageMonths ? `${record.summary.ageMonths}个月` : ''}</strong></div>
          <div><span>最大机缘</span><strong>{record.summary.largestOpportunity}</strong></div>
          <div><span>此生遗憾</span><strong>{record.summary.regret}</strong></div>
        </div>
      )}
      <div className="end-actions">
        <button className="primary-button" onClick={onRestart} type="button">看看下一段人生</button>
        <button className="secondary-button" onClick={onOpenArchive} type="button">查看人生档案</button>
      </div>
    </section>
  )
}
