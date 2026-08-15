import type { EquipmentSlot, ItemQuality } from '../types/equipment'
import type { ItemDefinition } from '../types/inventory'

const QUALITY_LABELS: Record<ItemQuality, string> = { low: '下品', mid: '中品', high: '上品' }
const TIER_LABELS: Record<number, string> = { 1: '一阶', 2: '二阶', 3: '三阶', 4: '四阶', 5: '五阶', 6: '六阶', 7: '七阶', 8: '八阶', 9: '九阶' }
const SLOT_LABELS: Record<EquipmentSlot, string> = {
  'main-weapon': '主武器',
  armor: '护甲',
  'protective-artifact': '护身法器',
  'support-artifact': '辅助法器',
}

export function formatItemGrade(item: Pick<ItemDefinition, 'tier' | 'quality'>): string {
  if (!Number.isSafeInteger(item.tier) || (item.tier ?? 0) <= 0 || !item.quality) return '品阶未标定'
  return `${TIER_LABELS[item.tier!] ?? `${item.tier}阶`}${QUALITY_LABELS[item.quality]}`
}

export function formatEquipmentSlot(slot: EquipmentSlot): string {
  return SLOT_LABELS[slot]
}
