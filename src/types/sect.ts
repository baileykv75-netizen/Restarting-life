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
