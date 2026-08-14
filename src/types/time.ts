export type Duration =
  | {
      type: 'fixed'
      days: number
    }
  | {
      type: 'range'
      minDays: number
      maxDays: number
    }

export interface ResolvedDuration {
  days: number
  rngState: number
}
