import { getQingyunJoinOffer, getSectAccess, formatQingyunJoinPath, formatSectRank, isActiveQingyunMember, isFormerQingyunMember } from '../core/sectMembershipEngine'
import type { GameState } from '../types/game'

interface QingyunSectPanelProps {
  state: GameState
  onJoin: () => void
  onReceiveBasicTeaching: () => void
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

  const openPlaces = [
    access.serviceArea ? '外院与杂役区' : null,
    access.basicTeaching ? '传功堂' : null,
    access.discipleCultivationArea ? '弟子修炼场' : null,
    access.affairsHallEntry ? '事务堂' : null,
    access.innerResources ? '内门资源区' : null,
    access.trueInheritance ? '核心传承地' : null,
  ].filter((entry): entry is string => Boolean(entry))

  return <div className="qingyun-sect-section">
    <div className="sect-heading"><div><p className="subsection-title">青云宗</p><h3>{activeMembership ? `${formatSectRank(activeMembership.rank)} · 名籍在册` : formerMembership ? '旧名籍已经结束' : '山门在前'}</h3></div>{membership && <span>{formatQingyunJoinPath(membership.joinPath)}</span>}</div>

    {!membership && <div className="sect-join-card">
      <strong>{offer.routeLabel}</strong>
      <p>你可以在这里争取宗门身份，也可以转身离开，继续走自己的路。</p>
      <div className="sect-condition-list">{offer.conditions.map((entry) => <span key={entry}>门中会看 · {entry}</span>)}{offer.missing.map((entry) => <span className="missing" key={entry}>眼下还差 · {entry}</span>)}</div>
      {offer.available && offer.targetRank && <button className="primary-button" onClick={onJoin} type="button">登记入宗 · {formatSectRank(offer.targetRank)}</button>}
    </div>}

    {formerMembership && <div className="sect-join-card former-membership-summary">
      <strong>你本世曾在青云宗留下名籍。</strong>
      <p>如今旧籍已经结束，传功堂、事务堂和弟子修炼场都不再把你当作在册弟子。</p>
    </div>}

    {activeMembership && <>
      <div className="sect-destination-summary">
        <p className="subsection-title">你现在能去</p>
        <div className="sect-destination-chips">{openPlaces.map((place) => <span key={place}>{place}</span>)}</div>
        {!access.innerResources && <p className="sect-gate-note">内门山道有人查验名籍。以你现在的身份，守门弟子不会放行。</p>}
        {access.innerResources && !access.trueInheritance && <p className="sect-gate-note">你已经能进入内门资源区，但核心传承地仍只对真传开放。</p>}
      </div>

      {locationId === 'qingyun_sect' && access.basicTeaching && <div className="sect-teaching-card">
        <strong>传功堂 · 基础传授</strong>
        <p>{knownQingyuan ? '你已经掌握《青元引气诀》的基础行气次序。' : '正式弟子可以在这里领取《青元引气诀》的基础传授。这里只授行气法门，不会替你省去之后的修炼。'}</p>
        {!knownQingyuan && <button className="secondary-button" onClick={onReceiveBasicTeaching} type="button">领取《青元引气诀》</button>}
      </div>}
    </>}
  </div>
}
