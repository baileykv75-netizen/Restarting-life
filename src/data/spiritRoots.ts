import type { SpiritRootDefinition } from '../types/content'

export const SPIRIT_ROOTS = [
  {
    id: 'none',
    name: '无灵根',
    weight: 20,
    cultivationMultiplier: 0,
  },
  {
    id: 'five',
    name: '五灵根',
    weight: 30,
    cultivationMultiplier: 0.7,
  },
  {
    id: 'three',
    name: '三灵根',
    weight: 25,
    cultivationMultiplier: 0.9,
  },
  {
    id: 'double',
    name: '双灵根',
    weight: 15,
    cultivationMultiplier: 1.05,
  },
  {
    id: 'single',
    name: '单灵根',
    weight: 8,
    cultivationMultiplier: 1.2,
  },
  {
    id: 'special',
    name: '特殊灵根',
    weight: 2,
    cultivationMultiplier: 1.25,
  },
] as const satisfies readonly SpiritRootDefinition[]

export function getSpiritRootById(id: string): SpiritRootDefinition | undefined {
  return SPIRIT_ROOTS.find((root) => root.id === id)
}
