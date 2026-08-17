import { useState } from 'react'
import { isFoundationComplete } from '../core/cultivationEngine'
import {
  calculateGoldenCoreBreakthroughPreview,
  type GoldenCoreBreakthroughOptions,
  type GoldenCoreRoute,
  type GoldenCoreSpiritStoneInvestment,
} from '../core/goldenCoreBreakthroughEngine'
import { getActiveInjuries } from '../core/injuryEngine'
import { getEffectiveMaxLifespanYears, getRemainingLifespanDays } from '../core/lifespanEngine'
import { hasActivePoison } from '../core/poisonEngine'
import type { GameState } from '../types/game'

interface GoldenCoreBreakthroughPanelProps { state: GameState; onAttempt: (options: GoldenCoreBreakthroughOptions) => void }

export function GoldenCoreBreakthroughPanel({ state, onAttempt }: GoldenCoreBreakthroughPanelProps) {
  const [route, setRoute] = useState<GoldenCoreRoute>('standard')
  const [useBaoyuanDan, setUseBaoyuanDan] = useState(false)
  const [useCenturySpiritGinsengForRecovery, setUseCenturySpiritGinsengForRecovery] = useState(false)
  const [spiritStoneInvestment, setSpiritStoneInvestment] = useState<GoldenCoreSpiritStoneInvestment>(0)
  if (!isFoundationComplete(state)) return null

  const yinsui = state.cultivation.mainTechniqueId === 'yinsui_ningcha'
  const effectiveRoute: GoldenCoreRoute = yinsui ? route : 'standard'
  const options: GoldenCoreBreakthroughOptions = { route: effectiveRoute, useBaoyuanDan: effectiveRoute === 'standard' && useBaoyuanDan, useCenturySpiritGinsengForRecovery, spiritStoneInvestment }
  const preview = calculateGoldenCoreBreakthroughPreview(state, options)
  const remainingDays = getRemainingLifespanDays(state)
  const activeInjuries = getActiveInjuries(state)
  const poisoned = hasActivePoison(state)
  const resourceBlocked = preview ? spiritStoneInvestment > state.resources.spiritStones
    || (options.useBaoyuanDan && !preview.ownsBaoyuanDan)
    || (useCenturySpiritGinsengForRecovery && !preview.ownsCenturySpiritGinseng)
    || (effectiveRoute === 'evil' && (!preview.ownsEvilBeastCore || !preview.ownsHighGradeBeastEssence)) : true

  return (
    <section className="foundation-panel" aria-label="结丹准备">
      <div className="foundation-heading-row">
        <div><p className="story-kicker">大境界突破</p><h2>结丹准备</h2></div>
        <div className="foundation-rate"><strong>{preview ? `${preview.successPercent}%` : '—'}</strong><span>{preview ? '当前成功率' : '当前不可尝试'}</span></div>
      </div>
      <div className="foundation-context">
        <span>主修：{preview?.techniqueName ?? '当前主修不含完整结丹法门'}</span><span>熟练：{preview?.proficiencyLabel ?? '—'}</span><span>地点：{preview?.locationName ?? '当前地点不满足条件'}</span><span>耗时：60 日</span><span>当前最大寿元：{getEffectiveMaxLifespanYears(state)} 年</span>
      </div>

      {activeInjuries.length > 0 && <p className="foundation-block">当前伤势：{activeInjuries.map((injury) => injury.kind === 'light' ? '轻伤' : injury.kind === 'severe' ? '重伤' : '经脉伤').join('、')}。重伤或经脉伤会阻止结丹；轻伤会降低成功率。</p>}
      {poisoned && <p className="foundation-block">当前中毒尚未清除，不能开始结丹。</p>}
      {remainingDays <= 60 && <p className="foundation-block">按当前寿元，你无法完整撑过接下来的 60 日。准备资源仍会在闭关开始时消耗，寿终后不会进行成功判定。</p>}

      {yinsui && <div className="foundation-stones"><p className="subsection-title">结丹路线</p><div className="foundation-inline-actions">
        <button className={`secondary-button ${effectiveRoute === 'standard' ? 'selected' : ''}`} onClick={() => setRoute('standard')} type="button">常规结丹</button>
        <button className={`secondary-button ${effectiveRoute === 'evil' ? 'selected' : ''}`} onClick={() => { setRoute('evil'); setUseBaoyuanDan(false) }} type="button">妖丹凝煞</button>
      </div>{effectiveRoute === 'evil' && <p className="foundation-block">成功后永久减少 20 年最大寿元；失败分布会向严重与极端后果偏移。必须真实持有完整二阶妖丹和高品质妖兽精血。</p>}</div>}

      <div className="foundation-preparation-grid">
        {effectiveRoute === 'standard' && <label className={`foundation-prep ${preview?.ownsBaoyuanDan ? '' : 'unavailable'}`}><input type="checkbox" checked={useBaoyuanDan} onChange={(event) => setUseBaoyuanDan(event.target.checked)} /><span><strong>抱元丹</strong><small>+25% · {preview?.ownsBaoyuanDan ? '已持有' : '未持有'}</small></span></label>}
        <label className={`foundation-prep ${preview?.ownsCenturySpiritGinseng ? '' : 'unavailable'}`}><input type="checkbox" checked={useCenturySpiritGinsengForRecovery} onChange={(event) => setUseCenturySpiritGinsengForRecovery(event.target.checked)} /><span><strong>百年灵参</strong><small>只缩短失败恢复，不提高成功率 · {preview?.ownsCenturySpiritGinseng ? '已持有' : '未持有'}</small></span></label>
        {effectiveRoute === 'evil' && <div className={`foundation-prep ${preview?.ownsEvilBeastCore ? '' : 'unavailable'}`}><span><strong>完整二阶妖丹</strong><small>{preview?.ownsEvilBeastCore ? '已持有' : '未持有'}</small></span></div>}
        {effectiveRoute === 'evil' && <div className={`foundation-prep ${preview?.ownsHighGradeBeastEssence ? '' : 'unavailable'}`}><span><strong>高品质妖兽精血</strong><small>{preview?.ownsHighGradeBeastEssence ? '已持有' : '未持有'}</small></span></div>}
      </div>

      <div className="foundation-stones"><p className="subsection-title">灵石投入</p><div className="foundation-inline-actions">
        {([0, 200, 400] as const).map((stones) => <button className={`secondary-button ${spiritStoneInvestment === stones ? 'selected' : ''}`} key={stones} onClick={() => setSpiritStoneInvestment(stones)} type="button">{stones === 0 ? '不投入' : <>{stones} 灵石 <span>{stones === 200 ? '+10%' : '+18%'}</span></>}</button>)}
      </div></div>

      {preview && <div className="foundation-modifiers"><p className="subsection-title">成功率修正</p><div className="foundation-modifier-list">
        {preview.modifiers.map((modifier) => <div className={modifier.percent > 0 ? 'positive' : modifier.percent < 0 ? 'negative' : ''} key={`${modifier.label}-${modifier.percent}`}><span>{modifier.label}</span><strong>{modifier.percent > 0 ? '+' : ''}{modifier.percent}%</strong></div>)}
      </div></div>}

      <div className="foundation-risk"><p className="subsection-title">失败风险</p><p>失败会退回筑基前期至后期并留下 90～540 日量级伤势；极端失败内部 60% 直接死亡。百年灵参只把失败后的恢复期缩短至原来的 75%。</p></div>
      {!preview && <p className="foundation-block">当前主修、伤势、中毒或地点尚不满足正式结丹条件。这里不会自动发放传承、丹药或闭关地点。</p>}
      <button className="primary-button foundation-attempt" disabled={!preview || resourceBlocked} onClick={() => onAttempt(options)} type="button">尝试结丹｜60 日｜{preview ? `${preview.successPercent}%` : '不可尝试'}</button>
      {resourceBlocked && preview && <p className="foundation-footnote">所选准备里存在未持有的物品或灵石不足，资源齐全后才能开始。</p>}
    </section>
  )
}
