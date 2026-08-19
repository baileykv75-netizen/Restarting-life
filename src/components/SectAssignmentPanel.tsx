import { getWorldLocationById } from '../data/worldLocations'
import {
  getActiveSectAssignmentDefinition,
  getSectContribution,
  getVisibleSectAssignmentOffers,
} from '../core/sectAssignmentEngine'
import { getRegionRiskLabel } from '../core/regionExplorationEngine'
import { getOpponentRiskAssessment, getRegionRiskAssessment } from '../core/riskAssessmentEngine'
import { getSectAccess } from '../core/sectMembershipEngine'
import type { GameState } from '../types/game'
import type { SectAssignmentId } from '../types/sect'

interface SectAssignmentPanelProps {
  state: GameState
  onAccept: (assignmentId: SectAssignmentId) => void
  onPerform: () => void
  onSettle: () => void
  onAbandon: () => void
}

function availabilityText(reason?: string): string {
  if (reason === 'SECT_CULL_TARGET_CURRENTLY_DEPLETED') return '事务堂暂时没有可确认的狼患目标。'
  if (reason === 'SECT_ASSIGNMENT_ALREADY_RESOLVED') return '这桩差事在本世已经有了结果。'
  return '当前不能领取。'
}

function taskRisk(state: GameState, assignmentId: SectAssignmentId): string {
  if (assignmentId === 'qingyun_greenback_cull') {
    return getRegionRiskLabel(getOpponentRiskAssessment(state, 'greenback-wolf').risk)
  }
  const definition = getVisibleSectAssignmentOffers(state).find((entry) => entry.definition.id === assignmentId)?.definition
  const location = definition ? getWorldLocationById(definition.targetLocationId) : undefined
  if (!definition || !location || location.type !== 'wilderness') return '路线相对稳定'
  return getRegionRiskLabel(getRegionRiskAssessment(state, location.id, location.danger).risk)
}

export function SectAssignmentPanel({ state, onAccept, onPerform, onSettle, onAbandon }: SectAssignmentPanelProps) {
  const access = getSectAccess(state)
  const active = state.sectProgress?.activeAssignment
  const activeDefinition = getActiveSectAssignmentDefinition(state)
  const atQingyun = state.world.currentLocationId === 'qingyun_sect'
  const canShow = Boolean(active) || (atQingyun && access.affairsHallEntry)
  if (!canShow) return null

  const history = state.sectProgress?.history ?? []
  const contribution = getSectContribution(state)
  const offers = atQingyun && !active ? getVisibleSectAssignmentOffers(state) : []

  return <div className="sect-assignment-section">
    <div className="sect-assignment-heading">
      <div><p className="subsection-title">事务堂</p><h3>{activeDefinition ? activeDefinition.name : '宗门事务'}</h3></div>
      <div className="sect-contribution"><span>当前贡献</span><strong>{contribution}</strong></div>
    </div>

    {active && activeDefinition ? <div className={`active-assignment-card ${active.status}`}>
      <div className="assignment-card-heading"><div><strong>{activeDefinition.name}</strong><span>{active.status === 'ready-to-settle' ? '目标已完成，待交结' : '正在办理'}</span></div><em>{activeDefinition.targetLocationLabel}</em></div>
      <p>{activeDefinition.description}</p>
      <div className="assignment-facts">
        <span>目标 · {activeDefinition.objectiveText}</span>
        <span>已知风险 · {taskRisk(state, activeDefinition.id)}</span>
        <span>报酬 · 贡献 +{activeDefinition.contributionReward} · 下品灵石 +{activeDefinition.spiritStoneReward}</span>
        {activeDefinition.kind === 'patrol' && <span>巡山进度 · {active.progressDays}/{activeDefinition.workDays ?? 0} 天</span>}
      </div>

      {active.status === 'accepted' && state.world.currentLocationId === activeDefinition.targetLocationId && activeDefinition.kind === 'herb' && <div className="assignment-action-note"><p>药图与采集范围已经确认。这里需要实际花三日采药，采得的青露草会先进入你的背包。</p><button className="primary-button" onClick={onPerform} type="button">{activeDefinition.actionLabel}</button></div>}
      {active.status === 'accepted' && state.world.currentLocationId === activeDefinition.targetLocationId && activeDefinition.kind === 'cull' && <div className="assignment-action-note"><p>你已经到了狼患出没的山段。沿痕迹搜到目标后会直接进入正式交战，逃走不算清剿完成。</p><button className="primary-button" onClick={onPerform} type="button">{activeDefinition.actionLabel}</button></div>}
      {active.status === 'accepted' && activeDefinition.kind === 'patrol' && state.world.currentLocationId === activeDefinition.targetLocationId && <p className="assignment-guidance">按上方“区域探索”实际巡查即可。遭遇妖兽会照常中断行动，已经走过的巡查时间仍会记入进度。</p>}
      {active.status === 'accepted' && activeDefinition.kind === 'escort' && <p className="assignment-guidance">这批物资已经随你出发。使用现有道路实际抵达青霞坊市，送达后再回宗门交结。</p>}
      {active.status === 'accepted' && state.world.currentLocationId !== activeDefinition.targetLocationId && <p className="assignment-guidance">先前往 <strong>{activeDefinition.targetLocationLabel}</strong>。这桩差事不会在事务堂原地替你结算路程或行动。</p>}
      {active.status === 'ready-to-settle' && !atQingyun && <p className="assignment-guidance">事情已经办成。回青云宗事务堂交回任务牌后，贡献和报酬才会正式入账。</p>}
      {active.status === 'ready-to-settle' && atQingyun && <button className="primary-button" onClick={onSettle} type="button">交结事务并领取报酬</button>}
      <button className="text-button assignment-abandon" onClick={onAbandon} type="button">放弃这桩差事</button>
    </div> : <>
      <p className="muted">事务堂只把眼下确实需要人办的差事挂出来。每桩事办过或放弃后，本世不会重新挂回去。</p>
      <div className="sect-assignment-offers">{offers.map(({ definition, available, reason }) => <div className={`sect-assignment-offer ${available ? 'available' : 'unavailable'}`} key={definition.id}>
        <div className="assignment-card-heading"><div><strong>{definition.name}</strong><span>{definition.targetLocationLabel}</span></div><em>{taskRisk(state, definition.id)}</em></div>
        <p>{definition.description}</p>
        <div className="assignment-facts"><span>目标 · {definition.objectiveText}</span>{definition.workDays && definition.kind !== 'patrol' && <span>现场耗时 · {definition.workDays} 天</span>}<span>报酬 · 贡献 +{definition.contributionReward} · 下品灵石 +{definition.spiritStoneReward}</span></div>
        {available ? <button className="secondary-button" onClick={() => onAccept(definition.id)} type="button">接下这桩事务</button> : <small>{availabilityText(reason)}</small>}
      </div>)}</div>
      {history.length > 0 && <p className="sect-history-note">本世已有 {history.length} 桩宗门事务留下结果，其中 {history.filter((entry) => entry.outcome === 'settled').length} 桩正式交结。</p>}
    </>}
  </div>
}
