import type { AdultEntryDefinition, AdultEntryOptionDefinition } from '../types/adultEntry'

const option = (entry: AdultEntryOptionDefinition): AdultEntryOptionDefinition => entry

export const ADULT_ENTRY_DEFINITIONS = [
  {
    backgroundId: 'baishi_tenant',
    title: '白石村的十六岁',
    originLocationSeed: 'baishi_village',
    originLocationLabel: '白石村',
    hasRootText: '你有灵根，但白石村没有现成的功法和修炼资源。真正的门路仍在村外。',
    noRootText: '测灵结果已经明确：你没有普通吐纳所需的灵根。山外仍有修仙者，但那不是一条现成的路。',
    contextRules: [
      { requiresAnyFlags: ['childhood_saw_cultivator_signs', 'childhood_cultivator_rumor_confirmed'], requiresAnyTags: ['childhood:cultivator_contact'], text: '你小时候亲眼见过山里来的伤者，也知道“修士”并非说书人的故事。' },
      { requiresAnyTags: ['location_seed:known:qingstone_town'], text: '青石镇一直是村里人最常去的外部落脚点。' },
    ],
    options: [
      option({ id: 'baishi_keep_family_work', label: '先留在村里帮家里做活', description: '继续过白石村的日子，同时留意进山人和镇上的新消息。', resultText: '你没有急着离开白石村，先把家里的活接了下来。村外的机会仍在，但眼下你先立住自己的日子。', rootRequirement: 'any', startingLocationSeed: 'baishi_village', startingLocationLabel: '白石村', effects: [{ type: 'tag', tag: 'adult_path:baishi_family_work' }] }),
      option({ id: 'baishi_wait_qingyun_recruitment', label: '去青石镇打听青云宗招录', description: '你有灵根，先确认下一次招录何时出现；这只是机会，不代表已经入门。', resultText: '你决定先去青石镇问清青云宗招录的时间和规矩。能不能进宗门，要等真正参加招录后才知道。', rootRequirement: 'has-root', requiresAllTags: ['entry:sect_recruitment'], startingLocationSeed: 'qingstone_town', startingLocationLabel: '青石镇', accessSeed: 'qingyun_regular_recruitment', effects: [{ type: 'tag', tag: 'adult_path:seek_qingyun_recruitment' }] }),
      option({ id: 'baishi_work_blackwind_foothill', label: '跟熟人去黑风山脚讨生活', description: '从采药、短工和山脚路线开始接触外面的世界。没有灵根也能走这条路。', resultText: '你把黑风山脚当成成年后的第一处去向。那里有活计、有危险，也偶尔会出现村里解释不了的人和事。', rootRequirement: 'no-root', startingLocationSeed: 'blackwind_foothill', startingLocationLabel: '黑风山山脚', effects: [{ type: 'tag', tag: 'adult_path:blackwind_livelihood' }] }),
      option({ id: 'baishi_follow_cultivator_clues', label: '沿着旧线索继续找真正的修士', description: '从青石镇和进山人开始打听，不假定一定能得到功法或改变资质。', resultText: '你决定把小时候听过、见过的线索重新捡起来，从青石镇开始找真正懂修行的人。', rootRequirement: 'any', startingLocationSeed: 'qingstone_town', startingLocationLabel: '青石镇', accessSeed: 'wandering_cultivator_contact', effects: [{ type: 'tag', tag: 'adult_path:seek_cultivator_contact' }] }),
    ],
  },
  {
    backgroundId: 'blackwind_hunter',
    title: '山路已经走熟',
    originLocationSeed: 'baishi_village',
    originLocationLabel: '白石村 / 黑风山山脚',
    hasRootText: '你有灵根，也比多数同龄人更熟悉黑风山的路。仙道入口不在家门口，却可能从山野和招录中出现。',
    noRootText: '你没有灵根，但猎路、兽踪和山里的规矩都是真的本事。修仙社会离你并不远，却没有自动向你开门。',
    contextRules: [
      { requiresAnyFlags: ['childhood_unusual_tracks_reported'], relationshipAtLeast: { id: 'old_hunter', value: 1 }, text: '老猎人还记得你小时候报告过的异常兽踪，那条旧猎路至今没有被当成普通地方。' },
      { requiresAnyTags: ['route_seed:blackwind_foothill', 'childhood:tracked_unknown_beast'], text: '你已经不是第一次沿黑风山脚辨路、看痕迹。' },
    ],
    options: [
      option({ id: 'hunter_take_family_routes', label: '正式接下家里的猎路', description: '以黑风山山脚为主要活动范围，继续狩猎、采集并认识进山的人。', resultText: '你开始按成年人的身份接下猎路。山脚是你最熟悉的地方，也是你最容易碰见异常的地方。', rootRequirement: 'any', startingLocationSeed: 'blackwind_foothill', startingLocationLabel: '黑风山山脚', effects: [{ type: 'tag', tag: 'adult_path:hunter_routes' }] }),
      option({ id: 'hunter_seek_qingyun_recruitment', label: '暂时放下猎路，去问宗门招录', description: '凭灵根去争取一个正规入口，但仍要按青云宗的规则参加招录。', resultText: '你把进宗门当成眼下最明确的尝试，先去青石镇打听下一次招录。猎户出身不会替你免掉任何考核。', rootRequirement: 'has-root', requiresAllTags: ['entry:sect_recruitment'], startingLocationSeed: 'qingstone_town', startingLocationLabel: '青石镇', accessSeed: 'qingyun_regular_recruitment', effects: [{ type: 'tag', tag: 'adult_path:seek_qingyun_recruitment' }] }),
      option({ id: 'hunter_join_trade_escort', label: '跟皮货商和山客跑几趟商路', description: '没有灵根也能靠识路和胆量进入青石镇的商路圈。', resultText: '你没有把希望押在修行上，而是先靠认路和山里经验接商路上的活。', rootRequirement: 'no-root', startingLocationSeed: 'qingstone_town', startingLocationLabel: '青石镇', effects: [{ type: 'relationship', id: 'hide_trader', label: '青石镇皮货商', delta: 1 }, { type: 'tag', tag: 'adult_path:trade_escort' }] }),
      option({ id: 'hunter_follow_blackwind_anomaly', label: '继续盯着黑风山里那些异常', description: '从老猎人、兽踪和山野修士的活动里寻找线索，不保证一定有机缘。', resultText: '你决定把黑风山里的异常当成一条长期线索。它可能只是危险，也可能把你带到从前接触不到的人那里。', rootRequirement: 'any', startingLocationSeed: 'blackwind_foothill', startingLocationLabel: '黑风山山脚', accessSeed: 'blackwind_anomaly_contact', effects: [{ type: 'tag', tag: 'adult_path:blackwind_anomaly' }] }),
    ],
  },
  {
    backgroundId: 'qingstone_apothecary',
    title: '药铺门口就是商路',
    originLocationSeed: 'qingstone_town',
    originLocationLabel: '青石镇',
    hasRootText: '你有灵根，也知道普通药材中偶尔会混进修士真正要买的东西。怀生药铺的贸易链是你最现实的入口。',
    noRootText: '你没有灵根，但药材、采药人和修士顾客仍会从你面前经过。你可以进入修仙社会的外围，却不能靠普通吐纳开始修炼。',
    contextRules: [
      { requiresAnyFlags: ['childhood_knows_spirit_herb_trade', 'childhood_strange_herb_preserved'], text: '你小时候已经见过普通药材如何沿着怀生药铺的关系流向青霞坊。' },
      { requiresAnyTags: ['childhood_rumor:qingxia_market_trade'], text: '“灵溪谷”和“青霞坊”早已不是完全陌生的地名。' },
    ],
    options: [
      option({ id: 'apothecary_take_shop_work', label: '正式在药铺里做事', description: '把药材、采买和往来客人的门路先做熟。', resultText: '你开始按成年人的身份接药铺里的活。修士来不来不是你能决定的，但每一批货从哪里来、往哪里去，你会越来越清楚。', rootRequirement: 'any', startingLocationSeed: 'qingstone_town', startingLocationLabel: '青石镇', effects: [{ type: 'relationship', id: 'huaisheng_apothecary', label: '怀生药铺', delta: 1 }, { type: 'tag', tag: 'adult_path:apothecary_work' }] }),
      option({ id: 'apothecary_follow_qingxia_shipment', label: '争取跟一批灵药货去青霞坊', description: '有灵根后，你更有理由进入真正的修仙交易环境，但这不等于已经有功法。', resultText: '你决定顺着药材贸易链去青霞坊看看。那里有真正的修士和功法交易，但你仍要自己找到适合的入口。', rootRequirement: 'has-root', requiresAllTags: ['entry:spirit_herb_trade'], startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', accessSeed: 'qingxia_market_cultivation_contact', effects: [{ type: 'tag', tag: 'adult_path:qingxia_herb_trade' }] }),
      option({ id: 'apothecary_deepen_mortal_medicine', label: '先把凡俗医药和炮制学扎实', description: '没有灵根也能在药铺与采药人之间形成自己的本事和关系。', resultText: '你先把重心放在真正能学会的医药和炮制上。修仙者的药材仍会经过这里，但你不把它当成现成的修行资格。', rootRequirement: 'no-root', startingLocationSeed: 'qingstone_town', startingLocationLabel: '青石镇', effects: [{ type: 'tag', tag: 'adult_path:mortal_medicine' }] }),
      option({ id: 'apothecary_follow_gatherers', label: '跟熟悉的采药人多跑山路', description: '从白石村、山脚药材和采药圈继续扩大见闻。', resultText: '你决定把铺子外的药路也走熟。采药人知道的不全是仙道，但他们总比柜台后的人更早看见山里的变化。', rootRequirement: 'any', startingLocationSeed: 'qingstone_town', startingLocationLabel: '青石镇', effects: [{ type: 'relationship', id: 'herb_gatherers', label: '采药人', delta: 1 }, { type: 'tag', tag: 'adult_path:herb_gathering_network' }] }),
    ],
  },
  {
    backgroundId: 'linhe_martial_house',
    title: '武馆之外',
    originLocationSeed: 'linhe_county',
    originLocationLabel: '临河县',
    hasRootText: '你有灵根，凡俗武艺不再是唯一可能。武馆、镖局和商路里偶尔出现的修士，能把你带到真正的修行入口附近。',
    noRootText: '你没有灵根，但多年基本功没有因此作废。临河县的武馆与镖路本就能养活一个成年人。',
    contextRules: [
      { requiresAnyTags: ['skill_seed:mortal_spear_basics', 'skill_seed:mortal_sword_basics', 'skill_seed:multi_weapon_familiarity'], text: '你童年已经真正练过兵器，不是只在武馆门口看热闹。' },
    ],
    options: [
      option({ id: 'martial_join_escort_agency', label: '去镖局接正式差事', description: '先以凡俗武者身份进入商路，修士客户与远行机会会自然出现。', resultText: '你开始跟着镖局做正式差事。对普通人来说这是谋生，对你来说也是最现实的外部人脉。', rootRequirement: 'any', startingLocationSeed: 'linhe_county', startingLocationLabel: '临河县', effects: [{ type: 'relationship', id: 'escort_agency', label: '镇南镖局', delta: 1 }, { type: 'tag', tag: 'adult_path:escort_agency' }] }),
      option({ id: 'martial_seek_cultivator_recommendation', label: '争取接触能引荐修士的护送差事', description: '有灵根才值得真正追这条线；引荐只提供机会，不保证宗门身份。', resultText: '你决定借镖路和武馆的人脉寻找修士引荐。能不能被接纳，要等真正见到对方之后再说。', rootRequirement: 'has-root', requiresAllTags: ['entry:recommendation'], startingLocationSeed: 'linhe_county', startingLocationLabel: '临河县', accessSeed: 'cultivator_recommendation_opportunity', effects: [{ type: 'tag', tag: 'adult_path:seek_recommendation' }] }),
      option({ id: 'martial_commit_mortal_path', label: '继续把凡俗武艺练成吃饭的本事', description: '没有灵根就先走能走的路，武馆、护院与镖路都是真实生活。', resultText: '你没有把人生停在测灵结果上，而是继续练武、接活，把眼前能走的路走稳。', rootRequirement: 'no-root', startingLocationSeed: 'linhe_county', startingLocationLabel: '临河县', effects: [{ type: 'tag', tag: 'adult_path:mortal_martial' }] }),
      option({ id: 'martial_take_qingstone_route', label: '跟商队跑青石镇这条线', description: '先把活动范围从临河县扩到青石镇，沿商路接触更多外来人。', resultText: '你选了通往青石镇的商路。这里不会直接送你仙缘，但比一直留在武馆更容易碰到修仙社会的边缘。', rootRequirement: 'any', startingLocationSeed: 'qingstone_town', startingLocationLabel: '青石镇', effects: [{ type: 'tag', tag: 'adult_path:qingstone_trade_route' }] }),
    ],
  },
  {
    backgroundId: 'qingxia_loose_cultivator',
    title: '散修家的成年日子',
    originLocationSeed: 'qingxia_market',
    originLocationLabel: '青霞坊外围',
    hasRootText: '你从小就知道怎么分辨灵石、丹药和普通法器。现在有灵根，真正的问题不是“修仙是否存在”，而是先学什么、靠什么养得起修行。',
    noRootText: '你从小生活在修仙社会边缘，却没有常规吐纳所需的灵根。坊市仍是你的生活圈，但功法不会因为家里有人修炼就自动对你有效。',
    options: [
      option({ id: 'loose_help_family_business', label: '先跟着家里在坊市讨生活', description: '接触散修坪、商人和材料流转，先把家庭的日子稳住。', resultText: '你先留在家里的坊市生活圈中，接触来往散修和交易。修行与否都离不开真实的资源。', rootRequirement: 'any', startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', requiresAllTags: ['location_seed:known:qingxia_market'], effects: [{ type: 'tag', tag: 'adult_path:loose_family_livelihood' }] }),
      option({ id: 'loose_learn_family_method', label: '跟家里正式学《小周天吐纳法》', description: '利用家里已有的普通功法渠道开始入门；这里只记录获取与初步传授，不结算修为。', resultText: '家里把《小周天吐纳法》的基础行气次序正式教给了你。你有了可以开始练的普通功法，但修炼本身要等后续系统真正进行。', rootRequirement: 'has-root', requiresAllTags: ['birth_resource_seed:common_qi_method_access'], startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', accessSeed: 'family_basic_method', cultivationMethodSeed: 'xiaozhoutian_tuna', effects: [{ type: 'tag', tag: 'adult_path:family_method' }] }),
      option({ id: 'loose_take_market_work', label: '不碰功法，先在坊市找能做的活', description: '没有灵根也能做材料搬运、铺面帮工和普通交易，继续留在修仙社会外围。', resultText: '你没有把家里的功法当成自己的路，而是在坊市里找真正能做的差事。修士社会依旧离你很近。', rootRequirement: 'no-root', startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', effects: [{ type: 'tag', tag: 'adult_path:market_livelihood' }] }),
      option({ id: 'loose_seek_independent_route', label: '先在散修坪认识人，再决定下一步', description: '不急着绑定家传路线，先观察功法、队伍和散修的真实生计。', resultText: '你决定先把散修坪的人和规矩看清，再决定要不要沿家里的路走。这里机会不少，坑也不少。', rootRequirement: 'any', startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', accessSeed: 'loose_cultivator_network', effects: [{ type: 'tag', tag: 'adult_path:loose_network' }] }),
    ],
  },
  {
    backgroundId: 'xie_branch',
    title: '谢家旁支的去处',
    originLocationSeed: 'qingxia_market',
    originLocationLabel: '青霞坊',
    hasRootText: '你是谢家人，也有灵根。家传基础功法、符铺事务和青云宗渠道都存在，但旁支身份不会替你跳过家族规矩。',
    noRootText: '你仍然是谢家旁支，只是常规修炼路线对你关闭。商铺、材料、账目和家族关系依然是真实资源。',
    contextRules: [
      { requiresAnyTags: ['childhood:xie_talisman_practice'], text: '你小时候已经接触过基础符纹，至少知道符纸上的线条不是随手画出来的。' },
    ],
    options: [
      option({ id: 'xie_take_shop_duty', label: '先去谢氏符铺做家族事务', description: '从铺面、材料和客人开始承担旁支成年人的责任。', resultText: '你先接下谢氏符铺的一部分事务。这里能给你稳定的人脉和材料见闻，也会带来家族义务。', rootRequirement: 'any', requiresAllTags: ['birth_resource_seed:xie_shop_access'], startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', effects: [{ type: 'relationship', id: 'xie_elder', label: '谢家长辈', delta: 1 }, { type: 'tag', tag: 'adult_path:xie_shop' }] }),
      option({ id: 'xie_enter_family_training', label: '接受谢家的基础修炼安排', description: '使用家族已经存在的基础功法渠道；这里只落实资格与初步传授。', resultText: '谢家把旁支晚辈能接触的基础吐纳法正式交给了你。你获得了修炼入口，也同时进入家族资源与规矩之中。', rootRequirement: 'has-root', requiresAllTags: ['birth_resource_seed:xie_basic_qi_method_access'], startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', accessSeed: 'xie_family_training', cultivationMethodSeed: 'xie_basic_qi_method', effects: [{ type: 'tag', tag: 'adult_path:xie_family_training' }] }),
      option({ id: 'xie_seek_qingyun_channel', label: '请家族长辈帮你问青云宗招录', description: '家族关系能让你更早知道门路，但不会把你直接塞进外门。', resultText: '谢家长辈答应替你留意青云宗近期的招录与引荐机会。你拿到的是一条正规渠道，不是弟子身份。', rootRequirement: 'has-root', requiresAllTags: ['entry:qingyun_sect'], startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', accessSeed: 'qingyun_family_recommendation', effects: [{ type: 'relationship', id: 'xie_elder', label: '谢家长辈', delta: 1 }, { type: 'tag', tag: 'adult_path:xie_qingyun_channel' }] }),
      option({ id: 'xie_take_mortal_clan_role', label: '转去做账目、采买和铺面事务', description: '无灵根不等于离开家族，你可以走不依赖吐纳的成年岗位。', resultText: '你把成年后的重心放到家族的账目、采买和铺面事务上。谢家的身份仍在，只是你不占用修炼培养名额。', rootRequirement: 'no-root', startingLocationSeed: 'qingxia_market', startingLocationLabel: '青霞坊', effects: [{ type: 'tag', tag: 'adult_path:xie_mortal_role' }] }),
    ],
  },
  {
    backgroundId: 'lu_main_line',
    title: '陆家嫡系成年',
    originLocationSeed: 'lu_estate',
    originLocationLabel: '陆家庄 / 灵溪谷',
    hasRootText: '你有灵根，陆家的灵田、教习和基础功法都是真实优势。成年后你必须在家族培养与更外部的宗门道路之间作出第一步选择。',
    noRootText: '嫡系身份没有改变测灵结果。你仍有家族保护、教育和资源环境，但不能把灵田和功法渠道等同于自己的修为。',
    contextRules: [
      { requiresAnyTags: ['childhood:lu_spirit_field_practice'], text: '你童年已经在灵田里做过见习，知道家族资源并不是凭空出现的。' },
    ],
    options: [
      option({ id: 'lu_take_estate_duty', label: '先承担陆家庄的日常事务', description: '从灵田、药材与家族安排开始承担成年责任。', resultText: '你先留在陆家庄承担家族事务。灵溪谷的资源离你很近，但每一份使用权都有家族规则。', rootRequirement: 'any', startingLocationSeed: 'lu_estate', startingLocationLabel: '陆家庄', effects: [{ type: 'relationship', id: 'lu_instructor', label: '家族教习', delta: 1 }, { type: 'tag', tag: 'adult_path:lu_estate' }] }),
      option({ id: 'lu_enter_family_training', label: '按家族安排正式开始修炼', description: '使用陆家基础功法与培养环境；本轮只记录获取资格，不提前结算修炼。', resultText: '家族教习把陆家晚辈的基础修炼安排正式交给了你。你有了稳定的功法和训练入口，也进入家族考核与资源分配体系。', rootRequirement: 'has-root', requiresAllTags: ['birth_resource_seed:lu_basic_qi_method_access'], startingLocationSeed: 'lu_estate', startingLocationLabel: '陆家庄', accessSeed: 'lu_family_training', cultivationMethodSeed: 'lu_basic_qi_method', effects: [{ type: 'tag', tag: 'adult_path:lu_family_training' }] }),
      option({ id: 'lu_seek_qingyun_recruitment', label: '争取走青云宗的正规招录', description: '陆家背景让你更早接触消息，但仍要按宗门规则进入。', resultText: '你把目标放到青云宗的正规招录。陆家会提供必要的信息和引荐，但不会替宗门决定你是什么弟子。', rootRequirement: 'has-root', requiresAllTags: ['entry:qingyun_sect'], startingLocationSeed: 'lu_estate', startingLocationLabel: '陆家庄', accessSeed: 'qingyun_clan_recruitment', effects: [{ type: 'tag', tag: 'adult_path:lu_qingyun' }] }),
      option({ id: 'lu_take_mortal_steward_path', label: '转向庄务、运输和药材管理', description: '不占修炼培养名额，仍以嫡系身份参与家族真实产业。', resultText: '你开始接触庄务、运输和药材管理。没有灵根让道路变窄，但没有把你从陆家的现实生活里抹掉。', rootRequirement: 'no-root', startingLocationSeed: 'lu_estate', startingLocationLabel: '陆家庄', effects: [{ type: 'tag', tag: 'adult_path:lu_mortal_steward' }] }),
    ],
  },
  {
    backgroundId: 'qingyun_steward_family',
    title: '宗门边上的十六岁',
    originLocationSeed: 'qingyun_family_quarters',
    originLocationLabel: '青云宗外围家属区域',
    hasRootText: '你有灵根，也从小生活在宗门体系边缘。父母的人脉能让你进入正规流程，却不能把“执事后人”直接改成“外门弟子”。',
    noRootText: '你熟悉宗门生活，却没有常规修炼所需的灵根。青云宗仍提供大量凡俗与外围事务，但正式修士身份不是家属身份的延伸。',
    contextRules: [
      { requiresAnyTags: ['childhood:qingyun_sparring_observation'], text: '你小时候看过弟子真正切磋，知道宗门里的修炼并不是站在旁边看几次就能学会。' },
    ],
    options: [
      option({ id: 'qingyun_help_family_duties', label: '先跟着家里做宗门外围事务', description: '熟悉行馆、家属区和执事往来，不提前获得正式弟子身份。', resultText: '你先接下家里能安排的外围事务。你认识宗门里的人和地方，但身份仍然清楚：现在还不是正式弟子。', rootRequirement: 'any', startingLocationSeed: 'qingyun_family_quarters', startingLocationLabel: '青云宗外围家属区域', effects: [{ type: 'relationship', id: 'qingyun_steward_contact', label: '宗门执事熟人', delta: 1 }, { type: 'tag', tag: 'adult_path:qingyun_family_duties' }] }),
      option({ id: 'qingyun_enter_regular_recruitment', label: '按规矩参加青云宗正式招录', description: '你有灵根和家庭渠道，但仍从正式流程争取弟子身份。', resultText: '你登记参加青云宗的正式招录。家里能帮你弄清规矩，却不能替你拿到外门名额，更不会自动给你安排师父。', rootRequirement: 'has-root', requiresAllTags: ['entry:qingyun_regular_path'], startingLocationSeed: 'qingyun_family_quarters', startingLocationLabel: '青云宗外围家属区域', accessSeed: 'qingyun_regular_recruitment', effects: [{ type: 'tag', tag: 'adult_path:qingyun_recruitment' }] }),
      option({ id: 'qingyun_receive_basic_instruction', label: '先接受家里的《青元引气诀》启蒙', description: '只获得基础功法的初步传授渠道，不等于成为宗门弟子。', resultText: '家里先把《青元引气诀》的最基础吐纳次序教给了你。你获得了可用的入门功法渠道，但身份仍是执事家属。', rootRequirement: 'has-root', requiresAllTags: ['birth_resource_seed:qingyuan_method_access'], startingLocationSeed: 'qingyun_family_quarters', startingLocationLabel: '青云宗外围家属区域', accessSeed: 'qingyun_family_instruction', cultivationMethodSeed: 'qingyuan_yinqi', effects: [{ type: 'tag', tag: 'adult_path:qingyun_family_instruction' }] }),
      option({ id: 'qingyun_take_mortal_service', label: '去做不依赖修为的宗门外围差事', description: '仓储、运输、家属事务和凡俗协作都真实存在，不需要伪装成修士。', resultText: '你选择先做宗门外围的凡俗差事。这里离修士很近，却不会把没有灵根的人自动变成修士。', rootRequirement: 'no-root', startingLocationSeed: 'qingyun_family_quarters', startingLocationLabel: '青云宗外围家属区域', effects: [{ type: 'tag', tag: 'adult_path:qingyun_mortal_service' }] }),
    ],
  },
] as const satisfies readonly AdultEntryDefinition[]

export function getAdultEntryDefinitionByBackground(backgroundId: string): AdultEntryDefinition | undefined {
  return ADULT_ENTRY_DEFINITIONS.find((entry) => entry.backgroundId === backgroundId)
}

export function getAdultEntryOptionById(backgroundId: string, optionId: string): AdultEntryOptionDefinition | undefined {
  return getAdultEntryDefinitionByBackground(backgroundId)?.options.find((entry) => entry.id === optionId)
}
