export type InjuryKind = 'light' | 'severe' | 'meridian'

export interface InjuryCondition {
  id: string
  kind: InjuryKind
  sourceId: string
  startedDay: number
  recoveryDay: number
}

export interface InjuryState {
  conditions: InjuryCondition[]
}
