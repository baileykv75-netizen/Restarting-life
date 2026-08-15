export type ExplorationDuration = 1 | 3 | 10

export type ExplorationStage = 'initial' | 'familiar' | 'deep' | 'surveyed'

export type RegionRisk = 'low' | 'manageable' | 'high' | 'extreme'

export interface RegionExplorationProgress {
  locationId: string
  exploredDays: number
}

export interface ExplorationState {
  locations: Record<string, RegionExplorationProgress>
}
