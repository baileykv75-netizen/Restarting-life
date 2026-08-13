import { useState } from 'react'
import { ActionPanel } from './components/ActionPanel'
import { ArchivePanel } from './components/ArchivePanel'
import { CharacterPanel } from './components/CharacterPanel'
import { EndPanel } from './components/EndPanel'
import { EventPanel } from './components/EventPanel'
import { getAvailableActions } from './core/actionEngine'
import { createEmptyPersistentGame } from './core/persistentGameEngine'
import { FORMAL_EVENT_CATALOG } from './core/sessionEngine'
import { getAvailableChoices } from './core/eventEngine'
import type { PlayerAction, SessionCommand } from './types/command'
import type { PersistentGame } from './types/persistence'
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
          <p className="eyebrow">RESTARTING LIFE · V1</p>
          <h1>此世问长生</h1>
          <p className="landing-lead">一世一因果。你无法决定出生，却能决定往后的每一步。</p>
          <p className="muted">纯规则驱动 · 无大模型 API · 所有选择与随机结果均可复现</p>
          <div className="landing-actions">
            <button className="primary-button" onClick={persistStart} type="button">开启第一世</button>
            <button className="secondary-button" onClick={() => setArchiveOpen(true)} type="button">前世档案 · {game.archives.length}</button>
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
  const recentEvents = state.events.history.slice(-6).reverse()

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">RESTARTING LIFE</p>
          <h1>此世问长生</h1>
        </div>
        <div className="topbar-actions">
          <span className="run-pill">第 {game.meta.totalRuns} 世</span>
          <button className="text-button" onClick={() => setArchiveOpen(true)} type="button">前世档案 {game.archives.length}</button>
        </div>
      </header>

      <div className="game-grid">
        <CharacterPanel state={state} runNumber={game.meta.totalRuns} />

        <section className="main-stage">
          {state.status !== 'playing' ? (
            <EndPanel record={latestRecord} onRestart={persistStart} onOpenArchive={() => setArchiveOpen(true)} />
          ) : activeEvent ? (
            <EventPanel event={activeEvent} choices={choices} onChoice={(choiceId) => persistCommand({ type: 'choice', choiceId })} />
          ) : (
            <>
              {session.debugLog.length === 0 && (
                <section className="birth-banner">
                  <p className="story-kicker">命格初定</p>
                  <h2>十六岁，你第一次真正站在人生的岔路口。</h2>
                  <p>从此往后，每一次闭关、远行与退让都会消耗真实岁月，也可能在很多年后重新找上你。</p>
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

        <aside className="panel chronicle-panel" aria-label="此世纪年">
          <div className="panel-heading"><span>此世纪年</span><strong>{session.debugLog.length} 次抉择</strong></div>
          {recentEvents.length === 0 ? (
            <p className="muted">此世尚未发生值得记入年表的事件。</p>
          ) : (
            <ol className="chronicle-list">
              {recentEvents.map((eventId) => (
                <li key={`${eventId}-${state.events.history.lastIndexOf(eventId)}`}>
                  <span className="chronicle-dot" />
                  <span>{FORMAL_EVENT_CATALOG.get(eventId)?.title ?? eventId}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="debug-note">
            <span>本世记录</span>
            <code>{state.runSeed}</code>
          </div>
        </aside>
      </div>

      {archiveOpen && <ArchivePanel records={game.archives} onClose={() => setArchiveOpen(false)} />}
    </main>
  )
}

export default App
