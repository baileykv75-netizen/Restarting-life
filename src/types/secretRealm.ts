export type SecretRealmNodeId =
  | 'fissure-corridor'
  | 'seepage-herb-bed'
  | 'vein-guide-side-room'
  | 'vein-lock-gate'
  | 'vein-heart-chamber'

export type SecretRealmGateMethod = 'safe' | 'force'
export type SecretRealmEncounterState = 'unresolved' | 'victory' | 'death'

export type SecretRealmMaterialId =
  | 'green_dew_grass'
  | 'water_spirit_moss'
  | 'jade_marrow_fungus'
  | 'black_iron'
  | 'red_pattern_iron'
  | 'shattered_spirit_crystal'
  | 'rock_lizard_carapace'
  | 'rock_lizard_mineral_crystal'

export type SecretRealmMaterialCounts = Partial<Record<SecretRealmMaterialId, number>>

export interface SunkenVeinRewards {
  herbBed: SecretRealmMaterialCounts
  sideRoom: SecretRealmMaterialCounts
  core: SecretRealmMaterialCounts
  coreSpiritStones: number
}

export interface SunkenVeinChamberRuntime {
  anchorSublocationId: string
  discovered: boolean
  active: boolean
  currentNodeId: SecretRealmNodeId | null
  gateOpened: boolean
  gateMethod: SecretRealmGateMethod | null
  coreLockedBehindPlayer: boolean
  cleared: boolean
  nodeClaims: {
    herbBed: boolean
    sideRoom: boolean
    core: boolean
  }
  knowledge: {
    ventSequence: boolean
    mineIncidentEvidence: boolean
  }
  pendingMaterials: SecretRealmMaterialCounts
  rewards: SunkenVeinRewards
  encounter: SecretRealmEncounterState
}

export interface SecretRealmState {
  sunkenVeinChamber: SunkenVeinChamberRuntime
}

export type SecretRealmAction =
  | 'enter'
  | 'visit-herb-bed'
  | 'inspect-herb-bed'
  | 'visit-side-room'
  | 'inspect-side-room'
  | 'visit-gate'
  | 'return-corridor'
  | 'exit-outer'
  | 'open-gate-safe'
  | 'open-gate-force'
  | 'confirm-core-entry'
  | 'resolve-core-encounter'
  | 'vent-and-exit'
