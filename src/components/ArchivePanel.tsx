import type { LifeRecord } from '../types/persistence'

interface ArchivePanelProps {
  records: readonly LifeRecord[]
  onClose: () => void
}

export function ArchivePanel({ records, onClose }: ArchivePanelProps) {
  return (
    <div className="archive-backdrop">
      <section className="archive-panel">
        <div className="archive-header">
          <div><p className="story-kicker">轮回留痕</p><h2>前世档案</h2></div>
          <button className="text-button" onClick={onClose} type="button">关闭</button>
        </div>
        {records.length === 0 ? <p className="muted">尚无已经结束的人生。</p> : (
          <div className="archive-list">
            {[...records].reverse().map((record) => (
              <article className="archive-entry" key={record.runId}>
                <div className="archive-entry-title"><strong>第 {record.sequence} 世 · {record.summary.title}</strong><span>{record.summary.ageYears}岁</span></div>
                <p>{record.summary.endReason}</p>
                <p className="muted">机缘：{record.summary.largestOpportunity}</p>
                <p className="muted">遗憾：{record.summary.regret}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
