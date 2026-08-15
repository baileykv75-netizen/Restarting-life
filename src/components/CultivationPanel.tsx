import { getCultivationTechniqueById, getTechniqueById, type TechniqueDefinition } from '../data/techniques'
import { getWorldLocationById } from '../data/worldLocations'
import {
  CULTIVATION_DURATIONS,
  calculateCultivationPreview,
  formatCultivationProgress,
  formatCultivationRealm,
  isQiNineComplete,
  type CultivationDuration,
} from '../core/cultivationEngine'
import {
  TECHNIQUE_PRACTICE_DURATIONS,
  getMainTechniqueChangePreview,
  getProficiencyLabel,
  getTechniqueProficiencyStage,
  isTechniqueMoveUnlocked,
  type TechniquePracticeDuration,
} from '../core/techniqueEngine'
import type { GameState } from '../types/game'

interface CultivationPanelProps {
  state: GameState
  onSelectTechnique: (techniqueId: string) => void
  onChangeMainTechnique: (techniqueId: string) => void
  onSetAuxiliaryTechnique: (techniqueId: string, enabled: boolean) => void
  onPracticeTechnique: (techniqueId: string, days: TechniquePracticeDuration) => void
  onCultivate: (days: CultivationDuration) => void
}

const CATEGORY_LABEL: Readonly<Record<TechniqueDefinition['category'], string>> = {
  main: '主修',
  combat: '战斗术法',
  movement: '身法',
  body: '炼体',
  secret: '秘术',
}

export function CultivationPanel({
  state,
  onSelectTechnique,
  onChangeMainTechnique,
  onSetAuxiliaryTechnique,
  onPracticeTechnique,
  onCultivate,
}: CultivationPanelProps) {
  if (!state.cultivation.practiceInitialized) return null

  const known = (state.cultivation.knownTechniqueIds ?? [])
    .map((id) => getTechniqueById(id))
    .filter((entry): entry is TechniqueDefinition => Boolean(entry))
  const mainTechniques = known.filter((entry) => entry.category === 'main')
  const auxiliaryTechniques = known.filter((entry) => entry.category !== 'main')
  const main = state.cultivation.mainTechniqueId ? getCultivationTechniqueById(state.cultivation.mainTechniqueId) : undefined
  const location = state.world.currentLocationId ? getWorldLocationById(state.world.currentLocationId) : undefined
  const oneDayPreview = main && state.cultivation.realm !== 'foundation' && state.cultivation.realm !== 'golden_core'
    ? calculateCultivationPreview(state, main.id, 1)
    : null
  const techniqueSystemReady = state.cultivation.techniqueSystemInitialized === true

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
            <p className="subsection-title">主修功法</p>
            {mainTechniques.map((technique) => {
              const selected = state.cultivation.mainTechniqueId === technique.id
              const proficiency = techniqueSystemReady ? getProficiencyLabel(getTechniqueProficiencyStage(state, technique.id)) : null
              const changePreview = techniqueSystemReady && state.cultivation.mainTechniqueId && !selected
                ? getMainTechniqueChangePreview(state, technique.id)
                : null
              const cultivationReady = Boolean(getCultivationTechniqueById(technique.id))
              return (
                <div className={`cultivation-technique-card ${selected ? 'selected' : ''}`} key={technique.id}>
                  <div className="cultivation-technique-line">
                    <div><strong>{technique.name}</strong><span>{proficiency ? `熟练度：${proficiency}` : '已掌握'}</span></div>
                    {selected ? (
                      <span className="technique-status">当前主修</span>
                    ) : !state.cultivation.mainTechniqueId && cultivationReady ? (
                      <button className="text-button" onClick={() => onSelectTechnique(technique.id)} type="button">设为主修</button>
                    ) : changePreview && state.cultivation.realm !== 'foundation' ? (
                      <button className="text-button" onClick={() => onChangeMainTechnique(technique.id)} type="button">改修</button>
                    ) : null}
                  </div>
                  {changePreview && state.cultivation.realm !== 'foundation' && (
                    <p className="technique-cost">改修需 {changePreview.adaptationDays} 日；当前小阶段修为预计损失 {(changePreview.cultivationLossRatio * 100).toFixed(0)}%（{changePreview.cultivationLossPoints} 点）。</p>
                  )}
                  {!cultivationReady && <p className="technique-cost">你掌握的这一部分还不足以作为当前可执行主修运转。</p>}
                </div>
              )
            })}
          </div>

          {state.cultivation.realm === 'foundation' ? (
            <p className="cultivation-note complete">筑基已经完成。当前低阶主修不会在本轮自动继续推进筑基修为；后续需要获得并接入真正的筑基阶段传承。</p>
          ) : state.cultivation.realm === 'golden_core' ? (
            <p className="cultivation-note complete">当前首版修炼闭环已经达到金丹层级。</p>
          ) : main && isQiNineComplete(state) ? (
            <p className="cultivation-note complete">炼气九层已经圆满。普通吐纳已经停止，接下来需要准备筑基。</p>
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
          ) : mainTechniques.length > 0 ? (
            <p className="cultivation-note">先从已掌握功法中选择一门作为当前主修。</p>
          ) : (
            <p className="cultivation-note">你掌握的内容里还没有可以承担吐纳周天的主修功法。</p>
          )}

          {techniqueSystemReady && auxiliaryTechniques.length > 0 && (
            <div className="technique-auxiliary-section">
              <p className="subsection-title">辅修与术法</p>
              {auxiliaryTechniques.map((technique) => {
                const enabled = (state.cultivation.auxiliaryTechniqueIds ?? []).includes(technique.id)
                const proficiency = getProficiencyLabel(getTechniqueProficiencyStage(state, technique.id))
                return (
                  <article className="technique-auxiliary-card" key={technique.id}>
                    <div className="cultivation-technique-line">
                      <div><strong>{technique.name}</strong><span>{CATEGORY_LABEL[technique.category]} · {proficiency}</span></div>
                      <button className="text-button" onClick={() => onSetAuxiliaryTechnique(technique.id, !enabled)} type="button">{enabled ? '取消辅修' : '列为辅修'}</button>
                    </div>
                    <p>{technique.description}</p>
                    {technique.moves && technique.moves.length > 0 && (
                      <div className="technique-moves">
                        {technique.moves.map((move) => {
                          const unlocked = isTechniqueMoveUnlocked(state, technique.id, move)
                          return <span key={move.id}>{move.name} · {unlocked ? '已掌握' : `${getProficiencyLabel(move.requiredProficiency ?? 'entry')}后掌握`}</span>
                        })}
                      </div>
                    )}
                    <div className="technique-practice-actions">
                      {TECHNIQUE_PRACTICE_DURATIONS.map((days) => (
                        <button className="secondary-button" key={days} onClick={() => onPracticeTechnique(technique.id, days)} type="button">练 {days} 日</button>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
