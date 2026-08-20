import { BACKGROUNDS, getBackgroundById } from '../data/backgrounds'
import { getItemDefinition } from '../data/items'
import { PHYSIQUES, getPhysiqueById } from '../data/physiques'
import { getSpiritRootById } from '../data/spiritRoots'
import { TALENTS, getTalentById } from '../data/talents'
import { getEffectiveStat, getRealmStatBonus } from '../core/effectiveStats'
import { getEquippedItemId, EQUIPMENT_SLOTS } from '../core/equipmentEngine'
import { getCharacterDisplayName } from '../core/nameEngine'
import { getSectContribution } from '../core/sectAssignmentEngine'
import { formatQingyunMasterName } from '../core/sectConsequenceEngine'
import { formatQingyunJoinPath, formatSectExitReason, formatSectRank, isActiveQingyunMember } from '../core/sectMembershipEngine'
import type { StatModifiers } from '../types/content'
import type { EquipmentSlot } from '../types/equipment'
import type { GameState } from '../types/game'
import { formatAge, formatFaction, formatRealm, formatRemainingLifespan } from '../ui/formatters'
import { formatEquipmentSlot, formatItemGrade } from '../ui/itemFormatters'

interface CharacterPanelProps {
  state: GameState
  onUnequip: (slot: EquipmentSlot) => void
}

const STAT_LABELS: Partial<Record<keyof GameState['stats'], string>> = {
  constitution: '根骨', comprehension: '悟性', spiritSense: '神识', mentality: '心性',
}

function effectLabels(statModifiers: StatModifiers, spiritStones: number): string[] {
  const labels = Object.entries(statModifiers)
    .filter(([key, value]) => key !== 'luck' && value !== undefined && value !== 0)
    .map(([key, value]) => `${STAT_LABELS[key as keyof GameState['stats']] ?? key} ${(value ?? 0) > 0 ? '+' : ''}${value ?? 0}`)
  if (spiritStones !== 0) labels.push(`下品灵石 ${spiritStones > 0 ? '+' : ''}${spiritStones}`)
  return labels
}

export function CharacterPanel({ state, onUnequip }: CharacterPanelProps) {
  const background = getBackgroundById(state.identity.backgroundId)
  const activeBackground = BACKGROUNDS.find((item) => item.id === state.identity.backgroundId)
  const talents = state.identity.talentIds.map(getTalentById).filter((item): item is NonNullable<typeof item> => item !== undefined)
  const rootName = state.tags.includes('spirit_root:reformed') ? '后天杂灵根' : (getSpiritRootById(state.identity.spiritRootId)?.name ?? state.identity.spiritRootId)
  const physique = state.identity.physiqueIds.length > 0 ? getPhysiqueById(state.identity.physiqueIds[0]) : PHYSIQUES[0]
  const spiritBonus = getRealmStatBonus(state, 'spiritSense')
  const effectiveSpiritSense = getEffectiveStat(state, 'spiritSense')
  const displayName = getCharacterDisplayName(state.identity.name, state.runSeed)
  const qingyunMembership = state.sectMembership?.sectId === 'qingyun' ? state.sectMembership : null
  const activeQingyun = isActiveQingyunMember(state)

  return (
    <aside className="panel character-panel" aria-label="人物状态">
      <div className="panel-heading"><span>人物</span><strong>{formatFaction(state)}</strong></div>
      <div className="identity-block">
        <p className="character-name">{displayName}</p>
        <p className="realm-title">{formatRealm(state)}</p>
        <p className="muted">{formatAge(state.worldDay, state.identity.birthDay)}</p>
      </div>

      <dl className="facts-grid">
        <div><dt>灵根</dt><dd>{rootName}</dd></div>
        <div><dt>寿元余量</dt><dd>{formatRemainingLifespan(state)}</dd></div>
        <div><dt>下品灵石</dt><dd>{state.resources.spiritStones} 枚</dd></div>
        <div><dt>修为</dt><dd>{state.resources.cultivation}</dd></div>
      </dl>

      {qingyunMembership && <div className="subsection sect-identity-subsection">
        <p className="subsection-title">宗门身份</p>
        <div className="trait-card">
          <strong>{activeQingyun ? '青云宗' : '曾属青云宗'} · {formatSectRank(qingyunMembership.rank)}</strong>
          <p>{formatQingyunJoinPath(qingyunMembership.joinPath)}入门 · 第 {qingyunMembership.joinedDay} 日登记。</p>
          {!activeQingyun && qingyunMembership.exitReason && <p>{formatSectExitReason(qingyunMembership.exitReason)} · 第 {qingyunMembership.endedDay ?? state.worldDay} 日。</p>}
          {qingyunMembership.mastership && <p>{qingyunMembership.mastership.status === 'active' ? '师父' : '原师父'} · {formatQingyunMasterName(qingyunMembership.mastership.masterNpcId)}</p>}
          <div className="trait-effects"><span>宗门贡献 {getSectContribution(state)}</span>{(qingyunMembership.violations?.length ?? 0) > 0 && <span>正式违规 {qingyunMembership.violations!.length} 条</span>}</div>
        </div>
      </div>}

      {state.equipment && <div className="subsection equipment-subsection">
        <p className="subsection-title">装备</p>
        <div className="equipment-slot-list">{EQUIPMENT_SLOTS.map((slot) => {
          const itemId = getEquippedItemId(state, slot)
          const item = itemId ? getItemDefinition(itemId) : undefined
          return <div className="equipment-slot-row" key={slot}>
            <div><span>{formatEquipmentSlot(slot)}</span><strong>{item?.name ?? '未装备'}</strong>{item && <small>{formatItemGrade(item)}</small>}</div>
            {itemId && <button className="equipment-unequip-button" onClick={() => onUnequip(slot)} type="button">卸下</button>}
          </div>
        })}</div>
      </div>}

      <div className="subsection">
        <p className="subsection-title">出身</p>
        {background ? (
          <div className="trait-card trait-card-origin">
            <strong>{background.name}</strong>
            <p>{background.description}</p>
            {activeBackground ? (
              <div className="trait-effects"><span>{activeBackground.origin}</span><span>{activeBackground.socialClass}</span></div>
            ) : (
              <div className="trait-effects">{effectLabels(background.statModifiers, background.spiritStones).map((effect) => <span key={effect}>{effect}</span>)}</div>
            )}
          </div>
        ) : <p className="muted">{state.identity.backgroundId}</p>}
      </div>

      <div className="subsection">
        <p className="subsection-title">体质</p>
        <div className="trait-card"><strong>{physique?.name ?? '无特殊体质'}</strong><p>{physique?.description ?? '没有记录到特殊体质。'}</p></div>
      </div>

      <div className="subsection">
        <p className="subsection-title">天赋</p>
        <div className="trait-stack">
          {talents.map((talent) => {
            const active = TALENTS.find((item) => item.id === talent.id)
            return (
              <div className="trait-card" key={talent.id}>
                <strong>{talent.name}</strong>
                <p>{active?.mechanics ?? talent.description}</p>
                {!active && <div className="trait-effects">{effectLabels(talent.statModifiers, talent.spiritStones).map((effect) => <span key={effect}>{effect}</span>)}</div>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="subsection">
        <p className="subsection-title">修行资质与能力</p>
        <div className="stats-grid">
          <div><span>根骨</span><strong>{state.stats.constitution}</strong></div>
          <div><span>悟性</span><strong>{state.stats.comprehension}</strong></div>
          <div className="stat-emphasis"><span>神识</span><strong>{effectiveSpiritSense}</strong>{spiritBonus > 0 && <small>先天 {state.stats.spiritSense} · 境界 +{spiritBonus}</small>}</div>
          <div><span>心性</span><strong>{state.stats.mentality}</strong></div>
        </div>
      </div>
    </aside>
  )
}
