const SURNAMES = [
  '顾', '沈', '韩', '陆', '许', '林', '程', '苏', '江', '谢', '温', '周', '秦', '叶', '唐', '白',
] as const

const GIVEN_NAMES = [
  '长安', '清和', '景川', '云舟', '知远', '怀瑾', '行简', '昭宁',
  '清月', '明棠', '听雪', '照微', '知秋', '青禾', '晚晴', '若溪',
] as const

function stableHash(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function deriveCharacterName(runSeed: string): string {
  const first = stableHash(`surname:${runSeed}`) % SURNAMES.length
  const second = stableHash(`given:${runSeed}`) % GIVEN_NAMES.length
  return `${SURNAMES[first]}${GIVEN_NAMES[second]}`
}

export function getCharacterDisplayName(name: string, runSeed: string): string {
  return name.trim().length > 0 && name !== '未命名' ? name : deriveCharacterName(runSeed)
}
