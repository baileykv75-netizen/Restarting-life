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
import './experience-cleanup.css'

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
      <p className="story-kicker">结果</p>
      <h2>{result.title}</h2>
      {result.narrative && <p className="story-text result-narrative">{result.narrative}</p>}
      {result.changes.length > 0 && (
        <>
          <div className="result-divider" />
          <p className="subsection-title">变化</p>
          <div className="result-changes">
            {result.changes.map((change, index) => (
              <div className={`result-change ${change.tone}`} key={`${change.label}-${index}`}>
                <span>{change.label}</span>
                <strong>{change.value}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      {result.consequence && <p className="consequence-note">后续 · {result.consequence}</p>}
      <button className="primary-button result-continue" onClick={onContinue} type="button">继续</button>
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
      setNotice(caught instanceof Error ? caught.message : '无法开启新的人生')
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
          <p className="story-text">这份存档没有通过完整性校验。为避免继续损坏记录，游戏没有加载它。</p>
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
          <p className="eyebrow">RESTARTING LIFE · V1.2</p>
          <h1>此世问长生</h1>
          <p className="landing-lead">每一次开始，都是另一个人的一生。</p>
          <p className="muted">有人生来近仙，有人一辈子也未必摸得到那道门。</p>
          <div className="landing-actions">
            <button className="primary-button" onClick={persistStart} type="button">开始一段人生</button>
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
          <p className="eyebrow">RESTARTING LIFE · V1.2</p>
          <h1>此世问长生</h1>
        </div>
        <div className="topbar-actions">
          <button className="text-button" onClick={() => setArchiveOpen(true)} type="button">人生档案 {game.archives.length}</button>
        </div>
      </header>

      <div className="game-grid">
        <CharacterPanel state={state} />

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
                  <p className="story-kicker">十六岁</p>
                  <h2>从今天起，往后的路都要自己走了。</h2>
                  <p>你知道自己的出身、资质和眼前处境，却不知道这一生最后会走到哪里。</p>
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
        />
      </div>

      {archiveOpen && <ArchivePanel records={game.archives} onClose={() => setArchiveOpen(false)} />}
    </main>
  )
}

export default App
