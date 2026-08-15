import { getTechniqueById } from '../data/techniques'
import { getWorldLocationById } from '../data/worldLocations'
import {
  CULTIVATION_DURATIONS,
  calculateCultivationPreview,
  formatCultivationProgress,
  formatCultivationRealm,
  isQiNineComplete,
  type CultivationDuration,
} from '../core/cultivationEngine'
import type { GameState } from '../types/game'

interface CultivationPanelProps {
  state: GameState
  onSelectTechnique: (techniqueId: string) => void
  onCultivate: (days: CultivationDuration) => void
}

export function CultivationPanel({ state, onSelectTechnique, onCultivate }: CultivationPanelProps) {
  if (!state.cultivation.practiceInitialized) return null

  const known = (state.cultivation.knownTechniqueIds ?? [])
    .map((id) => getTechniqueById(id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  const main = state.cultivation.mainTechniqueId ? getTechniqueById(state.cultivation.mainTechniqueId) : undefined
  const location = state.world.currentLocationId ? getWorldLocationById(state.world.currentLocationId) : undefined
  const oneDayPreview = main ? calculateCultivationPreview(state, main.id, 1) : null

  return (
    <section className="cultivation-panel" aria-label="修炼">
      <div className="cultivation-heading">
        <div>
          <p className="story-kicker">修炼</p>
          <h2>{formatCultivationRealm(state.cultivation.realm, state.cultivation.stage)} · {formatCultivationProgress(state.resources.cultivation)}</h2>
        </div>
        <span className="cultivation-location">{location?.name ?? '当前位置未确定'}{oneDayPreview ? `｜${oneDayPreview.environmentLabel}` : ''}</span>
      </div>

      {state.identity.spiritRootId === 'none' ? (
        <p className="cultivation-note">你没有普通吐纳所需的灵根，现有基础功法无法让灵气在体内形成周天。</p>
      ) : known.length === 0 ? (
        <p className="cultivation-note">你还没有一门真正可以开始吐纳的主修功法。</p>
      ) : (
        <>
          <div className="cultivation-techniques">
            <p className="subsection-title">已掌握主修</p>
            {known.map((technique) => {
              const selected = main?.id === technique.id
              return (
                <button
                  className={`cultivation-technique ${selected ? 'selected' : ''}`}
                  key={technique.id}
                  onClick={() => !selected && onSelectTechnique(technique.id)}
                  type="button"
                >
                  <strong>{technique.name}</strong>
                  <span>{selected ? '当前主修' : '设为主修'}</span>
                </button>
              )
            })}
          </div>

          {main && isQiNineComplete(state) ? (
            <p className="cultivation-note complete">炼气九层已经圆满。继续提升需要准备筑基。</p>
          ) : main ? (
            <>
              {oneDayPreview && (
                <div className="cultivation-factors">
                  <p className="subsection-title">当前效率来源</p>
                  <div className="cultivation-factor-list">
                    {oneDayPreview.factors.map((factor) => <span key={factor.label}>{factor.label} ×{factor.multiplier.toFixed(2)}</span>)}
                  </div>
                </div>
              )}
              <div className="cultivation-actions">
                {CULTIVATION_DURATIONS.map((days) => {
                  const preview = calculateCultivationPreview(state, main.id, days)
                  return (
                    <button className="secondary-button cultivation-action" key={days} onClick={() => onCultivate(days)} type="button">
                      <strong>修炼 {days} 日</strong>
                      <span>{preview ? `预计推进约 ${(preview.gain / 10).toFixed(1)}%` : '当前无法估算'}</span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="cultivation-note">先从已掌握功法中选择一门作为当前主修。</p>
          )}
        </>
      )}
    </section>
  )
}
