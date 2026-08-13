import type { Realm } from '../types/game'

export const QI_LAYER_THRESHOLD = 100
export const FOUNDATION_EARLY_TO_MIDDLE_THRESHOLD = 300
export const FOUNDATION_MIDDLE_TO_LATE_THRESHOLD = 400
export const GOLDEN_CORE_THRESHOLD = 500

export const REALM_CULTIVATION_FACTOR: Record<Realm, number> = {
  mortal: 0,
  qi: 1,
  foundation: 0.75,
  golden_core: 0,
}

export type BreakthroughId = 'qi_entry' | 'foundation' | 'golden_core'

export interface BreakthroughRule {
  id: BreakthroughId
  eventId: string
  fromRealm: Realm
  requiredStage: number
  requiredCultivation: number
  targetRealm: Realm
  targetStage: number
  baseChance: number
  durationMonths: number
  failureCultivationLoss: number
  failureConstitutionLoss: number
}

export const BREAKTHROUGH_RULES: readonly BreakthroughRule[] = [
  {
    id: 'qi_entry',
    eventId: 'breakthrough_qi_entry',
    fromRealm: 'mortal',
    requiredStage: 0,
    requiredCultivation: 0,
    targetRealm: 'qi',
    targetStage: 1,
    baseChance: 0.6,
    durationMonths: 1,
    failureCultivationLoss: 0,
    failureConstitutionLoss: 0,
  },
  {
    id: 'foundation',
    eventId: 'breakthrough_foundation',
    fromRealm: 'qi',
    requiredStage: 9,
    requiredCultivation: QI_LAYER_THRESHOLD,
    targetRealm: 'foundation',
    targetStage: 1,
    baseChance: 0.35,
    durationMonths: 6,
    failureCultivationLoss: 50,
    failureConstitutionLoss: 1,
  },
  {
    id: 'golden_core',
    eventId: 'breakthrough_golden_core',
    fromRealm: 'foundation',
    requiredStage: 3,
    requiredCultivation: GOLDEN_CORE_THRESHOLD,
    targetRealm: 'golden_core',
    targetStage: 0,
    baseChance: 0.25,
    durationMonths: 12,
    failureCultivationLoss: 100,
    failureConstitutionLoss: 1,
  },
]
