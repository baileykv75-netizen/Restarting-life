export type InjuryKind = 'light' | 'severe' | 'meridian'

export interface InjuryCondition {
  id: string
  kind: InjuryKind
  sourceId: string
  startedDay: number
  recoveryDay: number
  treatmentKeys?: string[]
}

export interface InjuryState {
  conditions: InjuryCondition[]
}
