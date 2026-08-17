import type { PoisonFamily } from '../types/poison'

export interface PoisonDefinition {
  family: PoisonFamily
  name: string
  worsenDays: number
  treatableByQingduSan: boolean
}

export const POISON_DEFINITIONS: Readonly<Record<PoisonFamily, PoisonDefinition>> = {
  bishui_venom: {
    family: 'bishui_venom',
    name: '碧水蛇毒',
    worsenDays: 10,
    treatableByQingduSan: true,
  },
}

export function getPoisonDefinition(family: PoisonFamily): PoisonDefinition {
  return POISON_DEFINITIONS[family]
}
