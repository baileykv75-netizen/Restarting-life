import type { ItemDefinition } from '../types/inventory'

export const BEAST_ITEM_DEFINITIONS = [
  { id: 'greenback_wolf_pelt', name: '青背狼皮', category: 'material', stackLimit: 1, slotCost: 2, tier: 1, quality: 'low', description: '完整剥取的青背狼皮，可用于轻甲与普通兽材交易。' },
  { id: 'greenback_wolf_fang', name: '青背狼牙', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'low' },
  { id: 'low_grade_beast_essence', name: '低阶妖兽精血', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'low' },
  { id: 'immature_beast_core', name: '未成熟妖核', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'low', description: '尚未完全成熟的一阶妖核，不能作为完整二阶妖丹使用。' },
  { id: 'redtail_fox_pelt', name: '赤尾狐皮', category: 'material', stackLimit: 1, slotCost: 2, tier: 1, quality: 'low' },
  { id: 'redtail_fox_tail_fur', name: '赤尾狐尾毛', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'low' },
  { id: 'ironhide_boar_hide', name: '铁甲猪厚皮', category: 'material', stackLimit: 2, slotCost: 2, tier: 1, quality: 'low' },
  { id: 'ironhide_boar_tusk', name: '铁甲猪獠牙', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'low' },
  { id: 'beast_bone', name: '妖兽骨料', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'low' },
  { id: 'bishui_venom_sac', name: '碧水蛇毒囊', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'low' },
  { id: 'bishui_snake_gall', name: '碧水蛇胆', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'low' },
  { id: 'bishui_snake_skin', name: '碧水蛇皮', category: 'material', stackLimit: 2, slotCost: 1, tier: 1, quality: 'low' },
  { id: 'red_maned_ape_tendon', name: '赤鬃山猿兽筋', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'mid' },
  { id: 'mature_first_tier_beast_core', name: '成熟一阶妖丹', category: 'material', stackLimit: 10, slotCost: 1, tier: 1, quality: 'high', description: '成熟的一阶妖丹，不能替代结丹所需的完整二阶妖丹。' },
  { id: 'cold_pool_python_scale', name: '寒潭鳞蟒二阶鳞皮', category: 'material', stackLimit: 4, slotCost: 2, tier: 2, quality: 'low' },
  { id: 'cold_pool_python_tendon', name: '寒潭鳞蟒蟒筋', category: 'material', stackLimit: 4, slotCost: 1, tier: 2, quality: 'low' },
  { id: 'cold_pool_python_cold_sac', name: '寒潭鳞蟒寒囊', category: 'material', stackLimit: 10, slotCost: 1, tier: 2, quality: 'low' },
  { id: 'azure_wolf_pelt', name: '独角苍狼皮', category: 'material', stackLimit: 1, slotCost: 2, tier: 2, quality: 'mid' },
  { id: 'azure_wolf_horn', name: '独角苍狼独角', category: 'material', stackLimit: 1, slotCost: 1, tier: 2, quality: 'high' },
] as const satisfies readonly ItemDefinition[]
