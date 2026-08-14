import { getCharacterDisplayName } from '../core/nameEngine'
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
          <div><p className="story-kicker">曾经活过的人</p><h2>人生档案</h2></div>
          <button className="text-button" onClick={onClose} type="button">关闭</button>
        </div>
        {records.length === 0 ? <p className="muted">这里还没有已经结束的人生。</p> : (
          <div className="archive-list">
            {[...records].reverse().map((record) => {
              const name = getCharacterDisplayName(record.identity.name, record.runSeed)
              return (
                <article className="archive-entry" key={record.runId}>
                  <div className="archive-entry-title"><strong>{name} · {record.summary.title}</strong><span>{record.summary.ageYears}岁</span></div>
                  <p>{record.summary.endReason}</p>
                  <p className="muted">最大机缘：{record.summary.largestOpportunity}</p>
                  <p className="muted">此生遗憾：{record.summary.regret}</p>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
