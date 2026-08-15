import type { BirthSpiritRootDefinition, SpiritElement, SpiritRootDefinition } from '../types/content'

const ELEMENTS = [
  { id: 'metal', name: '金' },
  { id: 'wood', name: '木' },
  { id: 'water', name: '水' },
  { id: 'fire', name: '火' },
  { id: 'earth', name: '土' },
] as const

function combinations<T>(items: readonly T[], count: number, start = 0, prefix: readonly T[] = []): T[][] {
  if (prefix.length === count) return [[...prefix]]
  const results: T[][] = []
  for (let index = start; index < items.length; index += 1) {
    results.push(...combinations(items, count, index + 1, [...prefix, items[index]]))
  }
  return results
}

function rootMultiplier(count: number): number {
  if (count === 1) return 1.2
  if (count === 2) return 1.05
  if (count === 3) return 0.9
  if (count === 4) return 0.8
  return 0.7
}

function rootWeight(count: number): number {
  if (count === 1) return 2
  if (count === 2) return 3
  if (count === 3) return 2
  if (count === 4) return 1
  return 5
}

function createElementalRoot(combo: readonly (typeof ELEMENTS)[number][]): BirthSpiritRootDefinition {
  const count = combo.length
  const names = combo.map((entry) => entry.name).join('')
  const elements = combo.map((entry) => entry.id) as SpiritElement[]
  const id = count === 5 ? 'five' : `${count === 1 ? 'single' : count === 2 ? 'double' : count === 3 ? 'triple' : 'quad'}_${combo.map((entry) => entry.id).join('_')}`
  const name = count === 5 ? '五灵根' : `${names}${count === 1 ? '单灵根' : count === 2 ? '双灵根' : count === 3 ? '三灵根' : '四灵根'}`
  const description = count === 1
    ? `只具${names}灵根，对对应属性功法契合很高，修炼路线清晰。`
    : count === 2
      ? `兼具${names}两系灵根，两类功法都能较好适应，也可能契合特定组合传承。`
      : count === 3
        ? `兼具${names}三系灵根，属于常见可修资质，路线较宽但吐纳效率逊于单双灵根。`
        : count === 4
          ? `兼具${names}四系灵根，可以修行，但传统吐纳效率较低。`
          : '五行俱全，能修多种常见功法，但传统吐纳效率在常规灵根中最低。'

  return {
    id,
    name,
    weight: rootWeight(count),
    cultivationMultiplier: rootMultiplier(count),
    kind: 'elemental',
    elements,
    description,
    ruleTags: [`root:count:${count}`, ...elements.map((element) => `root:element:${element}`)],
  }
}

const ELEMENTAL_ROOTS = [1, 2, 3, 4, 5].flatMap((count) => combinations(ELEMENTS, count).map(createElementalRoot))

export const SPIRIT_ROOTS: readonly BirthSpiritRootDefinition[] = [
  {
    id: 'none',
    name: '无灵根',
    weight: 40,
    cultivationMultiplier: 0,
    kind: 'none',
    elements: [],
    description: '无法通过常规吐纳吸收灵气。没有保底仙缘，但极少数重大机缘仍可能改变资质。',
    ruleTags: ['root:none'],
  },
  ...ELEMENTAL_ROOTS,
  {
    id: 'thunder',
    name: '雷灵根',
    weight: 1,
    cultivationMultiplier: 1.22,
    kind: 'variant',
    elements: ['thunder'],
    description: '偏向爆发、速度与破坏，资质出众，但青霞地界对应功法比五行功法更难获得。',
    ruleTags: ['root:variant:thunder'],
  },
  {
    id: 'ice',
    name: '冰灵根',
    weight: 1,
    cultivationMultiplier: 1.2,
    kind: 'variant',
    elements: ['ice'],
    description: '偏向凝结、控制与持续压制，同样需要寻找真正契合的传承。',
    ruleTags: ['root:variant:ice'],
  },
  {
    id: 'wind',
    name: '风灵根',
    weight: 1,
    cultivationMultiplier: 1.2,
    kind: 'variant',
    elements: ['wind'],
    description: '偏向身法、速度与灵活运转，适合相关功法，但本地传承相对少见。',
    ruleTags: ['root:variant:wind'],
  },
]

export const LEGACY_BIRTH_SPIRIT_ROOTS = [
  { id: 'none', name: '无灵根', weight: 20, cultivationMultiplier: 0 },
  { id: 'five', name: '五灵根', weight: 30, cultivationMultiplier: 0.7 },
  { id: 'three', name: '三灵根', weight: 25, cultivationMultiplier: 0.9 },
  { id: 'double', name: '双灵根', weight: 15, cultivationMultiplier: 1.05 },
  { id: 'single', name: '单灵根', weight: 8, cultivationMultiplier: 1.2 },
  { id: 'special', name: '特殊灵根', weight: 2, cultivationMultiplier: 1.25 },
] as const satisfies readonly SpiritRootDefinition[]

const LEGACY_ONLY_ROOTS = LEGACY_BIRTH_SPIRIT_ROOTS.filter((root) => !SPIRIT_ROOTS.some((current) => current.id === root.id))

export function getSpiritRootById(id: string): SpiritRootDefinition | undefined {
  return SPIRIT_ROOTS.find((root) => root.id === id) ?? LEGACY_ONLY_ROOTS.find((root) => root.id === id)
}
