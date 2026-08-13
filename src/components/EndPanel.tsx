import type { LifeRecord } from '../types/persistence'

interface EndPanelProps {
  record: LifeRecord | undefined
  onRestart: () => void
  onOpenArchive: () => void
}

export function EndPanel({ record, onRestart, onOpenArchive }: EndPanelProps) {
  return (
    <section className="story-card end-card">
      <p className="story-kicker">此世已结</p>
      <h2>{record?.summary.title ?? '一世终了'}</h2>
      <p className="end-reason">{record?.summary.endReason ?? '本世已经结束。'}</p>
      {record && (
        <div className="end-summary">
          <div><span>享年</span><strong>{record.summary.ageYears}岁{record.summary.ageMonths ? `${record.summary.ageMonths}个月` : ''}</strong></div>
          <div><span>最大机缘</span><strong>{record.summary.largestOpportunity}</strong></div>
          <div><span>此生遗憾</span><strong>{record.summary.regret}</strong></div>
        </div>
      )}
      <div className="end-actions">
        <button className="primary-button" onClick={onRestart} type="button">再入轮回</button>
        <button className="secondary-button" onClick={onOpenArchive} type="button">查看前世档案</button>
      </div>
    </section>
  )
}
