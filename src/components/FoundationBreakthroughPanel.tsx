import { useState } from 'react'
import {
  calculateFoundationBreakthroughPreview,
  type FoundationBreakthroughOptions,
  type FoundationSpiritStoneInvestment,
} from '../core/foundationBreakthroughEngine'
import { getActiveInjuries, type RecuperationDuration } from '../core/injuryEngine'
import type { GameState } from '../types/game'
import type { InjuryKind } from '../types/injury'

interface FoundationBreakthroughPanelProps {
  state: GameState
  onAttempt: (options: FoundationBreakthroughOptions) => void
  onRecuperate: (days: RecuperationDuration) => void
}

const INJURY_LABEL: Readonly<Record<InjuryKind, string>> = {
  light: '轻伤',
  severe: '重伤',
  meridian: '经脉伤',
}

const BLOCK_REASON: Readonly<Record<string, string>> = {
  QI_NINE_NOT_COMPLETE: '炼气九层尚未修满。',
  NO_MAIN_TECHNIQUE: '当前没有可用于冲关的主修功法。',
  MAIN_TECHNIQUE_NOT_KNOWN: '当前主修不在已掌握功法中。',
  MAIN_TECHNIQUE_CANNOT_FOUNDATION: '当前掌握的主修内容还不足以支撑筑基。',
  INJURY_BLOCKS_FOUNDATION: '当前重伤或经脉伤尚未恢复，不能冲击筑基。',
  SECRET_REALM_ACTIVE: '秘境深入期间不能开始十四日筑基闭关。',
  EVENT_PENDING: '当前还有必须先处理的事件。',
  FOUNDATION_LOCATION_INVALID: '当前位置不能确认连续十四日的闭关条件。',
  FOUNDATION_SITE_UNSAFE: '这里没有真实建立的安全闭关据点，无法连续冲关十四日。',
  POZHANG_DAN_NOT_OWNED: '背包里没有可使用的破障丹。',
  NINGJI_DAN_NOT_OWNED: '背包里没有可使用的凝基丹。',
  NOT_ENOUGH_SPIRIT_STONES: '灵石不足以承担当前选择的聚灵投入。',
}

function signedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value}%`
}

export function FoundationBreakthroughPanel({ state, onAttempt, onRecuperate }: FoundationBreakthroughPanelProps) {
  const [usePozhangDan, setUsePozhangDan] = useState(false)
  const [useNingjiDan, setUseNingjiDan] = useState(false)
  const [spiritStoneInvestment, setSpiritStoneInvestment] = useState<FoundationSpiritStoneInvestment>(0)
  const activeInjuries = getActiveInjuries(state)
  const foundationReady = state.cultivation.realm === 'qi' && state.cultivation.stage === 9 && state.resources.cultivation === 1000
  const options: FoundationBreakthroughOptions = { usePozhangDan, useNingjiDan, spiritStoneInvestment }
  const preview = foundationReady ? calculateFoundationBreakthroughPreview(state, options) : null

  if (activeInjuries.length === 0 && !foundationReady) return null

  return (
    <section className="foundation-panel" aria-label="筑基与调养">
      {activeInjuries.length > 0 && (
        <div className="injury-section">
          <div className="foundation-heading-row">
            <div>
              <p className="story-kicker">伤势</p>
              <h2>当前需要调养</h2>
            </div>
            <span>{activeInjuries.length} 项未恢复</span>
          </div>
          <div className="injury-list">
            {activeInjuries.map((injury) => (
              <div className="injury-row" key={injury.id}>
                <strong>{INJURY_LABEL[injury.kind]}</strong>
                <span>预计还需 {Math.max(1, injury.recoveryDay - state.worldDay)} 日自然恢复</span>
              </div>
            ))}
          </div>
          <div className="foundation-inline-actions">
            <button className="secondary-button" onClick={() => onRecuperate(10)} type="button">调养 10 日</button>
            <button className="secondary-button" onClick={() => onRecuperate(30)} type="button">调养 30 日</button>
          </div>
          <p className="foundation-footnote">调养只推进时间。轻伤会降低普通修炼效率；重伤或经脉伤未恢复前不能正常修炼或再次冲击筑基。</p>
        </div>
      )}

      {foundationReady && preview && (
        <div className="foundation-breakthrough-section">
          <div className="foundation-heading-row">
            <div>
              <p className="story-kicker">筑基准备</p>
              <h2>炼气九层圆满</h2>
            </div>
            <div className="foundation-rate"><strong>{preview.successPercent}%</strong><span>本次成功率</span></div>
          </div>

          <div className="foundation-context">
            <span>{preview.techniqueName}</span>
            <span>熟练度：{preview.proficiencyLabel}</span>
            <span>{preview.locationName}</span>
            <span>固定耗时：14 日</span>
          </div>

          <div className="foundation-modifiers">
            <p className="subsection-title">当前修正</p>
            <div className="foundation-modifier-list">
              {preview.modifiers.map((modifier) => (
                <div key={modifier.id} className={modifier.percent < 0 ? 'negative' : modifier.percent > 0 ? 'positive' : ''}>
                  <span>{modifier.label}</span>
                  <strong>{signedPercent(modifier.percent)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="foundation-preparation-grid">
            <label className={`foundation-prep ${preview.ownsPozhangDan ? '' : 'unavailable'}`}>
              <input
                checked={usePozhangDan}
                disabled={!preview.ownsPozhangDan}
                onChange={(event) => setUsePozhangDan(event.target.checked)}
                type="checkbox"
              />
              <span><strong>破障丹</strong><small>{preview.ownsPozhangDan ? '使用 1 枚 · 成功率 +12%' : '背包中没有'}</small></span>
            </label>
            <label className={`foundation-prep ${preview.ownsNingjiDan ? '' : 'unavailable'}`}>
              <input
                checked={useNingjiDan}
                disabled={!preview.ownsNingjiDan}
                onChange={(event) => setUseNingjiDan(event.target.checked)}
                type="checkbox"
              />
              <span><strong>凝基丹</strong><small>{preview.ownsNingjiDan ? '使用 1 枚 · 成功率 +20%' : '背包中没有'}</small></span>
            </label>
          </div>

          <div className="foundation-stones">
            <p className="subsection-title">聚灵投入 · 当前 {preview.spiritStones} 枚下品灵石</p>
            <div className="foundation-inline-actions">
              {([0, 30, 60] as const).map((amount) => (
                <button
                  className={`secondary-button ${spiritStoneInvestment === amount ? 'selected' : ''}`}
                  disabled={state.resources.spiritStones < amount}
                  key={amount}
                  onClick={() => setSpiritStoneInvestment(amount)}
                  type="button"
                >
                  {amount === 0 ? '不投入' : `${amount} 枚`}
                  <span>{amount === 0 ? '+0%' : amount === 30 ? '+8%' : '+14%'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="foundation-risk">
            <p className="subsection-title">失败风险</p>
            <p>若本次未能筑基：轻度失败 {preview.severity.light}% · 严重失败 {preview.severity.severe}% · 极端失败 {preview.severity.extreme}%。</p>
            <p>极端失败中约一半会直接死亡；存活也会留下重伤与严重经脉伤。</p>
          </div>

          {preview.blockReason && <p className="foundation-block">{BLOCK_REASON[preview.blockReason] ?? preview.blockReason}</p>}
          <button
            className="primary-button foundation-attempt"
            disabled={!preview.canAttempt}
            onClick={() => onAttempt(options)}
            type="button"
          >
            开始筑基 · 14 日 · 成功率 {preview.successPercent}%
          </button>
          <p className="foundation-footnote">确认后，本次选择的丹药与灵石会立即投入。成功与失败都会消耗已经使用的准备资源。</p>
        </div>
      )}
    </section>
  )
}
