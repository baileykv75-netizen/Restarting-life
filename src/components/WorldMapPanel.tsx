import { useState } from 'react'
import { getWorldLocationById, getWorldLocationParent } from '../data/worldLocations'
import { getLocationKnowledgeStatus, getVisibleWorldConnections, getVisibleWorldLocations } from '../core/locationKnowledgeEngine'
import { EXPLORATION_DURATIONS, getExplorationStage, getExplorationStageLabel, getRegionExploredDays, getRegionRiskLabel } from '../core/regionExplorationEngine'
import { getOpponentRiskAssessment, getRegionRiskAssessment } from '../core/riskAssessmentEngine'
import { getActiveSectAssignmentDefinition } from '../core/sectAssignmentEngine'
import { getVisibleStrongBeastTerritories } from '../core/strongBeastTerritoryEngine'
import { getSublocationDiscoveryText, getVisibleSublocations } from '../core/sublocationEngine'
import { getDirectTravelOptions, getFastTravelOptions } from '../core/travelEngine'
import type { ExplorationDuration } from '../types/exploration'
import type { GameState } from '../types/game'
import type { QingyunMasterNpcId, SectAssignmentId, SectViolationId } from '../types/sect'
import type { StrongBeastTerritoryId } from '../types/territory'
import type { QiDensity, WorldDanger, WorldLocationType } from '../types/world'
import { QingyunSectPanel } from './QingyunSectPanel'
import { SectAssignmentPanel } from './SectAssignmentPanel'
import { SectConsequencePanel } from './SectConsequencePanel'

const TYPE_LABELS: Record<WorldLocationType, string> = {
  'mortal-settlement': '凡俗聚落', 'cultivation-market': '修仙坊市', sect: '宗门', 'clan-estate': '家族据点', wilderness: '野外区域', 'fixed-entry': '固定入口',
}
const DANGER_LABELS: Record<WorldDanger, string> = { safe: '安全', low: '较低', moderate: '一般', high: '较高', extreme: '危险' }
const QI_LABELS: Record<QiDensity, string> = { none: '几乎无', thin: '稀薄', low: '较低', medium: '中等', high: '浓郁' }
const EXPLORATION_LABELS: Record<ExplorationDuration, string> = { 1: '试探 · 1天', 3: '巡探 · 3天', 10: '深入 · 10天' }

type LocalSection = 'details' | 'explore' | 'discoveries' | 'sect' | 'assignment' | 'mentor' | null

interface WorldMapPanelProps {
  state: GameState
  onTravel: (destinationId: string) => void
  onFastTravel: (destinationId: string) => void
  onExplore: (days: ExplorationDuration) => void
  onEnterSecretRealm: () => void
  onEnterStrongTerritory: (territoryId: StrongBeastTerritoryId) => void
  onJoinQingyunSect: () => void
  onReceiveQingyunBasicTeaching: () => void
  onAcceptSectAssignment: (assignmentId: SectAssignmentId) => void
  onPerformSectAssignment: () => void
  onSettleSectAssignment: () => void
  onAbandonSectAssignment: () => void
  onAcceptQingyunMaster: (masterNpcId: QingyunMasterNpcId) => void
  onReceiveMasterGuidance: () => void
  onCommitSectViolation: (violationId: SectViolationId) => void
  onBetrayQingyunSect: () => void
}

export function WorldMapPanel({ state, onTravel, onFastTravel, onExplore, onEnterSecretRealm, onEnterStrongTerritory, onJoinQingyunSect, onReceiveQingyunBasicTeaching, onAcceptSectAssignment, onPerformSectAssignment, onSettleSectAssignment, onAbandonSectAssignment, onAcceptQingyunMaster, onReceiveMasterGuidance, onCommitSectViolation, onBetrayQingyunSect }: WorldMapPanelProps) {
  const currentId = state.world.currentLocationId
  const current = currentId ? getWorldLocationById(currentId) : undefined
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(currentId ?? null)
  const [localSection, setLocalSection] = useState<LocalSection>(null)

  if (!current) {
    return <section className="story-card world-map-card world-map-error"><p className="story-kicker">青霞地界</p><h2>当前地点无法读取</h2><p className="story-text">这份行程记录出现了异常。为避免继续推进错误地点，当前行动已经停下。</p><p className="error-text">currentLocationId: {currentId ?? 'null'}</p></section>
  }
  if (getLocationKnowledgeStatus(state, current.id) !== 'discovered') {
    return <section className="story-card world-map-card world-map-error"><p className="story-kicker">青霞地界</p><h2>当前位置尚未记清</h2><p className="story-text">你已经到了这里，但行程记录还没有补全。先恢复地点认知后再继续赶路。</p></section>
  }

  const visible = getVisibleWorldLocations(state)
  const connections = getVisibleWorldConnections(state)
  const parent = getWorldLocationParent(current)
  const adjacent = current.adjacentLocationIds
    .map((id) => ({ location: getWorldLocationById(id), status: getLocationKnowledgeStatus(state, id) }))
    .filter((entry) => entry.location && entry.status !== 'unknown')
  const directTravel = getDirectTravelOptions(state)
  const fastTravel = getFastTravelOptions(state).filter((option) => option.routeIds.length > 1)
  const exploredDays = current.type === 'wilderness' ? getRegionExploredDays(state, current.id) : 0
  const explorationStage = getExplorationStage(exploredDays)
  const currentAssessment = current.type === 'wilderness' ? getRegionRiskAssessment(state, current.id, current.danger) : null
  const visibleSublocations = current.type === 'wilderness' ? getVisibleSublocations(state, current.id) : []
  const strongTerritories = current.type === 'wilderness' ? getVisibleStrongBeastTerritories(state, current.id) : []
  const sunkenVein = current.id === 'blackwind_mountain' ? state.secretRealm?.sunkenVeinChamber : undefined
  const activeAssignment = state.sectProgress?.activeAssignment
  const activeAssignmentDefinition = getActiveSectAssignmentDefinition(state)
  const atQingyun = current.id === 'qingyun_sect' || current.id === 'qingyun_family_quarters'

  const selectedRuntime = visible.find((entry) => entry.location.id === selectedLocationId)
  const selectedLocation = selectedRuntime?.location ?? current
  const selectedStatus = selectedRuntime?.status ?? 'discovered'
  const selectedDirect = directTravel.find((option) => option.destination.id === selectedLocation.id)
  const selectedFast = fastTravel.find((option) => option.destination.id === selectedLocation.id)
  const selectedTravel = selectedDirect ?? selectedFast
  const selectedIsCurrent = selectedLocation.id === current.id

  function toggleSection(section: Exclude<LocalSection, null>) {
    setLocalSection((active) => active === section ? null : section)
  }

  function selectLocation(locationId: string) {
    setSelectedLocationId(locationId)
    setLocalSection(null)
  }

  function confirmTravel() {
    if (!selectedTravel || selectedIsCurrent || selectedStatus !== 'discovered') return
    if (selectedDirect) onTravel(selectedLocation.id)
    else onFastTravel(selectedLocation.id)
    setSelectedLocationId(selectedLocation.id)
    setLocalSection(null)
  }

  return <section className="story-card world-map-card">
    <div className="world-map-heading"><div><p className="story-kicker">青霞地界</p><h2>{current.name}</h2></div><span>你在这里</span></div>
    <div className="world-knowledge-legend"><span>已知 {visible.filter((entry) => entry.status === 'discovered').length}</span><span>传闻 {visible.filter((entry) => entry.status === 'rumored').length}</span><span>点击地点查看路线</span></div>

    <div className="world-map-canvas" aria-label="角色当前知道的青霞地界">
      <svg className="world-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {connections.map(({ key, from, to }) => <line key={key} x1={from.mapPosition.x} y1={from.mapPosition.y} x2={to.mapPosition.x} y2={to.mapPosition.y} />)}
      </svg>
      {visible.map(({ location, status }) => <button
        className={`world-map-node ${status}${location.id === current.id ? ' current' : ''}${location.id === selectedLocation.id ? ' selected' : ''}${location.parentLocationId ? ' child-node' : ''}`}
        key={location.id}
        onClick={() => selectLocation(location.id)}
        style={{ left: `${location.mapPosition.x}%`, top: `${location.mapPosition.y}%` }}
        title={status === 'rumored' ? location.rumorText : location.description}
        type="button"
      ><span>{status === 'rumored' ? `传闻 · ${location.name}` : location.name}</span>{location.id === current.id && <em>当前</em>}</button>)}
    </div>

    <div className={`map-selection-card ${selectedStatus === 'rumored' ? 'rumored' : ''}`}>
      <div className="map-selection-heading"><div><span>{selectedStatus === 'rumored' ? '传闻地点' : TYPE_LABELS[selectedLocation.type]}</span><h3>{selectedLocation.name}</h3></div>{selectedStatus === 'discovered' && <em>{DANGER_LABELS[selectedLocation.danger]}</em>}</div>
      {selectedStatus === 'rumored' ? <p>{selectedLocation.rumorText}</p> : <p>{selectedLocation.description}</p>}
      {selectedIsCurrent ? <div className="map-selection-current"><strong>当前位置</strong><span>从这里选择下一步行动，或点击地图上的其他地点规划行程。</span></div>
        : selectedStatus === 'rumored' ? <p className="muted">你只听过这个地方，还不知道可靠走法。</p>
        : selectedTravel ? <div className="map-travel-confirm"><div><span>从 {current.name} 出发</span><strong>{selectedTravel.travelDays} 天</strong>{selectedFast && !selectedDirect && <small>沿已经走熟的路线连续赶路</small>}</div><button className="primary-button" onClick={confirmTravel} type="button">确认前往</button></div>
        : <p className="muted">目前没有一条你已经确认并能直接执行的路线。</p>}
    </div>

    {activeAssignment && activeAssignmentDefinition && <button className="active-assignment-tracker" onClick={() => toggleSection('assignment')} type="button">
      <span>当前事务</span><strong>{activeAssignmentDefinition.name}</strong><em>{activeAssignment.status === 'ready-to-settle' ? '已完成，待交结' : `目标 · ${activeAssignmentDefinition.targetLocationLabel}`}</em>
    </button>}

    <div className="location-action-bar" aria-label="当前位置行动">
      <button className={localSection === 'details' ? 'active' : ''} onClick={() => toggleSection('details')} type="button">地点详情</button>
      {current.type === 'wilderness' && <button className={localSection === 'explore' ? 'active' : ''} onClick={() => toggleSection('explore')} type="button">探索此地</button>}
      {current.type === 'wilderness' && (visibleSublocations.length > 0 || strongTerritories.length > 0 || sunkenVein?.discovered) && <button className={localSection === 'discoveries' ? 'active' : ''} onClick={() => toggleSection('discoveries')} type="button">已知地点</button>}
      {atQingyun && <button className={localSection === 'sect' ? 'active' : ''} onClick={() => toggleSection('sect')} type="button">宗门</button>}
      {(atQingyun || activeAssignment) && <button className={localSection === 'assignment' ? 'active' : ''} onClick={() => toggleSection('assignment')} type="button">事务</button>}
      {atQingyun && state.sectMembership?.sectId === 'qingyun' && <button className={localSection === 'mentor' ? 'active' : ''} onClick={() => toggleSection('mentor')} type="button">师承与门规</button>}
    </div>

    {localSection === 'details' && <div className="world-location-detail compact-detail">
      <div className="world-location-facts"><span>{TYPE_LABELS[current.type]}</span><span>危险 · {DANGER_LABELS[current.danger]}</span><span>灵气 · {QI_LABELS[current.qiDensity]}</span></div>
      <p className="story-text">{current.description}</p>
      {parent && getLocationKnowledgeStatus(state, parent.id) !== 'unknown' && <p className="world-location-parent">所属区域 · <strong>{getLocationKnowledgeStatus(state, parent.id) === 'rumored' ? `传闻中的${parent.name}` : parent.name}</strong></p>}
      <p className="world-location-adjacent">已知相邻 · {adjacent.length > 0 ? adjacent.map(({ location, status }) => status === 'rumored' ? `传闻中的${location!.name}` : location!.name).join('、') : '暂无'}</p>
    </div>}

    {localSection === 'sect' && <div className="location-expanded-panel"><QingyunSectPanel state={state} onJoin={onJoinQingyunSect} onReceiveBasicTeaching={onReceiveQingyunBasicTeaching} /></div>}
    {localSection === 'assignment' && <div className="location-expanded-panel"><SectAssignmentPanel state={state} onAccept={onAcceptSectAssignment} onPerform={onPerformSectAssignment} onSettle={onSettleSectAssignment} onAbandon={onAbandonSectAssignment} /></div>}
    {localSection === 'mentor' && <div className="location-expanded-panel"><SectConsequencePanel state={state} onAcceptMaster={onAcceptQingyunMaster} onReceiveGuidance={onReceiveMasterGuidance} onCommitViolation={onCommitSectViolation} onBetray={onBetrayQingyunSect} /></div>}

    {localSection === 'explore' && current.type === 'wilderness' && currentAssessment && <div className="region-exploration-section">
      <div className="region-exploration-heading"><div><p className="subsection-title">区域探索</p><strong>{getExplorationStageLabel(explorationStage)}</strong></div><span>累计 {exploredDays} 天</span></div>
      <div className="region-risk-grid"><div><span>此地危险</span><strong>{DANGER_LABELS[current.danger]}</strong></div><div><span>以你当前状态</span><strong>{getRegionRiskLabel(currentAssessment.risk)}</strong></div></div>
      {currentAssessment.signals.length > 0 && <div className="risk-signal-list" aria-label="当前风险判断依据">{currentAssessment.signals.slice(0, 4).map((signal) => <span key={signal}>{signal}</span>)}</div>}
      <p className="muted">时间花得越久，越可能摸清更深处的路径，也越可能撞上此地活动的妖兽。</p>
      <div className="exploration-options">{EXPLORATION_DURATIONS.map((days) => <button className="exploration-option" key={days} onClick={() => onExplore(days)} type="button">{EXPLORATION_LABELS[days]}</button>)}</div>
      {explorationStage === 'surveyed' && <p className="region-surveyed-note">这片区域的主要地形已经摸得很熟。继续深入仍可能遇见妖兽或返回已知地点。</p>}
    </div>}

    {localSection === 'discoveries' && current.type === 'wilderness' && <div className="location-expanded-panel discoveries-panel">
      {strongTerritories.length > 0 && <div className="strong-territory-section">
        <p className="subsection-title">高风险地点</p>
        <div className="strong-territory-list">{strongTerritories.map((territory) => {
          const territoryAssessment = territory.opponentId ? getOpponentRiskAssessment(state, territory.opponentId) : currentAssessment!
          return <div className={`strong-territory-card ${territory.status}`} key={territory.id}>
            <div className="strong-territory-heading"><div><strong>{territory.name}</strong><span>{territory.status === 'cleared' ? '威胁已经改变' : territory.status === 'empty-confirmed' ? '已经查明' : '危险迹象明确'}</span></div><em>{getRegionRiskLabel(territoryAssessment.risk)}</em></div>
            <p>{territory.clue}</p>
            <p className="territory-warning">{territory.warning}</p>
            {territory.canEnter && territory.entryLabel && <div className="territory-entry-row"><button className="primary-button" onClick={() => onEnterStrongTerritory(territory.id)} type="button">{territory.entryLabel}</button></div>}
          </div>
        })}</div>
      </div>}
      {visibleSublocations.length > 0 && <div className="sublocation-section"><p className="subsection-title">已确认地点</p><div className="sublocation-list">{visibleSublocations.map((runtime) => <div className="sublocation-item" key={runtime.id}><strong>{getSublocationDiscoveryText(runtime.archetype)}</strong><span>{runtime.deepConfirmed ? '你已经亲自深入过这里。' : `你已经确认它位于${current.name}。`}</span></div>)}</div></div>}
      {sunkenVein?.discovered && <div className="sunken-vein-entry"><p className="subsection-title">地下遗迹</p><h3>沉脉石室</h3><p>{sunkenVein.cleared ? '石室已经被你探过，核心资源也已取走。' : '旧矿深处的青灰石室入口已经确认，可以亲自进去。'}</p><button className={sunkenVein.cleared ? 'secondary-button' : 'primary-button'} onClick={onEnterSecretRealm} type="button">{sunkenVein.cleared ? '再次进入' : '进入沉脉石室'}</button></div>}
    </div>}
  </section>
}
