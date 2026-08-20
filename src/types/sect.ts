export type SectId = 'qingyun'
export type SectRank = 'service' | 'outer' | 'inner' | 'true'
export type QingyunJoinPath = 'regular-recruitment' | 'clan-recommendation' | 'steward-family' | 'mortal-service'
export type SectMembershipStatus = 'active' | 'ended'
export type SectExitReason = 'expelled' | 'betrayed'

export type QingyunMasterNpcId = 'qingyun_lin_zhaochuan' | 'qingyun_lu_qingyi'
export type SectMastershipStatus = 'active' | 'ended'
export type SectMastershipEndReason = 'expelled' | 'betrayed'

export interface SectMastershipState {
  masterNpcId: QingyunMasterNpcId
  acceptedDay: number
  status: SectMastershipStatus
  guidanceUsesRemaining: number
  endedDay?: number
  endedReason?: SectMastershipEndReason
}

export type SectViolationId =
  | 'inner_resource_trespass'
  | 'core_inheritance_trespass'
  | 'public_evil_practice'

export type SectViolationSeverity = 'light' | 'medium' | 'heavy'

export interface SectViolationRecord {
  violationId: SectViolationId
  severity: SectViolationSeverity
  worldDay: number
  actionLabel: string
  penaltyLabel: string
  contributionDelta: number
  spiritStoneDelta: number
  expelled: boolean
}

export interface SectMembershipState {
  sectId: SectId
  rank: SectRank
  joinedDay: number
  joinPath: QingyunJoinPath
  /** Pre-R26 schema-3 saves omit status and are treated as active. */
  status?: SectMembershipStatus
  endedDay?: number
  exitReason?: SectExitReason
  mastership?: SectMastershipState
  violations?: SectViolationRecord[]
}

export interface SectAccess {
  publicArea: true
  outerRegistry: boolean
  serviceArea: boolean
  basicInternalResources: boolean
  basicTeaching: boolean
  discipleCultivationArea: boolean
  affairsHallEntry: boolean
  innerResources: boolean
  trueInheritance: boolean
}

export type SectAssignmentId =
  | 'qingyun_lingxi_herb_collection'
  | 'qingyun_blackwind_patrol'
  | 'qingyun_qingxia_escort'
  | 'qingyun_greenback_cull'

export type SectAssignmentKind = 'herb' | 'patrol' | 'escort' | 'cull'
export type SectAssignmentStatus = 'accepted' | 'ready-to-settle'
export type SectAssignmentOutcome = 'settled' | 'abandoned'

export interface ActiveSectAssignment {
  assignmentId: SectAssignmentId
  acceptedDay: number
  status: SectAssignmentStatus
  progressDays: number
  objectiveCompletedDay?: number
}

export interface SectContributionRecord {
  assignmentId: SectAssignmentId
  outcome: SectAssignmentOutcome
  resolvedDay: number
  contributionDelta: number
}

export interface SectProgressState {
  contribution: number
  activeAssignment?: ActiveSectAssignment
  history: SectContributionRecord[]
}
