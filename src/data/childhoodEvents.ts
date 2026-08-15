import type { ChildhoodEventDefinition } from '../types/childhood'

export const CHILDHOOD_EVENTS = [
  {
    id: 'baishi_harvest_shortfall', backgroundId: 'baishi_tenant', title: '收成不好', ageYears: 8,
    narrative: '这一年雨水来得不巧，村里的收成比往年差。家里把粮袋重新数了两遍，还是要省着吃。大人们忙着补田埂、找短工，孩子也不可能完全闲着。',
    choices: [
      { id: 'repair_fields', label: '跟着邻里去补田埂', days: 7, timeText: '需7天。', resultText: '你跟着大人们在田里忙了一周，至少学会了什么时候该堵水、什么时候该放水。', effects: [{ type: 'relationship', id: 'baishi_neighbors', label: '白石村邻里', delta: 1 }, { type: 'tag', tag: 'childhood:farm_labor' }] },
      { id: 'take_shortwork', label: '跟家里人去做短工', days: 5, timeText: '需5天。活很累。', resultText: '你第一次跟着家里人做了几天重活，也听见矿工说起黑风山里那些不能随便进的旧坑。', effects: [{ type: 'stat', stat: 'constitution', delta: 1 }, { type: 'flag', key: 'childhood_heard_mine_day_labor', value: true }] },
      { id: 'care_for_home', label: '留在家里照看家务', days: 7, timeText: '需7天。', resultText: '你把能做的家务接了下来，让父母可以腾出手去找活。', effects: [{ type: 'stat', stat: 'mentality', delta: 1 }, { type: 'flag', key: 'childhood_family_caretaking', value: true }] },
    ],
  },
  {
    id: 'baishi_injured_stranger', backgroundId: 'baishi_tenant', title: '山里来的伤者', ageYears: 12,
    narrative: '傍晚时，一个受伤的外乡人被人从村口扶了进来。他身上的衣料不像普通脚夫，腰间还挂着一只村里没人认得的小袋子。里正让孩子们别围得太近。',
    choices: [
      { id: 'fetch_water', label: '去叫大人，再端水过来', days: 1, timeText: '占去1天。', resultText: '你没有乱碰他的东西，只帮着跑腿。那人醒后很快离开，村里却多了几天关于“修士”的议论。', effects: [{ type: 'relationship', id: 'baishi_neighbors', label: '白石村邻里', delta: 1 }, { type: 'flag', key: 'childhood_saw_cultivator_signs', value: true }] },
      { id: 'help_bandage', label: '帮忙按住伤口、递药布', days: 1, timeText: '占去1天。', riskText: '对方来历不明。', resultText: '你近距离看见他伤口边缘残留着不像火烧的焦痕，也第一次确定山外确实有你不懂的手段。', effects: [{ type: 'stat', stat: 'mentality', delta: 1 }, { type: 'tag', tag: 'childhood:cultivator_contact' }] },
      { id: 'keep_distance', label: '听大人的话，不靠近', days: 0, resultText: '你没有上前，只把这件事记了下来。后来再听见“修士”二字时，你知道那不是说书人的故事。', effects: [{ type: 'flag', key: 'childhood_cultivator_rumor_confirmed', value: true }] },
    ],
  },
  {
    id: 'hunter_first_hunt', backgroundId: 'blackwind_hunter', title: '第一次跟猎', ageYears: 8,
    narrative: '家里第一次真正带你进山。路没有走多深，但要背水、看脚印、记风向，还得知道什么时候不能出声。大人说，山里最怕的不是没看见猎物，而是没看见危险。',
    choices: [
      { id: 'follow_close', label: '一路跟紧，学怎么下脚', days: 3, timeText: '需3天。', resultText: '你跟完了这趟短猎，脚底磨出了泡，也开始知道猎路和普通山路为什么不是一回事。', effects: [{ type: 'stat', stat: 'constitution', delta: 1 }, { type: 'tag', tag: 'skill_seed:hunting_practice' }] },
      { id: 'carry_traps', label: '帮着背陷阱，专心记路', days: 3, timeText: '需3天。', resultText: '你没碰上什么大猎物，却把山脚几处岔路和回程标记记得很牢。', effects: [{ type: 'relationship', id: 'old_hunter', label: '村中老猎人', delta: 1 }, { type: 'tag', tag: 'route_seed:blackwind_foothill' }] },
    ],
  },
  {
    id: 'hunter_wrong_tracks', backgroundId: 'blackwind_hunter', title: '不该出现的脚印', ageYears: 12,
    narrative: '一场小雨后，你在常走的猎路旁发现一串陌生脚印。它比狼印大，却又不像熊，附近两只旧陷阱都被从外面压坏了。同行的大人一时也说不准是什么。',
    insights: [
      { requiresAnyTags: ['talent_rule:exploration:trace_detection'], text: '你注意到几处脚印落点几乎一样深，留下它的东西动作很稳，不像受惊乱跑的野兽。' },
      { requiresAnyTags: ['talent_rule:risk:extra_warning'], text: '你越靠近那片折断的灌木，心里越觉得不该再往前。' },
    ],
    choices: [
      { id: 'mark_and_report', label: '记下位置，回去告诉老猎人', days: 1, timeText: '占去1天。', resultText: '你没有追进去。老猎人听完后让家里几天内都别走那条路。', effects: [{ type: 'relationship', id: 'old_hunter', label: '村中老猎人', delta: 1 }, { type: 'flag', key: 'childhood_unusual_tracks_reported', value: true }] },
      { id: 'track_from_distance', label: '只顺着痕迹再走一段', days: 1, timeText: '占去1天。', riskText: '可能碰上留下脚印的东西。', resultText: '你没有追到源头，却看见更深处几棵树的树皮被整片刮开。这不是普通野兽留下的痕迹。', effects: [{ type: 'stat', stat: 'spiritSense', delta: 1 }, { type: 'tag', tag: 'childhood:tracked_unknown_beast' }] },
      { id: 'leave_route', label: '立刻离开这条猎路', days: 0, resultText: '你当场转身，之后一段时间都绕开了这里。', effects: [{ type: 'flag', key: 'childhood_avoided_unknown_tracks', value: true }] },
    ],
  },
  {
    id: 'apothecary_strange_herb', backgroundId: 'qingstone_apothecary', title: '混进药材里的怪草', ageYears: 8,
    narrative: '一筐从山里收来的普通药材中混进了一株颜色发青的小草。父亲没有认出来，只说它的根须太完整，不像采药人随手割来的杂草，先别扔。',
    insights: [
      { requiresAnyTags: ['physique_rule:physique:herb', 'talent_rule:profession:herb_identification'], text: '你闻到叶片被掐开后有很淡的清凉气味，和旁边几味普通草药明显不同。' },
    ],
    choices: [
      { id: 'sort_carefully', label: '把整筐药重新分一遍', days: 2, timeText: '需2天。', resultText: '你把相似的草叶一株株分开，虽然仍叫不出那怪草的名字，却练熟了最基本的辨别办法。', effects: [{ type: 'tag', tag: 'skill_seed:herb_sorting' }, { type: 'stat', stat: 'comprehension', delta: 1 }] },
      { id: 'preserve_sample', label: '把怪草单独包好，等懂行的人来看', days: 1, timeText: '占去1天。', resultText: '药草被完整留了下来。几天后，怀生药铺的人专门过来看了一眼，没让你们把它当普通草药卖掉。', effects: [{ type: 'relationship', id: 'huaisheng_apothecary', label: '怀生药铺', delta: 1 }, { type: 'flag', key: 'childhood_strange_herb_preserved', value: true }] },
    ],
  },
  {
    id: 'apothecary_unusual_buyer', backgroundId: 'qingstone_apothecary', title: '出价异常的客人', ageYears: 12,
    narrative: '一个很少见的客人进店后，没有问常用药，反而把几样年份不足的山药材全部买走，给钱也干脆。父母明显比平时谨慎，收钱后没有多问一句。',
    choices: [
      { id: 'watch_trade', label: '留在柜台旁听这笔买卖', days: 1, timeText: '占去1天。', resultText: '你听懂的不多，只记住客人问过“灵溪谷”和“坊市分号”。这些词第一次和家里的药材生意连在一起。', effects: [{ type: 'relationship', id: 'huaisheng_apothecary', label: '怀生药铺', delta: 1 }, { type: 'tag', tag: 'childhood_rumor:qingxia_market_trade' }] },
      { id: 'ask_gatherer', label: '事后去问熟识的采药人', days: 1, timeText: '占去1天。', resultText: '采药人只说有些药不是给凡人治病用的，真正值钱的货会一路送到青霞坊。', effects: [{ type: 'relationship', id: 'herb_gatherers', label: '采药人', delta: 1 }, { type: 'flag', key: 'childhood_knows_spirit_herb_trade', value: true }] },
      { id: 'do_not_pry', label: '照常干活，不追问客人的来历', days: 0, resultText: '你没有追着问，只记住父母面对那客人时明显比平时更谨慎。', effects: [{ type: 'flag', key: 'childhood_saw_cultivator_customer', value: true }] },
    ],
  },
  {
    id: 'martial_formal_training', backgroundId: 'linhe_martial_house', title: '正式学武', ageYears: 8,
    narrative: '从这年起，家里不再只让你拿木棍玩。武馆教习把站桩、握兵器和基本步法一项项拆开教，练不好就重来，没有什么神奇招式。',
    choices: [
      { id: 'practice_spear', label: '先把长枪的基本架势练稳', days: 10, timeText: '需10天。', resultText: '十天里你反复练最基础的拦、拿、扎，没学什么绝招，手上却终于有了真正的兵器感。', effects: [{ type: 'stat', stat: 'constitution', delta: 1 }, { type: 'tag', tag: 'skill_seed:mortal_spear_basics' }] },
      { id: 'practice_sword', label: '先练剑的握持和步法', days: 10, timeText: '需10天。', resultText: '你从最笨的基本动作开始练，至少不再把剑当成一根锋利的木棍。', effects: [{ type: 'tag', tag: 'skill_seed:mortal_sword_basics' }, { type: 'relationship', id: 'martial_school', label: '武馆师门', delta: 1 }] },
      { id: 'try_weapons', label: '把刀枪剑弓都试一遍，再选顺手的', days: 12, timeText: '需12天。', resultText: '你换了几种兵器都能很快找到发力的感觉。教习没有让你贪多，只让你记住各自最基本的用法。', requiresAnyTags: ['talent_rule:combat:weapon_learning'], effects: [{ type: 'stat', stat: 'comprehension', delta: 1 }, { type: 'tag', tag: 'skill_seed:multi_weapon_familiarity' }] },
    ],
  },
  {
    id: 'martial_real_cultivator', backgroundId: 'linhe_martial_house', title: '真正的修士', ageYears: 12,
    narrative: '一支护送队在武馆歇脚时，同行有个不怎么说话的修士。馆主对他很客气。那人没有展示什么仙法，只在检查兵器时隔着两步把桌上的短刀摄到了手里。',
    choices: [
      { id: 'watch_quietly', label: '站在一旁看清他怎么做', days: 1, timeText: '占去1天。', resultText: '你没看懂灵力如何运转，却确认凡俗武艺之外确实还有另一套力量。', effects: [{ type: 'flag', key: 'childhood_saw_real_cultivator', value: true }] },
      { id: 'help_escort', label: '跟着家里人帮护送队收拾东西', days: 1, timeText: '占去1天。', resultText: '你没和那修士说上几句话，却和镖队的人混了个脸熟，也知道修士有时会随凡人商队一起走。', effects: [{ type: 'relationship', id: 'escort_agency', label: '镇南镖局', delta: 1 }, { type: 'tag', tag: 'childhood:cultivator_escort_contact' }] },
      { id: 'ask_teacher', label: '等人走后再问教习', days: 1, timeText: '占去1天。', resultText: '教习只告诉你，那是炼气修士，凡人武艺再好也不能把两者当成一回事。', effects: [{ type: 'relationship', id: 'martial_school', label: '武馆师门', delta: 1 }, { type: 'flag', key: 'childhood_knows_qi_cultivator_term', value: true }] },
    ],
  },
  {
    id: 'loose_first_root_test', backgroundId: 'qingxia_loose_cultivator', title: '第一次测灵', ageYears: 8, rootConfirmation: true,
    narrative: '坊市里的孩子迟早都要测一次灵根。家里把你带到熟识的修士那里，桌上只有测灵石、纸笔和一本登记册。结果不会因为谁家更有钱就改变。',
    choices: [
      { id: 'step_forward', label: '按规矩把手放上测灵石', days: 1, timeText: '占去1天。', resultText: '{root_result}家里把结果记了下来，从这天起谈到修炼时不会再把你的资质当成未知数。', effects: [{ type: 'flag', key: 'childhood_spirit_root_confirmed', value: true }] },
      { id: 'ask_meaning', label: '测完后问清这个结果意味着什么', days: 1, timeText: '占去1天。', resultText: '{root_result}你又追问了功法、灵石和修炼门槛，第一次知道“能不能修”和“能不能修得好”不是一回事。', effects: [{ type: 'relationship', id: 'family_cultivator_contact', label: '父母的散修熟人', delta: 1 }, { type: 'flag', key: 'childhood_understands_root_meaning', value: true }] },
    ],
  },
  {
    id: 'loose_family_short_on_stones', backgroundId: 'qingxia_loose_cultivator', title: '家里缺灵石', ageYears: 12,
    narrative: '这阵子家里接连有开销，灵石袋明显瘪了。父母把一件原本准备买的修炼用品放了回去。你第一次很具体地看见，修士也会因为手里没灵石而改计划。',
    choices: [
      { id: 'help_stall', label: '去熟人的摊位帮几天忙', days: 7, timeText: '需7天。', resultText: '你帮着看摊、搬货，赚到的不多，却把坊市里最普通的生意看了个大概。', effects: [{ type: 'spirit-stones', delta: 2 }, { type: 'relationship', id: 'family_cultivator_contact', label: '父母的散修熟人', delta: 1 }, { type: 'tag', tag: 'skill_seed:market_stall_work' }] },
      { id: 'sell_trinket', label: '把自己那件不常用的小物拿去卖', days: 1, timeText: '占去1天。', resultText: '东西卖得不贵，但确实换回了几枚灵石。你开始把“舍不得”和“现在用不用得上”分开算。', effects: [{ type: 'spirit-stones', delta: 3 }, { type: 'flag', key: 'childhood_sold_personal_item', value: true }] },
      { id: 'accept_less', label: '这次少领一些家里准备的修炼用品', days: 0, resultText: '你没有再争那份开销。家里的计划因此宽松了一点，你也记住了资源从来不是凭空来的。', effects: [{ type: 'stat', stat: 'mentality', delta: 1 }, { type: 'flag', key: 'childhood_learned_resource_scarcity', value: true }] },
    ],
  },
  {
    id: 'xie_root_registration', backgroundId: 'xie_branch', title: '测灵与登记', ageYears: 8, rootConfirmation: true,
    narrative: '谢家晚辈到了年纪都会统一测灵。负责登记的长辈把名字、父母支系和结果写进册子，之后能学什么、先接触什么，会参考这份记录，但不是一张纸替你把路走完。',
    choices: [
      { id: 'register', label: '按家里的规矩完成登记', days: 1, timeText: '占去1天。', resultText: '{root_result}谢家把结果正式记入族册，你也第一次拥有了明确的家族培养记录。', effects: [{ type: 'relationship', id: 'xie_elder', label: '谢家长辈', delta: 1 }, { type: 'flag', key: 'childhood_xie_root_registered', value: true }] },
      { id: 'ask_rules', label: '问清不同灵根会怎样安排基础学习', days: 1, timeText: '占去1天。', resultText: '{root_result}长辈没有许诺什么，只把家里现有的功法、符箓学习和青云宗渠道说得更清楚。', effects: [{ type: 'relationship', id: 'xie_elder', label: '谢家长辈', delta: 1 }, { type: 'flag', key: 'childhood_knows_xie_training_rules', value: true }] },
    ],
  },
  {
    id: 'xie_first_talisman', backgroundId: 'xie_branch', title: '第一次学符', ageYears: 12,
    narrative: '家里开始让你接触最基础的符纸和符墨。第一步不是画成一张能用的符，而是照着样本把线条、停笔和落笔顺序练得不出大错。',
    choices: [
      { id: 'copy_strokes', label: '照着样本反复练基础符纹', days: 5, timeText: '需5天。', resultText: '你画坏了不少废纸，但至少能看出几种最基础的笔路。', effects: [{ type: 'relationship', id: 'xie_elder', label: '谢家长辈', delta: 1 }, { type: 'tag', tag: 'skill_seed:talisman_basics' }] },
      { id: 'sort_failures', label: '帮忙整理别人画废的符纸', days: 3, timeText: '需3天。', resultText: '你把一叠废符按问题分开：断线、墨散、落笔错位。看失败品反而让你更容易记住哪里最常出错。', effects: [{ type: 'stat', stat: 'comprehension', delta: 1 }, { type: 'flag', key: 'childhood_recognizes_failed_talismans', value: true }] },
    ],
  },
  {
    id: 'lu_family_root_test', backgroundId: 'lu_main_line', title: '家族测灵', ageYears: 8, rootConfirmation: true,
    narrative: '陆家给这一批孩子测灵时，几位长辈都在场。灵田、丹药和教习都要花资源，所以结果会影响以后怎么培养，但家族也不会因为一次测灵就把所有资源立刻压在一个孩子身上。',
    choices: [
      { id: 'accept_record', label: '完成测灵，听长辈把结果记下', days: 1, timeText: '占去1天。', resultText: '{root_result}结果被写进家族名册，教习也从这天起知道该怎样安排你的基础课程。', effects: [{ type: 'relationship', id: 'lu_instructor', label: '家族教习', delta: 1 }, { type: 'flag', key: 'childhood_lu_root_registered', value: true }] },
      { id: 'ask_instructor', label: '测完后去问教习该先学什么', days: 1, timeText: '占去1天。', resultText: '{root_result}教习没有提前教你功法，只把灵根、吐纳和身体承受能力之间的关系解释了一遍。', effects: [{ type: 'relationship', id: 'lu_instructor', label: '家族教习', delta: 1 }, { type: 'flag', key: 'childhood_knows_lu_training_basis', value: true }] },
    ],
  },
  {
    id: 'lu_spirit_field_practice', backgroundId: 'lu_main_line', title: '灵田见习', ageYears: 12,
    narrative: '这一年你被安排跟着家里人去灵溪谷边的灵田做几天见习。没人让孩子碰贵重灵植，你们先学水路、界石、虫害和哪些地块不能随便踩。',
    choices: [
      { id: 'check_channels', label: '跟着教习检查水渠和界石', days: 5, timeText: '需5天。', resultText: '你把几条水路和田界走了一遍，也明白家族的灵田不是谁都能随便采东西的野地。', effects: [{ type: 'relationship', id: 'lu_instructor', label: '家族教习', delta: 1 }, { type: 'tag', tag: 'skill_seed:spirit_field_basics' }] },
      { id: 'record_plants', label: '负责把几块田的灵植情况记下来', days: 5, timeText: '需5天。', resultText: '你照着册子一项项记，开始分得清“长得慢”和“真的出了问题”不是一回事。', effects: [{ type: 'stat', stat: 'comprehension', delta: 1 }, { type: 'flag', key: 'childhood_lu_field_records', value: true }] },
      { id: 'watch_damage', label: '专门跟着看受损的那几株灵植', days: 5, timeText: '需5天。', resultText: '你看见家里人怎么判断虫咬、烂根和灵气不足，虽然还不会处理，至少知道该看哪里。', effects: [{ type: 'relationship', id: 'lu_foundation_elder', label: '陆家筑基长辈', delta: 1 }, { type: 'tag', tag: 'skill_seed:spirit_plant_observation' }] },
    ],
  },
  {
    id: 'qingyun_root_test', backgroundId: 'qingyun_steward_family', title: '宗门测灵', ageYears: 8, rootConfirmation: true,
    narrative: '住在宗门外围的孩子也会统一测灵。负责的人按名册一个个叫名字，执事后人和普通家属都用同一套测灵器具。父母在宗门做事，并不会改变石头上的反应。',
    choices: [
      { id: 'follow_queue', label: '排队上前，按流程完成测灵', days: 1, timeText: '占去1天。', resultText: '{root_result}结果被记进家属名册，但这还不等于你已经是青云宗弟子。', effects: [{ type: 'relationship', id: 'qingyun_steward_contact', label: '宗门执事熟人', delta: 1 }, { type: 'flag', key: 'childhood_qingyun_root_registered', value: true }] },
      { id: 'ask_entry', label: '事后问父母以后怎样才算正式入宗', days: 1, timeText: '占去1天。', resultText: '{root_result}你得到的答案很明确：有灵根只是门槛，执事后人也要走宗门自己的招录和培养规矩。', effects: [{ type: 'flag', key: 'childhood_knows_qingyun_entry_rules', value: true }, { type: 'relationship', id: 'qingyun_steward_contact', label: '宗门执事熟人', delta: 1 }] },
    ],
  },
  {
    id: 'qingyun_watch_sparring', backgroundId: 'qingyun_steward_family', title: '观看弟子切磋', ageYears: 12,
    narrative: '外院有一次公开切磋，你跟着家里人站在边上看。场上的弟子没有用真正拼命的手段，胜负更多来自步法、距离和谁先把对方逼得失去节奏。',
    choices: [
      { id: 'watch_footwork', label: '不看热闹，专门盯着两人的脚步', days: 1, timeText: '占去1天。', resultText: '你发现真正交手时，很多胜负在兵器碰到一起之前就已经由位置决定了。', effects: [{ type: 'flag', key: 'childhood_watched_qingyun_footwork', value: true }, { type: 'stat', stat: 'spiritSense', delta: 1 }] },
      { id: 'help_collect', label: '结束后帮同龄人收拾练习兵器', days: 1, timeText: '占去1天。', resultText: '你和几个宗门同龄子弟一起收拾场地，之后见面至少不再完全陌生。', effects: [{ type: 'relationship', id: 'qingyun_peer', label: '宗门同龄子弟', delta: 1 }, { type: 'tag', tag: 'childhood:qingyun_peer_contact' }] },
      { id: 'try_practice_weapon', label: '等场地空下来，借练习兵器把刚才的动作比一遍', days: 2, timeText: '需2天。', resultText: '你没有学会场上弟子的招式，但把几个动作的距离感摸得更清楚。', requiresAnyTags: ['talent_rule:combat:weapon_learning'], effects: [{ type: 'relationship', id: 'qingyun_peer', label: '宗门同龄子弟', delta: 1 }, { type: 'tag', tag: 'skill_seed:qinyun_sparring_observation' }] },
    ],
  },
] as const satisfies readonly ChildhoodEventDefinition[]

const CHILDHOOD_EVENT_MAP = new Map(CHILDHOOD_EVENTS.map((event) => [event.id, event]))

const EVENT_IDS_BY_BACKGROUND: Record<string, readonly [string, string]> = {
  baishi_tenant: ['baishi_harvest_shortfall', 'baishi_injured_stranger'],
  blackwind_hunter: ['hunter_first_hunt', 'hunter_wrong_tracks'],
  qingstone_apothecary: ['apothecary_strange_herb', 'apothecary_unusual_buyer'],
  linhe_martial_house: ['martial_formal_training', 'martial_real_cultivator'],
  qingxia_loose_cultivator: ['loose_first_root_test', 'loose_family_short_on_stones'],
  xie_branch: ['xie_root_registration', 'xie_first_talisman'],
  lu_main_line: ['lu_family_root_test', 'lu_spirit_field_practice'],
  qingyun_steward_family: ['qingyun_root_test', 'qingyun_watch_sparring'],
}

export function getChildhoodEventById(id: string): ChildhoodEventDefinition | undefined {
  return CHILDHOOD_EVENT_MAP.get(id)
}

export function getChildhoodEventIdsForBackground(backgroundId: string): readonly [string, string] | undefined {
  return EVENT_IDS_BY_BACKGROUND[backgroundId]
}
