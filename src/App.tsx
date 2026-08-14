import { useState } from 'react'
import { ActionPanel } from './components/ActionPanel'
import { ArchivePanel } from './components/ArchivePanel'
import { CharacterPanel } from './components/CharacterPanel'
import { ChroniclePanel } from './components/ChroniclePanel'
import { EndPanel } from './components/EndPanel'
import { EventPanel } from './components/EventPanel'
import { getAvailableActions } from './core/actionEngine'
import { createEmptyPersistentGame } from './core/persistentGameEngine'
import { FORMAL_EVENT_CATALOG } from './core/sessionEngine'
import { getAvailableChoices } from './core/eventEngine'
import type { PlayerAction, SessionCommand } from './types/command'
import type { PersistentGame, ResolvedOutcome } from './types/persistence'
import { clearGame, commandAndSave, loadGame, startAndSaveRun } from './store/browserGameStore'

interface InitialViewState {
  game: PersistentGame
  error: string | null
}

function readInitialGame(): InitialViewState {
  try {
    return { game: loadGame(window.localStorage), error: null }
  } catch (error) {
    return {
      game: createEmptyPersistentGame(),
      error: error instanceof Error ? error.message : '本地存档无法读取',
    }
  }
}

function ResultPanel({ result, onContinue }: { result: ResolvedOutcome; onContinue: () => void }) {
  return (
    <section className="story-card result-card">
      <p className="story-kicker">此事已定</p>
      <h2>{result.title}</h2>
      <p className="story-text result-narrative">{result.narrative}</p>
      <div className="result-divider" />
      <p className="subsection-title">这一选择真正改变了什么</p>
      {result.changes.length > 0 ? (
        <div className="result-changes">
          {result.changes.map((change, index) => (
            <div className={`result-change ${change.tone}`} key={`${change.label}-${index}`}>
              <span>{change.label}</span>
              <strong>{change.value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">没有直接的数值变化，但这并不意味着此事不会留下后果。</p>
      )}
      {result.consequence && <p className="consequence-note">因果 · {result.consequence}</p>}
      <button className="primary-button result-continue" onClick={onContinue} type="button">记下此事，继续此生</button>
    </section>
  )
}

const initialViewState = readInitialGame()

function App() {
  const [game, setGame] = useState<PersistentGame>(initialViewState.game)
  const [error, setError] = useState<string | null>(initialViewState.error)
  const [notice, setNotice] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const session = game.currentSession
  const state = session?.state ?? null

  function persistStart() {
    try {
      const next = startAndSaveRun(window.localStorage, game, Date.now())
      setGame(next)
      setError(null)
      setNotice(null)
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : '无法开启新一世')
    }
  }

  function persistCommand(command: SessionCommand) {
    try {
      const result = commandAndSave(window.localStorage, game, command)
      if (!result.applied) {
        setNotice(result.reason ?? '当前操作无法执行')
        return
      }
      setGame(result.persistent)
      setNotice(null)
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : '本次操作未能保存')
    }
  }

  function recoverSave() {
    try {
      const next = clearGame(window.localStorage)
      setGame(next)
      setError(null)
      setNotice(null)
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : '无法清除本地存档')
    }
  }

  if (error) {
    return (
      <main className="landing-shell">
        <section className="landing-card danger-card">
          <p className="eyebrow">RESTARTING LIFE</p>
          <h1>本地存档需要处理</h1>
          <p className="story-text">检测到存档无法通过完整性校验，因此没有把损坏数据继续送入游戏引擎。</p>
          <p className="error-text">{error}</p>
          <button className="primary-button" onClick={recoverSave} type="button">清除损坏存档并重新开始</button>
          {notice && <p className="notice">{notice}</p>}
        </section>
      </main>
    )
  }

  if (!session || !state) {
    return (
      <main className="landing-shell">
        <section className="landing-card">
          <p className="eyebrow">RESTARTING LIFE · V1.2 FOUNDATION</p>
          <h1>此世问长生</h1>
          <p className="landing-lead">一世一因果。不是回答问卷，而是在有限寿元里真正活完一个人的人生。</p>
          <p className="muted">自然时间地基 · 量化结果 · 隐藏因果 · 人生档案</p>
          <div className="landing-actions">
            <button className="primary-button" onClick={persistStart} type="button">开启新的一生</button>
            <button className="secondary-button" onClick={() => setArchiveOpen(true)} type="button">人生档案 · {game.archives.length}</button>
          </div>
          {notice && <p className="notice">{notice}</p>}
        </section>
        {archiveOpen && <ArchivePanel records={game.archives} onClose={() => setArchiveOpen(false)} />}
      </main>
    )
  }

  const activeEvent = state.events.currentEventId
    ? FORMAL_EVENT_CATALOG.get(state.events.currentEventId)
    : undefined
  const choices = activeEvent ? getAvailableChoices(state, activeEvent) : []
  const latestRecord = game.archives.find((record) => record.runId === state.runId)

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RESTARTING LIFE · V1.2 FOUNDATION</p>
          <h1>此世问长生</h1>
        </div>
        <div className="topbar-actions">
          <span className="run-pill">第 {game.meta.totalRuns} 世</span>
          <button className="text-button" onClick={() => setArchiveOpen(true)} type="button">人生档案 {game.archives.length}</button>
        </div>
      </header>

      <div className="game-grid">
        <CharacterPanel state={state} runNumber={game.meta.totalRuns} />

        <section className="main-stage">
          {session.pendingResult ? (
            <ResultPanel result={session.pendingResult} onContinue={() => persistCommand({ type: 'continue' })} />
          ) : state.status !== 'playing' ? (
            <EndPanel record={latestRecord} onRestart={persistStart} onOpenArchive={() => setArchiveOpen(true)} />
          ) : activeEvent ? (
            <EventPanel event={activeEvent} choices={choices} onChoice={(choiceId) => persistCommand({ type: 'choice', choiceId })} />
          ) : (
            <>
              {session.debugLog.length === 0 && (
                <section className="birth-banner">
                  <p className="story-kicker">命格初定</p>
                  <h2>十六岁，你第一次真正站在人生的岔路口。</h2>
                  <p>从此以后，时间、灵石、修为、人物关系与旧日因果都会留下明确痕迹。</p>
                </section>
              )}
              <ActionPanel
                state={state}
                actions={getAvailableActions(state) as PlayerAction[]}
                onAction={(action) => persistCommand({ type: 'action', action })}
              />
            </>
          )}
          {notice && <p className="notice">{notice}</p>}
        </section>

        <ChroniclePanel
          entries={state.chronicle}
          birthDay={state.identity.birthDay}
          runSeed={state.runSeed}
        />
      </div>

      {archiveOpen && <ArchivePanel records={game.archives} onClose={() => setArchiveOpen(false)} />}
    </main>
  )
}

export default App