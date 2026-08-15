export type EquipmentSlot = 'main-weapon' | 'armor' | 'protective-artifact' | 'support-artifact'
export type ItemQuality = 'low' | 'mid' | 'high'

export interface EquipmentState {
  mainWeaponItemId: string | null
  armorItemId: string | null
  protectiveArtifactItemId: string | null
  supportArtifactItemId: string | null
}
