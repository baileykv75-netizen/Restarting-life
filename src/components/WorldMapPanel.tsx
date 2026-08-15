import { getWorldLocationById, getWorldLocationParent } from '../data/worldLocations'
import { getLocationKnowledgeStatus, getVisibleWorldConnections, getVisibleWorldLocations } from '../core/locationKnowledgeEngine'
import type { GameState } from '../types/game'
import type { QiDensity, WorldDanger, WorldLocationType } from '../types/world'

const TYPE_LABELS: Record<WorldLocationType, string> = {
  'mortal-settlement': '凡俗聚落', 'cultivation-market': '修仙坊市', sect: '宗门', 'clan-estate': '家族据点', wilderness: '野外区域', 'fixed-entry': '固定入口',
}
const DANGER_LABELS: Record<WorldDanger, string> = { safe: '安全', low: '较低', moderate: '一般', high: '较高', extreme: '危险' }
const QI_LABELS: Record<QiDensity, string> = { none: '几乎无', thin: '稀薄', low: '较低', medium: '中等', high: '浓郁' }

export function WorldMapPanel({ state }: { state: GameState }) {
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
      <p className="muted world-map-stop">地图只显示你这一世真正知道或听说过的地点；未知地点与隐藏连接不会提前出现。本轮仍没有旅行按钮。</p>
    </div>
  </section>
}
