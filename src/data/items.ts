import type { ItemDefinition } from '../types/inventory'

export const ITEM_DEFINITIONS = [
  { id: 'green_dew_grass', name: '青露草', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'water_spirit_moss', name: '水灵苔', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'jade_marrow_fungus', name: '玉髓芝', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'black_iron', name: '黑铁', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'red_pattern_iron', name: '赤纹铁', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'shattered_spirit_crystal', name: '碎灵晶', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'rock_lizard_carapace', name: '岩甲蜥背甲', category: 'material', stackLimit: 1, slotCost: 2 },
  { id: 'rock_lizard_mineral_crystal', name: '岩甲蜥矿性结晶', category: 'material', stackLimit: 10, slotCost: 1 },
  { id: 'small_storage_bag', name: '小型储物袋', category: 'storage-bag', stackLimit: 1, slotCost: 1, capacityBonus: 12 },
  { id: 'pozhang_dan', name: '破障丹', category: 'pill', stackLimit: 10, slotCost: 1, description: '用于大境界突破准备的丹药，每次正式筑基至多使用一枚。', ruleTags: ['breakthrough:foundation-modifier'] },
  { id: 'ningji_dan', name: '凝基丹', category: 'pill', stackLimit: 10, slotCost: 1, tier: 2, quality: 'low', description: '二阶下品筑基丹药，用于稳定丹田与经脉，不保证突破成功。', ruleTags: ['breakthrough:foundation-modifier', 'breakthrough:stabilize-foundation'] },
  { id: 'baoyuan_dan', name: '抱元丹', category: 'pill', stackLimit: 10, slotCost: 1, tier: 2, quality: 'high', description: '二阶上品结丹准备丹药，用于收束灵力与保护丹田，不保证结丹成功。', ruleTags: ['breakthrough:golden-core-modifier'] },
  { id: 'yanyuan_dan', name: '延元丹', category: 'pill', stackLimit: 10, slotCost: 1, tier: 2, quality: 'low', description: '二阶下品延寿丹。第一次服用可增加10年最大寿元，同一有效体系只生效一次。', ruleTags: ['lifespan:effect:yanyuan-dan'] },
  { id: 'century_spirit_ginseng', name: '百年灵参', category: 'material', stackLimit: 10, slotCost: 1, tier: 2, quality: 'mid', description: '完整百年药龄灵参。可用于延寿，也可作为高阶恢复准备；同一株只能选择一种用途。', ruleTags: ['lifespan:effect:century-spirit-ginseng', 'breakthrough:golden-core-recovery'] },
  { id: 'blackwind_earth_marrow', name: '黑风地髓', category: 'material', stackLimit: 10, slotCost: 1, tier: 2, quality: 'high', description: '黑风山深层旧灵脉形成的极稀有地脉精粹，第一次炼化可增加30年最大寿元。', ruleTags: ['lifespan:effect:blackwind-earth-marrow'] },
  { id: 'complete_second_tier_beast_core', name: '完整二阶妖丹', category: 'material', stackLimit: 10, slotCost: 1, description: '完整保存的二阶妖丹。首版只作为已冻结邪道结丹准备资源，不在R19新增掉落来源。', ruleTags: ['breakthrough:evil-golden-core-resource'] },
  { id: 'high_grade_beast_essence', name: '高品质妖兽精血', category: 'material', stackLimit: 10, slotCost: 1, description: '高品质妖兽精血。首版只作为已冻结邪道结丹准备资源，不在R19新增掉落来源。', ruleTags: ['breakthrough:evil-golden-core-resource'] },
  { id: 'qingfeng_sword', name: '青锋剑', category: 'weapon', stackLimit: 1, slotCost: 1, equipmentSlot: 'main-weapon', description: '标准、稳定、通用的基准兵器。', ruleTags: ['weapon:sword', 'combat:standard-baseline'] },
  { id: 'black_iron_greatsword', name: '黑铁重剑', category: 'weapon', stackLimit: 1, slotCost: 1, equipmentSlot: 'main-weapon', description: '节拍较慢、伤害较高，并具有天然护甲穿透倾向。', ruleTags: ['weapon:greatsword', 'combat:slow', 'combat:high-damage', 'combat:armor-penetration'] },
  { id: 'red_pattern_blade', name: '赤纹刀', category: 'weapon', stackLimit: 1, slotCost: 1, equipmentSlot: 'main-weapon', description: '火属性灵力驱动强招时更容易发挥爆发。', ruleTags: ['weapon:blade', 'element:fire', 'combat:fire-burst-hook'] },
  { id: 'green_bamboo_spirit_bow', name: '青竹灵弓', category: 'weapon', stackLimit: 1, slotCost: 1, equipmentSlot: 'main-weapon', description: '正常开战可争取一次远程先手，近身后普通攻击效率下降。', ruleTags: ['weapon:bow', 'combat:ranged-opening-hook', 'combat:melee-efficiency-penalty-hook'] },
  { id: 'black_iron_armor', name: '黑铁护甲', category: 'armor', stackLimit: 1, slotCost: 1, equipmentSlot: 'armor', description: '防御高，但会影响身法与逃跑。', ruleTags: ['armor:heavy', 'combat:high-defense-hook', 'mobility:penalty-hook'] },
  { id: 'green_wolf_soft_armor', name: '青狼软甲', category: 'armor', stackLimit: 1, slotCost: 1, equipmentSlot: 'armor', description: '防御略低，但不明显影响移动。', ruleTags: ['armor:light', 'combat:moderate-defense-hook', 'mobility:neutral-hook'] },
  { id: 'heart_guard_mirror', name: '护心镜', category: 'artifact', stackLimit: 1, slotCost: 1, equipmentSlot: 'protective-artifact', description: '遭遇重伤级攻击时可提供显著减伤，触发后需要恢复或修复。', ruleTags: ['artifact:protective', 'combat:severe-hit-mitigation-hook', 'artifact:cooldown-or-repair-hook'] },
  { id: 'spirit_suppressing_jade', name: '镇灵玉', category: 'artifact', stackLimit: 1, slotCost: 1, equipmentSlot: 'protective-artifact', description: '针对神识冲击与心神干扰提供防护。', ruleTags: ['artifact:protective', 'mind:resistance-hook', 'spirit-sense:defense-hook'] },
  { id: 'flowing_cloud_boots', name: '流云靴', category: 'artifact', stackLimit: 1, slotCost: 1, equipmentSlot: 'support-artifact', description: '帮助移动、逃跑与山野赶路。', ruleTags: ['artifact:support', 'mobility:travel-hook', 'mobility:flee-hook'] },
  { id: 'spirit_seeking_compass', name: '寻灵盘', category: 'artifact', stackLimit: 1, slotCost: 1, equipmentSlot: 'support-artifact', description: '探测附近明显灵气异常，只提供异常提示，不直接暴露隐藏坐标。', ruleTags: ['artifact:support', 'exploration:qi-anomaly-hook'] },
] as const satisfies readonly ItemDefinition[]

const ITEM_BY_ID = new Map<string, ItemDefinition>(ITEM_DEFINITIONS.map((item) => [item.id, item]))

export function getItemDefinition(itemId: string): ItemDefinition | undefined {
  return ITEM_BY_ID.get(itemId)
}
