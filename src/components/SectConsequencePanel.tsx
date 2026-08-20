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
type SectView = 'master' | 'rules' | 'leave'

function ViolationAction({ state, violationId, title, description, onCommit }: { state: GameState; violationId: SectViolationId; title: string; description: string; onCommit: (violationId: SectViolationId) => void }) {
  const availability = getViolationActionAvailability(state, violationId)
  if (!availability.available && violationId === 'public_evil_practice') return null
  return <div className={`discipline-action ${availability.severity === 'heavy' ? 'heavy' : ''}`}>
    <div><strong>{title}</strong>{availability.severity && <span>{SEVERITY_LABEL[availability.severity]}度后果</span>}</div>
    <p>{description}</p>
    {availability.available ? <button className={availability.severity === 'heavy' ? 'danger-button' : 'secondary-button'} onClick={() => onCommit(violationId)} type="button">仍然越线</button> : <small>{availability.reason}</small>}
  </div>
}

export function SectConsequencePanel({ state, onAcceptMaster, onReceiveGuidance, onCommitViolation, onBetray }: SectConsequencePanelProps) {
  const [betrayConfirm, setBetrayConfirm] = useState(false)
  const [view, setView] = useState<SectView>('master')
  const activeMember = isActiveQingyunMember(state)
  const formerMember = isFormerQingyunMember(state)
  const membership = state.sectMembership?.sectId === 'qingyun' ? state.sectMembership : null
  if (!membership || (!activeMember && !formerMember)) return null

  const atQingyun = state.world.currentLocationId === 'qingyun_sect'
  const mastership = getActiveMastership(state)
  const mentor = mastership ? getQingyunMentorById(mastership.masterNpcId) : undefined
  const violations = getSectViolationHistory(state)

  if (formerMember) return <div className="sect-consequence-section">
    <div className="sect-consequence-heading"><div><p className="subsection-title">青云宗旧籍</p><h3>这段师门关系已经结束</h3></div><span>{formatSectRank(membership.rank)}</span></div>
    <div className="former-sect-card">
      <strong>你本世曾是青云宗 · {formatSectRank(membership.rank)}</strong>
      <p>{membership.exitReason ? formatSectExitReason(membership.exitReason) : '名籍已经结束'} · 第 {membership.endedDay ?? state.worldDay} 日。</p>
      {membership.mastership && <p>原师父 · {formatQingyunMasterName(membership.mastership.masterNpcId)}；这段师承已经结束。</p>}
      <p>旧贡献仍留在记录里：{state.sectProgress?.contribution ?? 0}。</p>
    </div>
    {violations.length > 0 && <div className="violation-history"><p className="subsection-title">旧违规记录</p>{violations.map((record, index) => <div className="violation-record" key={`${record.violationId}-${record.worldDay}-${index}`}><div><strong>{SEVERITY_LABEL[record.severity]}度 · {record.actionLabel}</strong><span>第 {record.worldDay} 日</span></div><p>{record.penaltyLabel}</p></div>)}</div>}
  </div>

  return <div className="sect-consequence-section">
    <div className="sect-consequence-heading"><div><p className="subsection-title">师承与门规</p><h3>{formatSectRank(membership.rank)} · 名籍仍在</h3></div></div>
    <div className="sect-subnav" aria-label="宗门关系">
      <button className={view === 'master' ? 'active' : ''} onClick={() => setView('master')} type="button">师承</button>
      <button className={view === 'rules' ? 'active' : ''} onClick={() => setView('rules')} type="button">门规</button>
      <button className={view === 'leave' ? 'active' : ''} onClick={() => setView('leave')} type="button">离宗</button>
    </div>

    {view === 'master' && <div className="mastership-card">
      <p className="subsection-title">正式师承</p>
      {mastership && mentor ? <>
        <div className="mastership-heading"><div><strong>{mentor.name}</strong><span>{mentor.title} · {mentor.realmLabel}</span></div><em>{mentor.specialty}</em></div>
        <p>{mentor.description}</p>
        <p className="mastership-benefit">传授 · {mentor.teachingText}</p>
        <p className="mastership-benefit">指点 · {mentor.guidanceText}</p>
        {mastership.guidanceUsesRemaining > 0 ? atQingyun ? <button className="primary-button" onClick={onReceiveGuidance} type="button">请师父指点十日</button> : <p className="muted">要请师父当面指点，得先回青云宗。</p> : <p className="muted">这一次正式指点已经受过了。</p>}
      </> : <>
        <p className="muted">长老是否收徒，会看你在宗门里真正做过什么。</p>
        <div className="mentor-offer-list">{getQingyunMentorOffers(state).map((offer) => <div className={`mentor-offer ${offer.available ? 'available' : 'unavailable'}`} key={offer.definition.id}>
          <div className="mastership-heading"><div><strong>{offer.definition.name}</strong><span>{offer.definition.title} · {offer.definition.realmLabel}</span></div><em>{offer.definition.specialty}</em></div>
          <p>{offer.definition.description}</p>
          <p className="mastership-benefit">若成师徒 · {offer.definition.teachingText}</p>
          {offer.missing.length > 0 && <div className="mentor-missing">{offer.missing.map((entry) => <span key={entry}>他仍在观望 · {entry}</span>)}</div>}
          {offer.available && <button className="secondary-button" onClick={() => onAcceptMaster(offer.definition.id)} type="button">正式拜{offer.definition.name}为师</button>}
        </div>)}</div>
      </>}
    </div>}

    {view === 'rules' && <div className="discipline-card">
      <p className="subsection-title">宗门禁地与越线</p>
      <p>门中不会替你把所有危险选择锁死，但越过身份边界，就要承担留下记录和受罚的后果。</p>
      {atQingyun ? <div className="discipline-action-list">
        <ViolationAction state={state} violationId="inner_resource_trespass" title="越过内门资源区封线" description="守门弟子已经说明你的名籍不能进入。第一次被抓会从轻处置，再犯会加重。" onCommit={onCommitViolation} />
        <ViolationAction state={state} violationId="core_inheritance_trespass" title="强闯核心传承禁地" description="这里不是普通越权。没有真传资格仍强闯，会被按重罪处置。" onCommit={onCommitViolation} />
        <ViolationAction state={state} violationId="public_evil_practice" title="在宗门内公开演练受限邪法" description="你明知这类法门为宗门所禁，仍选择在山门内公开施展。" onCommit={onCommitViolation} />
      </div> : <p className="muted">具体的宗门内越线行为，只有本人回到青云宗时才可能发生。</p>}
      {violations.length > 0 && <div className="violation-history"><p className="subsection-title">已有记录</p>{violations.map((record, index) => <div className="violation-record" key={`${record.violationId}-${record.worldDay}-${index}`}><div><strong>{SEVERITY_LABEL[record.severity]}度 · {record.actionLabel}</strong><span>第 {record.worldDay} 日</span></div><p>{record.penaltyLabel}</p></div>)}</div>}
    </div>}

    {view === 'leave' && <div className="betrayal-card">
      <p className="subsection-title">主动叛宗</p>
      {!betrayConfirm ? <><p>这不是普通离开山门。确认叛宗后，当前名籍、师承和内部资格都会立刻结束，正在办理的宗门事务也会作废。</p><button className="danger-button" onClick={() => setBetrayConfirm(true)} type="button">考虑叛离青云宗</button></> : <div className="betray-confirm"><strong>这一步不能当作误触撤销。</strong><p>已经学会的功法仍属于你，但从此你会以散修身份继续这一世。</p><div><button className="danger-button" onClick={onBetray} type="button">确认叛宗</button><button className="text-button" onClick={() => setBetrayConfirm(false)} type="button">算了</button></div></div>}
    </div>}
  </div>
}
