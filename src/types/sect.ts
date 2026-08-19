export type SectId = 'qingyun'
export type SectRank = 'service' | 'outer' | 'inner' | 'true'
export type QingyunJoinPath = 'regular-recruitment' | 'clan-recommendation' | 'steward-family' | 'mortal-service'

export interface SectMembershipState {
  sectId: SectId
  rank: SectRank
  joinedDay: number
  joinPath: QingyunJoinPath
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
