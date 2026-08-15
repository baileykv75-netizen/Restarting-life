import { WORLD_LOCATIONS, getWorldLocationById, getWorldLocationParent } from '../data/worldLocations'
import type { GameState } from '../types/game'
import type { QiDensity, WorldDanger, WorldLocationType } from '../types/world'

const TYPE_LABELS: Record<WorldLocationType, string> = {
  'mortal-settlement': '凡俗聚落',
  'cultivation-market': '修仙坊市',
  sect: '宗门',
  'clan-estate': '家族据点',
  wilderness: '野外区域',
  'fixed-entry': '固定入口',
}

const DANGER_LABELS: Record<WorldDanger, string> = {
  safe: '安全', low: '较低', moderate: '一般', high: '较高', extreme: '危险',
}

const QI_LABELS: Record<QiDensity, string> = {
  none: '几乎无', thin: '稀薄', low: '较低', medium: '中等', high: '浓郁',
}

function connectionKey(a: string, b: string) {
  return [a, b].sort().join('::')
}

export function WorldMapPanel({ state }: { state: GameState }) {
  const currentId = state.world.currentLocationId
  const current = currentId ? getWorldLocationById(currentId) : undefined
  if (!current) {
    return <section className="story-card world-map-card world-map-error"><p className="story-kicker">青霞地界</p><h2>当前地点无法读取</h2><p className="story-text">当前存档没有对应的合法固定地点。游戏已停在安全状态，没有回落到旧版行动循环。</p><p className="error-text">currentLocationId: {currentId ?? 'null'}</p></section>
  }

  const parent = getWorldLocationParent(current)
  const adjacent = current.adjacentLocationIds.map((id) => getWorldLocationById(id)).filter((location) => Boolean(location))
  const drawn = new Set<string>()
  const connections = WORLD_LOCATIONS.flatMap((location) => location.adjacentLocationIds.flatMap((adjacentId) => {
    const key = connectionKey(location.id, adjacentId)
    if (drawn.has(key)) return []
    drawn.add(key)
    const target = getWorldLocationById(adjacentId)
    return target ? [{ key, from: location, to: target }] : []
  }))

  return <section className="story-card world-map-card">
    <div className="world-map-heading"><div><p className="story-kicker">青霞地界 · 固定世界骨架</p><h2>{current.name}</h2></div><span>你在这里</span></div>
    <div className="world-map-canvas" aria-label="青霞地界固定地点关系图">
      <svg className="world-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {connections.map(({ key, from, to }) => <line key={key} x1={from.mapPosition.x} y1={from.mapPosition.y} x2={to.mapPosition.x} y2={to.mapPosition.y} />)}
      </svg>
      {WORLD_LOCATIONS.map((location) => <div className={`world-map-node${location.id === current.id ? ' current' : ''}${location.parentLocationId ? ' child-node' : ''}`} key={location.id} style={{ left: `${location.mapPosition.x}%`, top: `${location.mapPosition.y}%` }}><span>{location.name}</span>{location.id === current.id && <em>当前</em>}</div>)}
    </div>
    <div className="world-location-detail">
      <div className="world-location-facts"><span>{TYPE_LABELS[current.type]}</span><span>客观危险 · {DANGER_LABELS[current.danger]}</span><span>灵气 · {QI_LABELS[current.qiDensity]}</span></div>
      <p className="story-text">{current.description}</p>
      {parent && <p className="world-location-parent">所属区域 · <strong>{parent.name}</strong></p>}
      <p className="world-location-adjacent">相邻地点 · {adjacent.map((location) => location!.name).join('、')}</p>
      <p className="muted world-map-stop">当前只展示固定世界和连接关系；本轮没有旅行按钮，也不会在这里推进时间。</p>
    </div>
  </section>
}
