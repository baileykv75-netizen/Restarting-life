import { useState } from 'react'
import type { ChronicleEntry } from '../types/chronicle'
import { formatLifeSpan } from '../ui/formatters'
import '../chronicle.css'

interface ChroniclePanelProps {
  entries: readonly ChronicleEntry[]
  birthDay: number
}

function timeLabel(entry: ChronicleEntry, birthDay: number): string {
  return formatLifeSpan(entry.startDay, entry.endDay, birthDay)
}

function ChronicleChanges({ entry }: { entry: ChronicleEntry }) {
  if (entry.changes.length === 0) return null
  return <div className="chronicle-changes" aria-label="本次变化">{entry.changes.map((change, index) => <span className={`chronicle-change ${change.tone}`} key={`${entry.id}-${change.label}-${index}`}>{change.label} {change.value}</span>)}</div>
}

function RoutineEntry({ entry, birthDay }: { entry: ChronicleEntry; birthDay: number }) {
  const summary = entry.narrative || entry.sceneText
  return <li className="chronicle-entry chronicle-routine chronicle-entry-compact"><div className="chronicle-entry-time">{timeLabel(entry, birthDay)}</div><div className="chronicle-compact-copy"><strong>{entry.title}</strong><span>{summary}</span></div>{entry.choiceText && <p className="chronicle-compact-choice">你选择了：{entry.choiceText}</p>}<ChronicleChanges entry={entry} /></li>
}

function StoryEntry({ entry, birthDay }: { entry: ChronicleEntry; birthDay: number }) {
  return <li className={`chronicle-entry chronicle-${entry.importance}`}><div className="chronicle-entry-time">{timeLabel(entry, birthDay)}</div><h3>{entry.title}</h3><p className="chronicle-scene">{entry.sceneText}</p>{entry.choiceText && <p className="chronicle-choice"><span>当时你选择</span>{entry.choiceText}</p>}{entry.narrative && <p className="chronicle-result">{entry.narrative}</p>}<ChronicleChanges entry={entry} />{entry.consequence && <p className="chronicle-consequence">后来 · {entry.consequence}</p>}</li>
}

export function ChroniclePanel({ entries, birthDay }: ChroniclePanelProps) {
  const [expanded, setExpanded] = useState(false)
  const newestFirst = [...entries].reverse()
  const visibleEntries = expanded ? newestFirst : newestFirst.slice(0, 3)

  return <aside className={`panel chronicle-panel compactible-panel ${expanded ? 'expanded' : 'collapsed'}`} aria-label="此世记">
    <div className="panel-heading"><span>此世记</span><strong>{entries.length} 段经历</strong></div>
    {entries.length === 0 ? <p className="muted chronicle-empty">这里会留下真正发生过的事。</p> : <>
      <ol className="chronicle-story-list">{visibleEntries.map((entry) => entry.importance === 'routine' ? <RoutineEntry entry={entry} birthDay={birthDay} key={entry.id} /> : <StoryEntry entry={entry} birthDay={birthDay} key={entry.id} />)}</ol>
      {entries.length > 3 && <button className="panel-expand-button" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? '只看最近经历' : `查看全部 ${entries.length} 段经历`}</button>}
    </>}
  </aside>
}
