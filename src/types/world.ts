export type WorldLocationType =
  | 'mortal-settlement'
  | 'cultivation-market'
  | 'sect'
  | 'clan-estate'
  | 'wilderness'
  | 'fixed-entry'

export type WorldDanger = 'safe' | 'low' | 'moderate' | 'high' | 'extreme'
export type QiDensity = 'none' | 'thin' | 'low' | 'medium' | 'high'

export interface WorldMapPosition {
  x: number
  y: number
}

export interface WorldLocationDefinition {
  id: string
  name: string
  type: WorldLocationType
  description: string
  danger: WorldDanger
  qiDensity: QiDensity
  adjacentLocationIds: readonly string[]
  activityTags: readonly string[]
  parentLocationId?: string
  mapPosition: WorldMapPosition
}
