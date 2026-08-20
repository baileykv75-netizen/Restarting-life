import { getQingyunJoinOffer, getSectAccess, formatQingyunJoinPath, formatSectRank, isActiveQingyunMember, isFormerQingyunMember } from '../core/sectMembershipEngine'
import type { GameState } from '../types/game'

interface QingyunSectPanelProps {
  state: GameState
  onJoin: () => void
  onReceiveBasicTeaching: () => void
}

function AccessRow({ enabled, label, note }: { enabled: boolean; label: string; note: string }) {
  return <div className={`sect-access-row ${enabled ? 'enabled' : 'locked'}`}><div><strong>{label}</strong><span>{note}</span></div><em>{enabled ? '可进入' : '暂不可进入'}</em></div>
}

export function QingyunSectPanel({ state, onJoin, onReceiveBasicTeaching }: QingyunSectPanelProps) {
  const locationId = state.world.currentLocationId
  const membership = state.sectMembership?.sectId === 'qingyun' ? state.sectMembership : null
  const activeMembership = isActiveQingyunMember(state) ? membership : null
  const formerMembership = isFormerQingyunMember(state) ? membership : null
  const offer = getQingyunJoinOffer(state)
  const access = getSectAccess(state)
  const knownQingyuan = (state.cultivation.knownTechniqueIds ?? []).includes('qingyuan_yinqi')
  const canShow = locationId === 'qingyun_sect' || locationId === 'qingyun_family_quarters' || Boolean(membership)
  if (!canShow) return null

  return <div className="qingyun-sect-section">
    <div className="sect-heading"><div><p className="subsection-title">青云宗身份</p><h3>{activeMembership ? `${formatSectRank(activeMembership.rank)} · 已在册` : formerMembership ? '旧名籍 · 已结束' : '尚未入宗'}</h3></div>{membership && <span>{formatQingyunJoinPath(membership.joinPath)}</span>}</div>

    {!membership && <div className="sect-join-card">
      <strong>{offer.routeLabel}</strong>
      <p>你可以在这里争取宗门身份，也可以转身离开，继续走散修、家族或野外的路。</p>
      <div className="sect-condition-list">{offer.conditions.map((entry) => <span key={entry}>条件 · {entry}</span>)}{offer.missing.map((entry) => <span className="missing" key={entry}>尚缺 · {entry}</span>)}</div>
      {offer.available && offer.targetRank && <button className="primary-button" onClick={onJoin} type="button">登记入宗 · {formatSectRank(offer.targetRank)}</button>}
    </div>}

    {formerMembership && <div className="sect-join-card former-membership-summary">
      <strong>你本世的青云宗名籍已经结束。</strong>
      <p>旧档仍保留，但它不再给予传功堂、事务堂、弟子修炼区或更高层级资源权限。</p>
    </div>}

    {activeMembership && <>
      <div className="sect-access-list">
        <AccessRow enabled={access.outerRegistry} label="外院" note="查验名籍、身份与宗门内部登记。" />
        <AccessRow enabled={access.serviceArea} label="杂役与外围区域" note="宗门日常运转所需的外围区域。" />
        <AccessRow enabled={access.basicInternalResources} label="基础内部资源" note="名籍在册者可使用的最基础食宿、杂务与公共设施。" />
        <AccessRow enabled={access.basicTeaching} label="传功堂基础传授" note="正式弟子可领取青云宗基础功法。" />
        <AccessRow enabled={access.discipleCultivationArea} label="弟子修炼区域" note="正式弟子可借宗门灵脉环境修炼。" />
        <AccessRow enabled={access.affairsHallEntry} label="事务堂" note="你已有进入事务堂办理弟子事务的资格。" />
        <AccessRow enabled={access.innerResources} label="内门资源区域" note="只有内门及以上弟子才可进入。" />
        <AccessRow enabled={access.trueInheritance} label="核心传承" note="只有真传弟子才有资格接触。" />
      </div>

      {locationId === 'qingyun_sect' && access.basicTeaching && <div className="sect-teaching-card">
        <strong>传功堂 · 基础传授</strong>
        <p>{knownQingyuan ? '你已经掌握《青元引气诀》的基础行气次序。' : '外门及以上弟子可以领取《青元引气诀》的基础传授。传功只授行气法门，不会凭空增加修为。'}</p>
        {!knownQingyuan && <button className="secondary-button" onClick={onReceiveBasicTeaching} type="button">领取《青元引气诀》基础传授</button>}
      </div>}
    </>}
  </div>
}
