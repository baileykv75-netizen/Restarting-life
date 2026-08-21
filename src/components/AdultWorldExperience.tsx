import type { CultivationDuration } from '../core/cultivationEngine'
import type { TechniquePracticeDuration } from '../core/techniqueEngine'
import type { SessionCommand } from '../types/command'
import type { ExplorationDuration } from '../types/exploration'
import type { GameState } from '../types/game'
import type { QingyunMasterNpcId, SectAssignmentId, SectViolationId } from '../types/sect'
import type { StrongBeastTerritoryId } from '../types/territory'
import { AdultWorldShell } from './AdultWorldShell'
import { CharacterPanel } from './CharacterPanel'
import { ChroniclePanel } from './ChroniclePanel'
import { CultivationPanel } from './CultivationPanel'
import { FoundationBreakthroughPanel } from './FoundationBreakthroughPanel'
import { GoldenCoreBreakthroughPanel } from './GoldenCoreBreakthroughPanel'
import { InventoryPanel } from './InventoryPanel'
import { SectAssignmentPanel } from './SectAssignmentPanel'
import { WorldMapPanel } from './WorldMapPanel'

interface AdultWorldExperienceProps {
  state: GameState
  notice: string | null
  archiveCount: number
  onOpenArchive: () => void
  onCommand: (command: SessionCommand) => void
  onExplore: (days: ExplorationDuration) => void
  onEnterStrongTerritory: (territoryId: StrongBeastTerritoryId) => void
  onJoinQingyunSect: () => void
  onReceiveQingyunBasicTeaching: () => void
  onAcceptSectAssignment: (assignmentId: SectAssignmentId) => void
  onPerformSectAssignment: () => void
  onSettleSectAssignment: () => void
  onAbandonSectAssignment: () => void
  onAcceptQingyunMaster: (masterNpcId: QingyunMasterNpcId) => void
  onReceiveMasterGuidance: () => void
  onCommitSectViolation: (violationId: SectViolationId) => void
  onBetrayQingyunSect: () => void
  onCultivate: (days: CultivationDuration) => void
  onPracticeTechnique: (techniqueId: string, days: TechniquePracticeDuration) => void
}

export function AdultWorldExperience({ state, notice, archiveCount, onOpenArchive, onCommand, onExplore, onEnterStrongTerritory, onJoinQingyunSect, onReceiveQingyunBasicTeaching, onAcceptSectAssignment, onPerformSectAssignment, onSettleSectAssignment, onAbandonSectAssignment, onAcceptQingyunMaster, onReceiveMasterGuidance, onCommitSectViolation, onBetrayQingyunSect, onCultivate, onPracticeTechnique }: AdultWorldExperienceProps) {
  const world = <WorldMapPanel
    state={state}
    onTravel={(destinationId) => onCommand({ type: 'travel', destinationId })}
    onFastTravel={(destinationId) => onCommand({ type: 'fast-travel', destinationId })}
    onExplore={onExplore}
    onEnterSecretRealm={() => onCommand({ type: 'secret-realm', action: 'enter' })}
    onEnterStrongTerritory={onEnterStrongTerritory}
    onJoinQingyunSect={onJoinQingyunSect}
    onReceiveQingyunBasicTeaching={onReceiveQingyunBasicTeaching}
    onAcceptSectAssignment={onAcceptSectAssignment}
    onPerformSectAssignment={onPerformSectAssignment}
    onSettleSectAssignment={onSettleSectAssignment}
    onAbandonSectAssignment={onAbandonSectAssignment}
    onAcceptQingyunMaster={onAcceptQingyunMaster}
    onReceiveMasterGuidance={onReceiveMasterGuidance}
    onCommitSectViolation={onCommitSectViolation}
    onBetrayQingyunSect={onBetrayQingyunSect}
  />

  const character = <CharacterPanel defaultExpanded state={state} onUnequip={(slot) => onCommand({ type: 'unequip-slot', slot })} />
  const inventory = state.inventory ? <InventoryPanel
    defaultExpanded
    state={state}
    onDrop={(itemId, quantity) => onCommand({ type: 'inventory-drop', itemId, quantity })}
    onEquip={(itemId) => onCommand({ type: 'equip-item', itemId })}
    onUseLifespanItem={(itemId) => onCommand({ type: 'use-lifespan-item', itemId })}
    onUseTreatment={(itemId, injuryId) => onCommand({ type: 'use-treatment-item', itemId, ...(injuryId ? { injuryId } : {}) })}
    onRecuperate={(days) => onCommand({ type: 'recuperate-days', days })}
  /> : undefined

  const cultivation = state.cultivation.practiceInitialized ? <>
    <CultivationPanel
      defaultExpanded
      state={state}
      onSelectTechnique={(techniqueId) => onCommand({ type: 'select-main-technique', techniqueId })}
      onChangeMainTechnique={(techniqueId) => onCommand({ type: 'change-main-technique', techniqueId })}
      onSetAuxiliaryTechnique={(techniqueId, enabled) => onCommand({ type: 'set-auxiliary-technique', techniqueId, enabled })}
      onPracticeTechnique={onPracticeTechnique}
      onCultivate={onCultivate}
    />
    <FoundationBreakthroughPanel state={state} onAttempt={(options) => onCommand({ type: 'attempt-foundation-breakthrough', usePozhangDan: options.usePozhangDan, useNingjiDan: options.useNingjiDan, spiritStoneInvestment: options.spiritStoneInvestment })} onRecuperate={(days) => onCommand({ type: 'recuperate-days', days })} />
    <GoldenCoreBreakthroughPanel state={state} onAttempt={(options) => onCommand({ type: 'attempt-golden-core-breakthrough', route: options.route, useBaoyuanDan: options.useBaoyuanDan, useCenturySpiritGinsengForRecovery: options.useCenturySpiritGinsengForRecovery, spiritStoneInvestment: options.spiritStoneInvestment })} />
  </> : undefined

  const assignment = state.sectProgress?.activeAssignment ? <SectAssignmentPanel state={state} onAccept={onAcceptSectAssignment} onPerform={onPerformSectAssignment} onSettle={onSettleSectAssignment} onAbandon={onAbandonSectAssignment} /> : undefined
  const chronicle = <ChroniclePanel defaultExpanded entries={state.chronicle} birthDay={state.identity.birthDay} />

  return <AdultWorldShell state={state} world={world} character={character} inventory={inventory} cultivation={cultivation} assignment={assignment} chronicle={chronicle} notice={notice} archiveCount={archiveCount} onOpenArchive={onOpenArchive} />
}
