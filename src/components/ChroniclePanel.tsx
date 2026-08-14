import type { ChronicleEntry } from '../types/chronicle'
import { formatDuration } from '../core/timeEngine'
import { formatAge } from '../ui/formatters'
import '../chronicle.css'

interface ChroniclePanelProps {
  entries: readonly ChronicleEntry[]
  birthDay: number
  runSeed: string
}

function timeLabel(entry: ChronicleEntry, birthDay: number): string {
  const age = formatAge(entry.endDay, birthDay)
  const elapsed = entry.endDay - entry.startDay
  return elapsed > 0 ? `${age} · 历时${formatDuration(elapsed)}` : age
}

export function ChroniclePanel({ entries, birthDay, runSeed }: ChroniclePanelProps) {
  return (
    <aside className="panel chronicle-panel" aria-label="此世传">
      <div className="panel-heading">
        <span>此世传</span>
        <strong>{entries.length} 段人生经历</strong>
      </div>

      {entries.length === 0 ? (
        <p className="muted chronicle-empty">真正值得写下的经历，会在这里慢慢长成这个人的一生。</p>
      ) : (
        <ol className="chronicle-story-list">
          {[...entries].reverse().map((entry) => (
            <li className={`chronicle-entry chronicle-${entry.importance}`} key={entry.id}>
              <div className="chronicle-entry-time">{timeLabel(entry, birthDay)}</div>
              <h3>{entry.title}</h3>
              <p className="chronicle-scene">{entry.sceneText}</p>

              {entry.choiceText && (
                <p className="chronicle-choice"><span>你的选择</span>{entry.choiceText}</p>
              )}

              <p className="chronicle-result">{entry.narrative}</p>

              {entry.changes.length > 0 && (
                <div className="chronicle-changes" aria-label="本次影响">
                  {entry.changes.map((change, index) => (
                    <span className={`chronicle-change ${change.tone}`} key={`${entry.id}-${change.label}-${index}`}>
                      {change.label} {change.value}
                    </span>
                  ))}
                </div>
              )}

              {entry.consequence && (
                <p className="chronicle-consequence">因果 · {entry.consequence}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="debug-note">
        <span>本世种子 · 可重放</span>
        <code>{runSeed}</code>
      </div>
    </aside>
  )
}
