import { useEffect, useState } from 'react'
import { ActionPanel } from './components/ActionPanel'
import { AdultEntryPanel } from './components/AdultEntryPanel'
import { ArchivePanel } from './components/ArchivePanel'
import { BeastLootPanel } from './components/BeastLootPanel'
import { BirthSelectionPanel } from './components/BirthSelectionPanel'
import { CharacterPanel } from './components/CharacterPanel'
import { ChildhoodPanel } from './components/ChildhoodPanel'
import { ChroniclePanel } from './components/ChroniclePanel'
import { CombatPanel } from './components/CombatPanel'
import { CultivationPanel } from './components/CultivationPanel'
import { EndPanel } from './components/EndPanel'
import { EventPanel } from './components/EventPanel'
import { FoundationBreakthroughPanel } from './components/FoundationBreakthroughPanel'
import { GameStatusBar } from './components/GameStatusBar'
import { GoldenCoreBreakthroughPanel } from './components/GoldenCoreBreakthroughPanel'
import { InventoryPanel } from './components/InventoryPanel'
import { LocationKnowledgeSetupPanel } from './components/LocationKnowledgeSetupPanel'
import { SecretRealmPanel } from './components/SecretRealmPanel'
import { WorldMapPanel } from './components/WorldMapPanel'
import { getAvailableActions } from './core/actionEngine'
import type { CultivationDuration } from './core/cultivationEngine'
import { createEmptyPersistentGame } from './core/persistentGameEngine'
import { FORMAL_EVENT_CATALOG } from './core/sessionEngine'
import { getAvailableChoices } from './core/eventEngine'
import type { TechniquePracticeDuration } from './core/techniqueEngine'
import type { PlayerAction, SessionCommand } from './types/command'
import type { ExplorationDuration } from './types/exploration'
import type { PersistentGame, ResolvedOutcome } from './types/persistence'
import type { StrongBeastTerritoryId } from './types/territory'
import { chooseBirthAndSave, clearGame, commandAndSave, loadGame, startAndSaveRun } from './store/browserGameStore'
import './experience-cleanup.css'
import './birth-selection.css'
import './childhood.css'
import './adult-entry.css'
import './world-map.css'
import './secret-realm.css'
import './inventory.css'
import './beast-loot.css'
import './equipment.css'
import './cultivation.css'
import './foundation.css'
import './combat.css'

interface InitialViewState { game: PersistentGame; error: string | null }
function readInitialGame(): InitialViewState { try { return { game: loadGame(window.localStorage), error: null } } catch (error) { return { game: createEmptyPersistentGame(), error: error instanceof Error ? error.message : '本地存档无法读取' } } }
function ResultPanel({ result, onContinue }: { result: ResolvedOutcome; onContinue: () => void }) { return <section className="story-card result-card"><p className="story-kicker">结果</p><h2>{result.title}</h2>{result.narrative && <p className="story-text result-narrative">{result.narrative}</p>}{result.changes.length > 0 && <><div className="result-divider" /><p className="subsection-title">变化</p><div className="result-changes">{result.changes.map((change, index) => <div className={`result-change ${change.tone}`} key={`${change.label}-${index}`}><span>{change.label}</span><strong>{change.value}</strong></div>)}</div></>}{result.consequence && <p className="consequence-note">后续 · {result.consequence}</p>}<button className="primary-button result-continue" onClick={onContinue} type="button">继续</button></section> }
const initialViewState = readInitialGame()

function App() {
  const [game, setGame] = useState<PersistentGame>(initialViewState.game)
  const [error, setError] = useState<string | null>(initialViewState.error)
  const [notice, setNotice] = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const session = game.currentSession
  const state = session?.state ?? null

  useEffect(() => {
    if (error) return
    const currentSession = game.currentSession
    const currentState = currentSession?.state
    if (!currentSession || !currentState) return
    if (currentState.status !== 'playing' || currentState.lifeStage !== 'adult') return
    if (currentState.combat) return
    if (currentSession.pendingResult || currentSession.pendingAction || currentState.events.currentEventId !== null) return

    try {
      let working = game
      let changed = false
      let workingState = working.currentSession?.state

      if (workingState?.sublocations && !workingState.secretRealm && workingState.flags.location_knowledge_initialized === true) {
        const initializedRealm = commandAndSave(window.localStorage, working, { type: 'initialize-secret-realm' })
        if (!initializedRealm.applied) { setNotice(initializedRealm.reason ?? '本世秘境状态无法初始化'); return }
        working = initializedRealm.persistent
        workingState = working.currentSession?.state
        changed = true
      }

      if (workingState && !workingState.inventory) {
        const initializedInventory = commandAndSave(window.localStorage, working, { type: 'initialize-inventory' })
        if (!initializedInventory.applied) {
          if (changed) setGame(working)
          setNotice(initializedInventory.reason ?? '本世背包无法初始化')
          return
        }
        working = initializedInventory.persistent
        workingState = working.currentSession?.state
        changed = true
      }

      if (workingState?.inventory && !workingState.equipment) {
        const initializedEquipment = commandAndSave(window.localStorage, working, { type: 'initialize-equipment' })
        if (!initializedEquipment.applied) {
          if (changed) setGame(working)
          setNotice(initializedEquipment.reason ?? '本世装备状态无法初始化')
          return
        }
        working = initializedEquipment.persistent
        workingState = working.currentSession?.state
        changed = true
      }

      if (workingState?.adultEntry?.resolved && !workingState.cultivation.practiceInitialized) {
        const initializedCultivation = commandAndSave(window.localStorage, working, { type: 'initialize-cultivation' })
        if (!initializedCultivation.applied) {
          if (changed) setGame(working)
          setNotice(initializedCultivation.reason ?? '本世修炼状态无法初始化')
          return
        }
        working = initializedCultivation.persistent
        workingState = working.currentSession?.state
        changed = true
      }

      if (workingState?.adultEntry?.resolved && workingState.cultivation.practiceInitialized && !workingState.cultivation.techniqueSystemInitialized) {
        const initializedTechniques = commandAndSave(window.localStorage, working, { type: 'initialize-technique-system' })
        if (!initializedTechniques.applied) {
          if (changed) setGame(working)
          setNotice(initializedTechniques.reason ?? '本世功法实践状态无法初始化')
          return
        }
        working = initializedTechniques.persistent
        changed = true
      }

      if (changed) {
        setGame(working)
        setNotice(null)
      }
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : '本世运行状态无法初始化')
    }
  }, [error, game])

  function persistStart() { try { const next = startAndSaveRun(window.localStorage, game, Date.now()); setGame(next); setError(null); setNotice(null) } catch (caught) { setNotice(caught instanceof Error ? caught.message : '无法开启新的人生') } }
  function persistBirthChoice(candidateId: string) { try { const next = chooseBirthAndSave(window.localStorage, game, candidateId); setGame(next); setNotice(null) } catch (caught) { setNotice(caught instanceof Error ? caught.message : '无法确定这一世') } }
  function persistCommand(command: SessionCommand) { try { const result = commandAndSave(window.localStorage, game, command); if (!result.applied) { setNotice(result.reason ?? '当前操作无法执行'); return } setGame(result.persistent); setNotice(null) } catch (caught) { setNotice(caught instanceof Error ? caught.message : '本次操作未能保存') } }
  function persistExplore(days: ExplorationDuration) {
    try {
      let working = game
      let currentState = working.currentSession?.state
      if (currentState && !currentState.sublocations) {
        const initialized = commandAndSave(window.localStorage, working, { type: 'game-action', action: { type: 'INITIALIZE_SUBLOCATIONS' } })
        if (!initialized.applied) { setNotice(initialized.reason ?? '本世子地点无法初始化'); return }
        working = initialized.persistent
        currentState = working.currentSession?.state
      }
      if (currentState && !currentState.secretRealm) {
        const initializedRealm = commandAndSave(window.localStorage, working, { type: 'initialize-secret-realm' })
        if (!initializedRealm.applied) { setNotice(initializedRealm.reason ?? '本世秘境状态无法初始化'); return }
        working = initializedRealm.persistent
        currentState = working.currentSession?.state
      }
      if (currentState && !currentState.inventory) {
        const initializedInventory = commandAndSave(window.localStorage, working, { type: 'initialize-inventory' })
        if (!initializedInventory.applied) { setNotice(initializedInventory.reason ?? '本世背包无法初始化'); return }
        working = initializedInventory.persistent
        currentState = working.currentSession?.state
      }
      if (currentState && currentState.flags.wilderness_encounters_initialized !== true) {
        const initializedEncounters = commandAndSave(window.localStorage, working, { type: 'game-action', action: { type: 'SET_FLAG', key: 'wilderness_encounters_initialized', value: true } })
        if (!initializedEncounters.applied) { setNotice(initializedEncounters.reason ?? '本世野外遭遇无法初始化'); return }
        working = initializedEncounters.persistent
      }
      const result = commandAndSave(window.localStorage, working, { type: 'explore-region', days })
      if (!result.applied) { setNotice(result.reason ?? '当前无法探索'); return }
      setGame(result.persistent)
      setNotice(null)
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : '本次探索未能保存')
    }
  }
  function persistEnterTerritory(territoryId: StrongBeastTerritoryId) {
    try {
      const result = commandAndSave(window.localStorage, game, { type: 'game-action', action: { type: 'ENTER_BEAST_TERRITORY', territoryId } })
      if (!result.applied) {
        const message = result.reason === 'COLD_POOL_TERRITORY_CLEARED' || result.reason === 'AZURE_WOLF_TERRITORY_CLEARED'
          ? '这处领地已经失去原先的强大个体。'
          : result.reason === 'TERRITORY_NOT_DISCOVERED'
            ? '你掌握的线索还不足以找到这处领地。'
            : result.reason ?? '现在无法进入这处领地。'
        setNotice(message)
        return
      }
      const nextState = result.persistent.currentSession?.state
      setGame(result.persistent)
      if (territoryId === 'lingxi_cold_pool' && nextState?.flags.cold_pool_checked_empty === true && !nextState.combat) {
        setNotice('你沿寒潭边缘和浅水处查了一遍。这里确实危险，但没有发现仍在活动的大型妖兽。')
      } else {
        setNotice(null)
      }
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : '进入领地时状态未能保存')
    }
  }
  function persistCultivate(days: CultivationDuration) { persistCommand({ type: 'cultivate-days', days }) }
  function persistTechniquePractice(techniqueId: string, days: TechniquePracticeDuration) { persistCommand({ type: 'practice-technique-days', techniqueId, days }) }
  function recoverSave() { try { const next = clearGame(window.localStorage); setGame(next); setError(null); setNotice(null) } catch (caught) { setNotice(caught instanceof Error ? caught.message : '无法清除本地存档') } }

  if (error) return <main className="landing-shell"><section className="landing-card danger-card"><p className="eyebrow">此世问长生 · V2.0</p><h1>本地存档需要处理</h1><p className="story-text">这份存档没有通过完整性校验。为避免继续损坏记录，游戏没有加载它。</p><p className="error-text">{error}</p><button className="primary-button" onClick={recoverSave} type="button">清除损坏存档并重新开始</button>{notice && <p className="notice">{notice}</p>}</section></main>
  if (!session || !state) {
    if (game.phase === 'birth-selection' && game.pendingBirthSelection) return <><BirthSelectionPanel pending={game.pendingBirthSelection} archiveCount={game.archives.length} onChoose={persistBirthChoice} onOpenArchive={() => setArchiveOpen(true)} />{notice && <p className="birth-floating-notice notice">{notice}</p>}{archiveOpen && <ArchivePanel records={game.archives} onClose={() => setArchiveOpen(false)} />}</>
    return <main className="landing-shell"><section className="landing-card"><p className="eyebrow">此世问长生 · V2.0</p><h1>此世问长生</h1><p className="landing-lead">每一次开始，都是另一个人的一生。</p><p className="muted">有人生来近仙，有人一辈子也未必摸得到那道门。</p><div className="landing-actions"><button className="primary-button" onClick={persistStart} type="button">开始一段人生</button><button className="secondary-button" onClick={() => setArchiveOpen(true)} type="button">人生档案 · {game.archives.length}</button></div>{notice && <p className="notice">{notice}</p>}</section>{archiveOpen && <ArchivePanel records={game.archives} onClose={() => setArchiveOpen(false)} />}</main>
  }

  const activeEvent = state.events.currentEventId ? FORMAL_EVENT_CATALOG.get(state.events.currentEventId) : undefined
  const choices = activeEvent ? getAvailableChoices(state, activeEvent) : []
  const latestRecord = game.archives.find((record) => record.runId === state.runId)
  let stageContent
  if (state.lifeStage === 'childhood') {
    stageContent = session.pendingResult ? <ResultPanel result={session.pendingResult} onContinue={() => persistCommand({ type: 'continue' })} /> : <ChildhoodPanel state={state} onChoice={(choiceId) => persistCommand({ type: 'childhood-choice', choiceId })} />
  } else if (session.pendingResult) {
    stageContent = <ResultPanel result={session.pendingResult} onContinue={() => persistCommand({ type: 'continue' })} />
  } else if (state.status !== 'playing') {
    stageContent = <EndPanel record={latestRecord} onRestart={persistStart} onOpenArchive={() => setArchiveOpen(true)} />
  } else if (state.combat) {
    stageContent = <CombatPanel state={state} onAction={(action) => persistCommand({ type: 'game-action', action: { type: 'COMBAT_ACTION', action } })} />
  } else if (state.pendingBeastLoot) {
    stageContent = <BeastLootPanel state={state} onClaim={(itemId, quantity) => persistCommand({ type: 'game-action', action: { type: 'CLAIM_BEAST_LOOT', itemId, quantity } })} onAbandon={() => persistCommand({ type: 'game-action', action: { type: 'ABANDON_BEAST_LOOT' } })} />
  } else if (state.secretRealm?.sunkenVeinChamber.active) {
    stageContent = <SecretRealmPanel state={state} onAction={(action) => persistCommand({ type: 'secret-realm', action })} onStartCoreCombat={() => persistCommand({ type: 'game-action', action: { type: 'START_COMBAT', opponentId: 'adult-rock-lizard', source: 'sunken-vein-core' } })} />
  } else if (state.lifeStage === 'adult' && state.world.currentLocationId && state.flags.location_knowledge_initialized === true) {
    stageContent = <>
      <WorldMapPanel state={state} onTravel={(destinationId) => persistCommand({ type: 'travel', destinationId })} onFastTravel={(destinationId) => persistCommand({ type: 'fast-travel', destinationId })} onExplore={persistExplore} onEnterSecretRealm={() => persistCommand({ type: 'secret-realm', action: 'enter' })} onEnterStrongTerritory={persistEnterTerritory} />
      {state.cultivation.practiceInitialized && <CultivationPanel state={state} onSelectTechnique={(techniqueId) => persistCommand({ type: 'select-main-technique', techniqueId })} onChangeMainTechnique={(techniqueId) => persistCommand({ type: 'change-main-technique', techniqueId })} onSetAuxiliaryTechnique={(techniqueId, enabled) => persistCommand({ type: 'set-auxiliary-technique', techniqueId, enabled })} onPracticeTechnique={persistTechniquePractice} onCultivate={persistCultivate} />}
      <FoundationBreakthroughPanel
        state={state}
        onAttempt={(options) => persistCommand({ type: 'attempt-foundation-breakthrough', usePozhangDan: options.usePozhangDan, useNingjiDan: options.useNingjiDan, spiritStoneInvestment: options.spiritStoneInvestment })}
        onRecuperate={(days) => persistCommand({ type: 'recuperate-days', days })}
      />
      <GoldenCoreBreakthroughPanel
        state={state}
        onAttempt={(options) => persistCommand({ type: 'attempt-golden-core-breakthrough', route: options.route, useBaoyuanDan: options.useBaoyuanDan, useCenturySpiritGinsengForRecovery: options.useCenturySpiritGinsengForRecovery, spiritStoneInvestment: options.spiritStoneInvestment })}
      />
    </>
  } else if (state.lifeStage === 'adult' && state.world.currentLocationId) {
    stageContent = <LocationKnowledgeSetupPanel state={state} onInitialize={() => persistCommand({ type: 'initialize-location-knowledge' })} />
  } else if (state.lifeStage === 'adult') {
    stageContent = <AdultEntryPanel state={state} onChoice={(optionId) => persistCommand({ type: 'adult-entry-choice', optionId })} onInitializeWorld={() => persistCommand({ type: 'initialize-world' })} />
  } else if (activeEvent) {
    stageContent = <EventPanel event={activeEvent} choices={choices} onChoice={(choiceId) => persistCommand({ type: 'choice', choiceId })} />
  } else {
    stageContent = <ActionPanel state={state} actions={getAvailableActions(state) as PlayerAction[]} onAction={(action) => persistCommand({ type: 'action', action })} />
  }

  return <main className="game-shell"><header className="topbar app-header"><div className="shell-brand"><p className="eyebrow">此世问长生 · V2.0</p><h1>此世问长生</h1></div><div className="topbar-actions"><button className="text-button" onClick={() => setArchiveOpen(true)} type="button">人生档案 {game.archives.length}</button></div></header><GameStatusBar state={state} /><div className="game-grid"><CharacterPanel state={state} onUnequip={(slot) => state.combat ? setNotice('战斗中不能调整护甲与法器。') : persistCommand({ type: 'unequip-slot', slot })} /><section className="main-stage" aria-label="当前经历">{stageContent}{state.inventory && !state.combat && <InventoryPanel state={state} onDrop={(itemId, quantity) => persistCommand({ type: 'inventory-drop', itemId, quantity })} onEquip={(itemId) => persistCommand({ type: 'equip-item', itemId })} onUseLifespanItem={(itemId) => persistCommand({ type: 'use-lifespan-item', itemId })} onUseTreatment={(itemId, injuryId) => persistCommand({ type: 'use-treatment-item', itemId, ...(injuryId ? { injuryId } : {}) })} onRecuperate={(days) => persistCommand({ type: 'recuperate-days', days })} />}{notice && <p className="notice">{notice}</p>}</section><ChroniclePanel entries={state.chronicle} birthDay={state.identity.birthDay} /></div>{archiveOpen && <ArchivePanel records={game.archives} onClose={() => setArchiveOpen(false)} />}</main>
}
export default App