export type PoisonFamily = 'bishui_venom'
export type PoisonSeverity = 'mild' | 'serious'

export interface PoisonCondition {
  family: PoisonFamily
  severity: PoisonSeverity
  appliedDay: number
  nextWorsenDay: number
}

export interface PoisonState {
  conditions: Record<string, PoisonCondition>
}
