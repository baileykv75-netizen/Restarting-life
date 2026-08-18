import { getWorldLocationById, getWorldLocationParent } from '../data/worldLocations'
import { getLocationKnowledgeStatus, getVisibleWorldConnections, getVisibleWorldLocations } from '../core/locationKnowledgeEngine'
import { EXPLORATION_DURATIONS, getExplorationStage, getExplorationStageLabel, getRegionExploredDays, getRegionRiskLabel } from '../core/regionExplorationEngine'
import { getOpponentRiskAssessment, getRegionRiskAssessment } from '../core/riskAssessmentEngine'
import { getVisibleStrongBeastTerritories } from '../core/strongBeastTerritoryEngine'
import { getSublocationDiscoveryText, getVisibleSublocations } from '../core/sublocationEngine'
import { getDirectTravelOptions, getFastTravelOptions } from '../core/travelEngine'
import type { ExplorationDuration } from '../types/exploration'
import type { GameState } from '../types/game'
import type { StrongBeastTerritoryId } from '../types/territory'
import type { QiDensity, WorldDanger, WorldLocationType } from '../types/world'
import { QingyunSectPanel } from './QingyunSectPanel'

const TYPE_LABELS: Record<WorldLocationType, string> = {
  'mortal-settlement': '凡俗聚落', 'cultivation-market': '修仙坊市', sect: '宗门', 'clan-estate': '家族据点', wilderness: '野外区域', 'fixed-entry': '固定入口',
}
const DANGER_LABELS: Record<WorldDanger, string> = { safe: '安全', low: '较低', moderate: '一般', high: '较高', extreme: '危险' }
const QI_LABELS: Record<QiDensity, string> = { none: '几乎无', thin: '稀薄', low: '较低', medium: '中等', high: '浓郁' }
const EXPLORATION_LABELS: Record<ExplorationDuration, string> = { 1: '试探 · 1天', 3: '巡探 · 3天', 10: '深入 · 10天' }

interface WorldMapPanelProps {
  state: GameState
  onTravel: (destinationId: string) => void
  onFastTravel: (destinationId: string) => void
  onExplore: (days: ExplorationDuration) => void
  onEnterSecretRealm: () => void
  onEnterStrongTerritory: (territoryId: StrongBeastTerritoryId) => void
  onJoinQingyunSect: () => void
  onReceiveQingyunBasicTeaching: () => void
}

export function WorldMapPanel({ state, onTravel, onFastTravel, onExplore, onEnterSecretRealm, onEnterStrongTerritory, onJoinQingyunSect, onReceiveQingyunBasicTeaching }: WorldMapPanelProps) {
  const currentId = state.world.currentLocationId
  const current = currentId ? getWorldLocationById(currentId) : undefined
  if (!current) {
    return <section className="story-card world-map-card world-map-error"><p className="story-kicker">青霞地界</p><h2>当前地点无法读取</h2><p className="story-text">当前存档没有对应的合法固定地点。游戏已停在安全状态，没有回落到旧版行动循环。</p><p className="error-text">currentLocationId: {currentId ?? 'null'}</p></section>
  }
  if (getLocationKnowledgeStatus(state, current.id) !== 'discovered') {
    return <section className="story-card world-map-card world-map-error"><p className="story-kicker">青霞地界</p><h2>当前地点尚未进入你的认知</h2><p className="story-text">你已经站在一个合法地点，但地点知识尚未完成初始化。为避免出现全知地图，游戏停在安全状态。</p></section>
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

  return <section className="story-card world-map-card">
    <div className="world-map-heading"><div><p className="story-kicker">青霞地界 · 你的见闻</p><h2>{current.name}</h2></div><span>你在这里</span></div>
    <div className="world-knowledge-legend"><span>已确认 {visible.filter((entry) => entry.status === 'discovered').length}</span><span>传闻 {visible.filter((entry) => entry.status === 'rumored').length}</span></div>
    <div className="world-map-canvas" aria-label="角色当前知道的青霞地界">
      <svg className="world-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {connections.map(({ key, from, to }) => <line key={key} x1={from.mapPosition.x} y1={from.mapPosition.y} x2={to.mapPosition.x} y2={to.mapPosition.y} />)}
      </svg>
      {visible.map(({ location, status }) => <div className={`world-map-node ${status}${location.id === current.id ? ' current' : ''}${location.parentLocationId ? ' child-node' : ''}`} key={location.id} style={{ left: `${location.mapPosition.x}%`, top: `${location.mapPosition.y}%` }} title={status === 'rumored' ? location.rumorText : location.description}><span>{status === 'rumored' ? `传闻 · ${location.name}` : location.name}</span>{location.id === current.id && <em>当前</em>}{status === 'rumored' && <em>{location.rumorText}</em>}</div>)}
    </div>
    <div className="world-location-detail">
      <div className="world-location-facts"><span>{TYPE_LABELS[current.type]}</span><span>客观危险 · {DANGER_LABELS[current.danger]}</span><span>灵气 · {QI_LABELS[current.qiDensity]}</span></div>
      <p className="story-text">{current.description}</p>
      {parent && getLocationKnowledgeStatus(state, parent.id) !== 'unknown' && <p className="world-location-parent">所属区域 · <strong>{getLocationKnowledgeStatus(state, parent.id) === 'rumored' ? `传闻中的${parent.name}` : parent.name}</strong></p>}
      <p className="world-location-adjacent">已知相邻 · {adjacent.length > 0 ? adjacent.map(({ location, status }) => status === 'rumored' ? `传闻中的${location!.name}` : location!.name).join('、') : '暂无'}</p>

      {(current.id === 'qingyun_sect' || current.id === 'qingyun_family_quarters') && <QingyunSectPanel state={state} onJoin={onJoinQingyunSect} onReceiveBasicTeaching={onReceiveQingyunBasicTeaching} />}

      {current.type === 'wilderness' && currentAssessment && <div className="region-exploration-section">
        <div className="region-exploration-heading"><div><p className="subsection-title">区域探索</p><strong>{getExplorationStageLabel(explorationStage)}</strong></div><span>累计 {exploredDays} 天</span></div>
        <div className="region-risk-grid"><div><span>客观危险</span><strong>{DANGER_LABELS[current.danger]}</strong></div><div><span>以你当前状态</span><strong>{getRegionRiskLabel(currentAssessment.risk)}</strong></div></div>
        {currentAssessment.signals.length > 0 && <div className="risk-signal-list" aria-label="当前风险判断依据">{currentAssessment.signals.slice(0, 4).map((signal) => <span key={signal}>{signal}</span>)}</div>}
        <p className="muted">风险判断会读取你现在的境界、伤势、中毒、装备、身法与已经确认的区域威胁。它只帮助你判断，不会替你禁止进入危险地区。</p>
        <p className="muted">探索时间越长，你越可能发现子地点，也越可能在行动结束前撞上此地活动的普通妖兽。遭遇会中断本次探索；是否继续硬拼，可以到战斗中再判断。</p>
        <div className="exploration-options">{EXPLORATION_DURATIONS.map((days) => <button className="exploration-option" key={days} onClick={() => onExplore(days)} type="button">{EXPLORATION_LABELS[days]}</button>)}</div>
        {explorationStage === 'surveyed' && <p className="region-surveyed-note">这片固定区域已经基本探明。继续探索仍会消耗时间，也仍可能遇上这里活动的妖兽，但不会出现第五个熟悉阶段。</p>}

        {strongTerritories.length > 0 && <div className="strong-territory-section">
          <p className="subsection-title">已确认的高风险地点</p>
          <div className="strong-territory-list">{strongTerritories.map((territory) => {
            const territoryAssessment = territory.opponentId ? getOpponentRiskAssessment(state, territory.opponentId) : currentAssessment
            return <div className={`strong-territory-card ${territory.status}`} key={territory.id}>
              <div className="strong-territory-heading"><div><strong>{territory.name}</strong><span>{territory.status === 'cleared' ? '领地已变化' : territory.status === 'empty-confirmed' ? '已经查明' : '高风险地点'}</span></div><em>{getRegionRiskLabel(territoryAssessment.risk)}</em></div>
              <p>{territory.clue}</p>
              <p className="territory-warning">判断 · {territory.warning}</p>
              {territoryAssessment.signals.length > 0 && territory.canEnter && <small>{territoryAssessment.signals.slice(0, 2).join('；')}</small>}
              {territory.canEnter && territory.entryLabel && <div className="territory-entry-row"><button className="primary-button" onClick={() => onEnterStrongTerritory(territory.id)} type="button">{territory.entryLabel}</button><span>系统不会因为风险高而锁住这个选择。</span></div>}
            </div>
          })}</div>
        </div>}

        {visibleSublocations.length > 0 && <div className="sublocation-section"><p className="subsection-title">已确认子地点</p><div className="sublocation-list">{visibleSublocations.map((runtime) => <div className="sublocation-item" key={runtime.id}><strong>{getSublocationDiscoveryText(runtime.archetype)}</strong><span>{runtime.deepConfirmed ? '你已经进入并深入确认过这里。' : `你已经确认它存在于${current.name}。内部内容尚未展开。`}</span></div>)}</div></div>}
        {sunkenVein?.discovered && <div className="sunken-vein-entry"><p className="subsection-title">已确认地下遗迹</p><h3>沉脉石室</h3><p>{sunkenVein.cleared ? '这组沿旧灵脉修建的地下石室已经被你泄压并取走核心资源。遗迹仍可返回查看，但本世不会重新刷新。' : '旧矿深处存在一组与矿工支护完全不同的青灰石室。入口已经确认，可以实际进入。'}</p><button className={sunkenVein.cleared ? 'secondary-button' : 'primary-button'} onClick={onEnterSecretRealm} type="button">{sunkenVein.cleared ? '再次进入查看' : '进入沉脉石室'}</button></div>}
      </div>}

      <div className="travel-section">
        <p className="subsection-title">从这里出发</p>
        {directTravel.length > 0 ? <div className="travel-options">{directTravel.map((option) => <button className="travel-option" key={option.route.id} onClick={() => onTravel(option.destination.id)} type="button"><strong>前往{option.destination.name} · {option.travelDays}天</strong><span>{option.route.description}</span></button>)}</div> : <p className="muted">目前没有已经确认、并且与这里直接相邻的可前往地点。</p>}
      </div>

      {fastTravel.length > 0 && <div className="travel-section fast-travel-section"><p className="subsection-title">沿走熟的路线前往</p><div className="travel-options">{fastTravel.map((option) => <button className="travel-option secondary-travel" key={option.destination.id} onClick={() => onFastTravel(option.destination.id)} type="button"><strong>快速前往{option.destination.name} · {option.travelDays}天</strong><span>沿 {option.routeIds.length} 段已走过的稳定路线一次赶到，中途不停靠。</span></button>)}</div></div>}
      <p className="muted world-map-stop">传闻地点仍不能直接导航；未知固定地点、未发现子地点和未确认秘境都不会出现。</p>
    </div>
  </section>
}