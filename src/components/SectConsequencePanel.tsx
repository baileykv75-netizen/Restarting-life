import { useState } from 'react'
import { getQingyunMentorById } from '../data/qingyunMentors'
import {
  formatQingyunMasterName,
  getActiveMastership,
  getQingyunMentorOffers,
  getSectViolationHistory,
  getViolationActionAvailability,
} from '../core/sectConsequenceEngine'
import { formatSectExitReason, formatSectRank, isActiveQingyunMember, isFormerQingyunMember } from '../core/sectMembershipEngine'
import type { GameState } from '../types/game'
import type { QingyunMasterNpcId, SectViolationId, SectViolationSeverity } from '../types/sect'

interface SectConsequencePanelProps {
  state: GameState
  onAcceptMaster: (masterNpcId: QingyunMasterNpcId) => void
  onReceiveGuidance: () => void
  onCommitViolation: (violationId: SectViolationId) => void
  onBetray: () => void
}

const SEVERITY_LABEL: Readonly<Record<SectViolationSeverity, string>> = { light: '轻', medium: '中', heavy: '重' }

function ViolationAction({
  state,
  violationId,
  title,
  description,
  onCommit,
}: {
  state: GameState
  violationId: SectViolationId
  title: string
  description: string
  onCommit: (violationId: SectViolationId) => void
}) {
  const availability = getViolationActionAvailability(state, violationId)
  if (!availability.available && violationId === 'public_evil_practice') return null
  return <div className={`discipline-action ${availability.severity === 'heavy' ? 'heavy' : ''}`}>
    <div><strong>{title}</strong>{availability.severity && <span>若执行 · {SEVERITY_LABEL[availability.severity]}度违规</span>}</div>
    <p>{description}</p>
    {availability.available
      ? <button className={availability.severity === 'heavy' ? 'danger-button' : 'secondary-button'} onClick={() => onCommit(violationId)} type="button">明知后果仍这样做</button>
      : <small>{availability.reason}</small>}
  </div>
}

export function SectConsequencePanel({ state, onAcceptMaster, onReceiveGuidance, onCommitViolation, onBetray }: SectConsequencePanelProps) {
  const [betrayConfirm, setBetrayConfirm] = useState(false)
  const activeMember = isActiveQingyunMember(state)
  const formerMember = isFormerQingyunMember(state)
  const membership = state.sectMembership?.sectId === 'qingyun' ? state.sectMembership : null
  if (!membership || (!activeMember && !formerMember)) return null

  const atQingyun = state.world.currentLocationId === 'qingyun_sect'
  const mastership = getActiveMastership(state)
  const mentor = mastership ? getQingyunMentorById(mastership.masterNpcId) : undefined
  const violations = getSectViolationHistory(state)

  return <div className="sect-consequence-section">
    <div className="sect-consequence-heading"><div><p className="subsection-title">师承与门规</p><h3>{activeMember ? '名籍仍在' : '旧名籍'}</h3></div><span>{formatSectRank(membership.rank)}</span></div>

    {activeMember && <>
      <div className="mastership-card">
        <p className="subsection-title">正式师承</p>
        {mastership && mentor ? <>
          <div className="mastership-heading"><div><strong>{mentor.name}</strong><span>{mentor.title} · {mentor.realmLabel}</span></div><em>{mentor.specialty}</em></div>
          <p>{mentor.description}</p>
          <p className="mastership-benefit">已得传授 · {mentor.teachingText}</p>
          <p className="mastership-benefit">当面指点 · {mentor.guidanceText}</p>
          {mastership.guidanceUsesRemaining > 0
            ? atQingyun
              ? <button className="primary-button" onClick={onReceiveGuidance} type="button">请师父当面指点十日</button>
              : <p className="muted">当面指点仍有 {mastership.guidanceUsesRemaining} 次，需要回青云宗见师父。</p>
            : <p className="muted">本世这次正式当面指点已经用过。师承仍然存在，但不会无限重复发放同一份修炼加成。</p>}
        </> : <>
          <p className="muted">正式拜师不是入宗赠品。长老会看你真实办过什么事，而不是只看出身。</p>
          <div className="mentor-offer-list">{getQingyunMentorOffers(state).map((offer) => <div className={`mentor-offer ${offer.available ? 'available' : 'unavailable'}`} key={offer.definition.id}>
            <div className="mastership-heading"><div><strong>{offer.definition.name}</strong><span>{offer.definition.title} · {offer.definition.realmLabel}</span></div><em>{offer.definition.specialty}</em></div>
            <p>{offer.definition.description}</p>
            <p className="mastership-benefit">拜师后 · {offer.definition.teachingText}</p>
            <p className="mastership-benefit">另有 · {offer.definition.guidanceText}</p>
            {offer.missing.length > 0 && <div className="mentor-missing">{offer.missing.map((entry) => <span key={entry}>尚缺 · {entry}</span>)}</div>}
            {offer.available && <button className="secondary-button" onClick={() => onAcceptMaster(offer.definition.id)} type="button">正式拜{offer.definition.name}为师</button>}
          </div>)}</div>
        </>}
      </div>

      <div className="discipline-card">
        <p className="subsection-title">门规不是提示框</p>
        <p>宗门不会替你锁死越权选择，但真的越线就会留下记录。处罚读取现有贡献、灵石和正式名籍，不另造“纪律点”。</p>
        {atQingyun ? <div className="discipline-action-list">
          <ViolationAction state={state} violationId="inner_resource_trespass" title="越过内门资源区封线" description="你当前没有这里的正式权限。第一次被抓会留下警告；明知故犯，处罚会升级。" onCommit={onCommitViolation} />
          <ViolationAction state={state} violationId="core_inheritance_trespass" title="强闯核心传承禁地" description="这里不是普通越权。无真传资格仍强闯，会按重度违规处理并直接取消弟子名籍。" onCommit={onCommitViolation} />
          <ViolationAction state={state} violationId="public_evil_practice" title="在宗门内公开演练受限邪法" description="你明知这门功法属于宗门明确限制的邪道体系，仍选择在宗门内公开演练。" onCommit={onCommitViolation} />
        </div> : <p className="muted">具体宗门内越权行为只有回到青云宗时才会出现。</p>}
      </div>

      <div className="betrayal-card">
        <p className="subsection-title">主动叛宗</p>
        {!betrayConfirm ? <>
          <p>这不是普通退出。你会立即失去青云宗内部权限；正式师承会结束；正在办理的宗门事务会作废；青云宗会把“主动叛宗”保留在旧名籍里。</p>
          <button className="danger-button" onClick={() => setBetrayConfirm(true)} type="button">考虑叛离青云宗</button>
        </> : <div className="betray-confirm">
          <strong>确认后不能当作误触撤销。</strong>
          <p>你将从当前青云弟子变为散修。已经学会的功法不会被抹掉，但宗门身份、师父后续指点和内部资源资格会立即结束。</p>
          <div><button className="danger-button" onClick={onBetray} type="button">确认叛宗</button><button className="text-button" onClick={() => setBetrayConfirm(false)} type="button">算了</button></div>
        </div>}
      </div>
    </>}

    {formerMember && <div className="former-sect-card">
      <strong>你本世曾是青云宗 · {formatSectRank(membership.rank)}</strong>
      <p>{membership.exitReason ? formatSectExitReason(membership.exitReason) : '名籍已经结束'} · 第 {membership.endedDay ?? state.worldDay} 日。</p>
      {membership.mastership && <p>原师父 · {formatQingyunMasterName(membership.mastership.masterNpcId)}；师承已因{membership.mastership.endedReason === 'betrayed' ? '主动叛宗' : '逐出'}结束。</p>}
      <p>旧贡献仍保留为历史：{state.sectProgress?.contribution ?? 0}。它不再代表你有资格使用宗门内部资源。</p>
    </div>}

    {violations.length > 0 && <div className="violation-history">
      <p className="subsection-title">正式违规记录</p>
      {violations.map((record, index) => <div className="violation-record" key={`${record.violationId}-${record.worldDay}-${index}`}><div><strong>{SEVERITY_LABEL[record.severity]}度 · {record.actionLabel}</strong><span>第 {record.worldDay} 日</span></div><p>{record.penaltyLabel}</p></div>)}
    </div>}
  </div>
}
