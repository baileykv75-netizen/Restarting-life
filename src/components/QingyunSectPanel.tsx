import { getQingyunJoinOffer, getSectAccess, formatQingyunJoinPath, formatSectRank } from '../core/sectMembershipEngine'
import type { GameState } from '../types/game'

interface QingyunSectPanelProps {
  state: GameState
  onJoin: () => void
  onReceiveBasicTeaching: () => void
}

function AccessRow({ enabled, label, note }: { enabled: boolean; label: string; note: string }) {
  return <div className={`sect-access-row ${enabled ? 'enabled' : 'locked'}`}><div><strong>{label}</strong><span>{note}</span></div><em>{enabled ? '可访问' : '未开放'}</em></div>
}

export function QingyunSectPanel({ state, onJoin, onReceiveBasicTeaching }: QingyunSectPanelProps) {
  const locationId = state.world.currentLocationId
  const membership = state.sectMembership?.sectId === 'qingyun' ? state.sectMembership : null
  const offer = getQingyunJoinOffer(state)
  const access = getSectAccess(state)
  const knownQingyuan = (state.cultivation.knownTechniqueIds ?? []).includes('qingyuan_yinqi')
  const canShow = locationId === 'qingyun_sect' || locationId === 'qingyun_family_quarters' || Boolean(membership)
  if (!canShow) return null

  return <div className="qingyun-sect-section">
    <div className="sect-heading"><div><p className="subsection-title">青云宗身份</p><h3>{membership ? `${formatSectRank(membership.rank)} · 已在册` : '尚未入宗'}</h3></div>{membership && <span>{formatQingyunJoinPath(membership.joinPath)}</span>}</div>

    {!membership && <div className="sect-join-card">
      <strong>{offer.routeLabel}</strong>
      <p>加入宗门是可选路线。不加入不会阻止你继续走散修、家族或野外路线。</p>
      <div className="sect-condition-list">{offer.conditions.map((entry) => <span key={entry}>条件 · {entry}</span>)}{offer.missing.map((entry) => <span className="missing" key={entry}>尚缺 · {entry}</span>)}</div>
      {offer.available && offer.targetRank && <button className="primary-button" onClick={onJoin} type="button">主动加入青云宗 · {formatSectRank(offer.targetRank)}</button>}
    </div>}

    {membership && <>
      <div className="sect-access-list">
        <AccessRow enabled={access.outerRegistry} label="外院登记" note="名籍、身份与后续宗门事务的基础入口。" />
        <AccessRow enabled={access.serviceArea} label="杂役与外围区域" note="宗门日常运转所需的外围区域。" />
        <AccessRow enabled={access.basicTeaching} label="基础传功" note="正式弟子可领取青云宗基础传承。" />
        <AccessRow enabled={access.discipleCultivationArea} label="弟子修炼区域" note="在青云宗修炼时可使用宗门灵脉环境。" />
        <AccessRow enabled={access.affairsHallEntry} label="事务堂入口" note="R25 将从这里接入贡献与宗门事务，本轮只确认身份权限。" />
        <AccessRow enabled={access.innerResources} label="内门资源" note="需要内门身份；R24 不提供晋升捷径。" />
        <AccessRow enabled={access.trueInheritance} label="真传传承" note="真传身份不能由出生或普通入门直接获得。" />
      </div>

      {locationId === 'qingyun_sect' && access.basicTeaching && <div className="sect-teaching-card">
        <strong>传功堂 · 基础传授</strong>
        <p>{knownQingyuan ? '你已经掌握《青元引气诀》的基础行气次序。' : '外门及以上弟子可以领取《青元引气诀》的基础传授。这不是额外修为，只是获得真实可练的功法。'}</p>
        {!knownQingyuan && <button className="secondary-button" onClick={onReceiveBasicTeaching} type="button">领取《青元引气诀》基础传授</button>}
      </div>}
    </>}
  </div>
}