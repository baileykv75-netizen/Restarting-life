import { describe, expect, it } from 'vitest'
import { BEAST_LOOT_DEFINITIONS } from '../data/beasts'
import { COMBAT_OPPONENTS } from '../data/combat'
import { getItemDefinition } from '../data/items'
import type { BeastId } from '../types/beast'
import type { GameState } from '../types/game'
import type { PersistentGame } from '../types/persistence'
import { loadPersistentGame, savePersistentGame, type StorageLike } from '../store/saveRepository'
import { applyGameAction } from './gameActionReducer'
import { createInitialGameState } from './gameState'
import { addItem, resolveInventoryInitialization } from './inventoryEngine'
import { materializeBeastEcology, getBeastPopulationKey, prepareBeastEncounter, resolveBeastLoot, resolveBeastLootAbandon, resolveBeastLootClaim, settleBeastVictory } from './beastEngine'
import { resolveApplyPoisonCondition } from './poisonEngine'
import { seedToState } from './rng'
import { advanceWorldTime } from './worldEngine'

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const BEAST_IDS: readonly BeastId[] = [
  'greenback_wolf', 'redtail_fox', 'ironhide_boar', 'bishui_snake',
  'rock_armored_lizard', 'red_maned_ape', 'cold_pool_scale_python', 'one_horned_azure_wolf',
]

function adultState(seed = 'r22', locationId = 'blackwind_mountain', stage = 1): GameState {
  const base = createInitialGameState({ runSeed: seed })
  let state: GameState = {
    ...base,
    lifeStage: 'adult',
    world: { currentLocationId: locationId },
    cultivation: { ...base.cultivation, realm: 'qi', stage },
  }
  const inventory = resolveInventoryInitialization(state)
  if (!inventory.applied) throw new Error(inventory.reason)
  return inventory.state
}

function start(state: GameState, opponentId: import('../types/combat').CombatOpponentId, contextTags?: import('../types/beast').BeastCombatContextTag[]) {
  const result = applyGameAction(state, { type: 'START_COMBAT', opponentId, source: 'field', ...(contextTags ? { contextTags } : {}) })
  if (!result.applied || !result.state.combat) throw new Error(result.reason)
  return result.state
}

function secretCoreState(seed = 'r22-secret'): GameState {
  const state = adultState(seed)
  return {
    ...state,
    secretRealm: {
      sunkenVeinChamber: {
        anchorSublocationId: 'sub:blackwind_mountain:1', discovered: true, active: true, currentNodeId: 'vein-heart-chamber', gateOpened: true,
        gateMethod: 'safe', coreLockedBehindPlayer: true, cleared: false,
        nodeClaims: { herbBed: false, sideRoom: true, core: false }, knowledge: { ventSequence: true, mineIncidentEvidence: false },
        pendingMaterials: {}, rewards: { herbBed: {}, sideRoom: {}, core: {}, coreSpiritStones: 8 }, encounter: 'unresolved',
      },
    },
  }
}

describe('R22 canonical beasts, loot and ecology', () => {
  it('contains all eight canonical beasts and preserves the C20 anchor values', () => {
    const beasts = Object.values(COMBAT_OPPONENTS).filter((opponent) => opponent.beast)
    expect(beasts.map((opponent) => opponent.beastId)).toEqual(expect.arrayContaining(BEAST_IDS))
    expect(beasts).toHaveLength(8)
    expect(COMBAT_OPPONENTS['greenback-wolf']).toMatchObject({ maxHP: 105, baseAttack: 12, armorReduction: 0 })
    expect(COMBAT_OPPONENTS['adult-rock-lizard']).toMatchObject({ maxHP: 155, baseAttack: 16, armorReduction: 0.22 })
    expect(COMBAT_OPPONENTS['red-maned-ape']).toMatchObject({ maxHP: 210, baseAttack: 26, armorReduction: 0.08 })
    expect(COMBAT_OPPONENTS['cold-pool-scale-python']).toMatchObject({ maxHP: 300, baseAttack: 46, armorReduction: 0.12 })
    expect(COMBAT_OPPONENTS['one-horned-azure-wolf']).toMatchObject({ maxHP: 340, baseAttack: 52, armorReduction: 0.1 })
  })

  it('keeps second-tier core resources exclusive to python and unique azure wolf loot definitions', () => {
    const sources = BEAST_IDS.filter((beastId) => BEAST_LOOT_DEFINITIONS[beastId].some((rule) => rule.itemId === 'complete_second_tier_beast_core'))
    expect(sources).toEqual(['cold_pool_scale_python', 'one_horned_azure_wolf'])
    expect(BEAST_LOOT_DEFINITIONS.red_maned_ape.some((rule) => rule.itemId === 'mature_first_tier_beast_core' && rule.chance === 0.25)).toBe(true)
    expect(BEAST_LOOT_DEFINITIONS.greenback_wolf.some((rule) => rule.itemId === 'immature_beast_core' && rule.chance === 0.1)).toBe(true)
  })

  it('resolves loot deterministically without spirit stones, equipment, or generic XP', () => {
    for (const beastId of BEAST_IDS) {
      const variant = beastId === 'cold_pool_scale_python' ? 'special' : beastId === 'one_horned_azure_wolf' ? 'unique' : 'strong'
      const first = resolveBeastLoot(beastId, variant, seedToState(`loot:${beastId}`))
      const second = resolveBeastLoot(beastId, variant, seedToState(`loot:${beastId}`))
      expect(second).toEqual(first)
      for (const itemId of Object.keys(first.items)) {
        expect(itemId).not.toMatch(/spirit.?stone|experience|xp/i)
        expect(['weapon', 'armor', 'artifact']).not.toContain(getItemDefinition(itemId)?.category)
      }
    }
  })

  it('only applies damaged-carcass reduction when the explicit context tag is supplied', () => {
    const normal = resolveBeastLoot('greenback_wolf', 'ordinary', seedToState('same-carcass'))
    const damaged = resolveBeastLoot('greenback_wolf', 'ordinary', seedToState('same-carcass'), ['damaged-carcass'])
    expect(normal.items.greenback_wolf_pelt).toBe(1)
    expect(damaged.items.greenback_wolf_pelt ?? 0).toBe(0)
    expect(damaged.items.greenback_wolf_fang).toBe(normal.items.greenback_wolf_fang)
  })

  it('reduces ordinary pressure only on a real kill and recovers by worldDay milestones up to baseline', () => {
    let state = start(adultState('r22-pressure', 'blackwind_mountain'), 'greenback-wolf')
    const key = getBeastPopulationKey('blackwind_mountain', 'greenback_wolf')
    expect(state.beastEcology?.populations[key]).toMatchObject({ pressure: 2, baseline: 2 })
    state = { ...state, combat: { ...state.combat!, opponent: { ...state.combat!.opponent, currentHP: 1 } } }
    state = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(state.beastEcology?.populations[key].pressure).toBe(1)
    expect(state.pendingBeastLoot).toBeDefined()
    state = resolveBeastLootAbandon(state).state
    state = advanceWorldTime(state, 60).state
    expect(state.beastEcology?.populations[key]).toMatchObject({ pressure: 2, baseline: 2 })
  })

  it('does not reduce ordinary pressure when the beast successfully escapes', () => {
    let state = start(adultState('r22-enemy-flee', 'blackwind_mountain'), 'greenback-wolf')
    const key = getBeastPopulationKey('blackwind_mountain', 'greenback_wolf')
    state = {
      ...state,
      combat: {
        ...state.combat!, rngState: 1,
        opponent: { ...state.combat!.opponent, currentHP: 24 },
      },
    }
    state = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(state.combat).toBeUndefined()
    expect(state.pendingBeastLoot).toBeUndefined()
    expect(state.beastEcology?.populations[key].pressure).toBe(2)
  })

  it('keeps a won battle won when the inventory cannot fit the corpse loot', () => {
    let state = adultState('r22-full-bag')
    state = addItem(state, 'rock_lizard_carapace', 6).state
    state = settleBeastVictory(state, {
      beastId: 'greenback_wolf', beastName: '青背狼', battleId: 'battle-full', locationId: 'blackwind_mountain', variant: 'ordinary',
    })
    const before = state.pendingBeastLoot
    const claim = resolveBeastLootClaim(state, 'greenback_wolf_pelt', 1)
    expect(claim.applied).toBe(false)
    expect(claim.reason).toBe('INVENTORY_CAPACITY_EXCEEDED')
    expect(claim.state.pendingBeastLoot).toEqual(before)
    expect(claim.state.beastEcology?.populations[getBeastPopulationKey('blackwind_mountain', 'greenback_wolf')].pressure).toBe(1)
  })

  it('claims pending loot atomically and cannot reclaim it after abandoning the remainder', () => {
    let state = settleBeastVictory(adultState('r22-claim'), {
      beastId: 'ironhide_boar', beastName: '铁甲猪', battleId: 'battle-claim', locationId: 'blackwind_mountain', variant: 'ordinary',
    })
    const tusks = state.pendingBeastLoot?.remaining.ironhide_boar_tusk ?? 0
    expect(tusks).toBe(2)
    const claimed = resolveBeastLootClaim(state, 'ironhide_boar_tusk', 1)
    expect(claimed.applied).toBe(true)
    expect(claimed.state.pendingBeastLoot?.remaining.ironhide_boar_tusk).toBe(1)
    state = resolveBeastLootAbandon(claimed.state).state
    expect(state.pendingBeastLoot).toBeUndefined()
    expect(resolveBeastLootClaim(state, 'ironhide_boar_tusk', 1).reason).toBe('NO_PENDING_BEAST_LOOT')
  })

  it('does not create generic rock-lizard loot for the existing sunken-vein-core reward path', () => {
    let state = secretCoreState()
    const started = applyGameAction(state, { type: 'START_COMBAT', opponentId: 'adult-rock-lizard', source: 'sunken-vein-core' })
    expect(started.applied).toBe(true)
    state = { ...started.state, combat: { ...started.state.combat!, opponent: { ...started.state.combat!.opponent, currentHP: 1 } } }
    state = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(state.secretRealm?.sunkenVeinChamber.encounter).toBe('victory')
    expect(state.pendingBeastLoot).toBeUndefined()
  })

  it('materializes cold-pool python presence deterministically and keeps unique truth separate from knowledge', () => {
    const first = materializeBeastEcology(adultState('r22-special-truth'))
    const second = materializeBeastEcology(adultState('r22-special-truth'))
    expect(second.beastEcology).toEqual(first.beastEcology)
    expect(first.beastEcology?.specialIndividuals.oneHornedAzureWolf).toMatchObject({ uniqueId: 'one_horned_azure_wolf', alive: true, lootClaimed: false })
    expect(first.knowledge.locations).not.toHaveProperty('one_horned_azure_wolf')

    const outcomes = new Set<boolean>()
    for (let index = 0; index < 40; index += 1) {
      outcomes.add(Boolean(materializeBeastEcology(adultState(`r22-python-${index}`)).beastEcology?.specialIndividuals.coldPoolScalePython.generated))
    }
    expect(outcomes).toEqual(new Set([true, false]))
  })

  it('makes unique azure-wolf death permanent, writes the life fact, and caps Beast Ridge wolf baseline at one', () => {
    let state = prepareBeastEncounter(adultState('r22-unique', 'beast_ridge'), 'greenback_wolf', 'beast_ridge').state
    const key = getBeastPopulationKey('beast_ridge', 'greenback_wolf')
    expect(state.beastEcology?.populations[key]).toMatchObject({ pressure: 2, baseline: 2 })
    const instanceId = state.beastEcology!.specialIndividuals.oneHornedAzureWolf.instanceId
    state = settleBeastVictory(state, {
      beastId: 'one_horned_azure_wolf', beastName: '独角苍狼', battleId: 'unique-battle', locationId: 'beast_ridge', variant: 'unique', instanceId,
    })
    expect(state.beastEcology?.specialIndividuals.oneHornedAzureWolf.alive).toBe(false)
    expect(state.beastEcology?.populations[key]).toMatchObject({ pressure: 1, baseline: 1 })
    expect(state.flags.killed_one_horned_azure_wolf).toBe(true)
    expect(state.chronicle.at(-1)?.title).toBe('斩杀独角苍狼')
    state = resolveBeastLootAbandon(state).state
    expect(state.beastEcology?.specialIndividuals.oneHornedAzureWolf.lootClaimed).toBe(true)
    expect(prepareBeastEncounter(state, 'one_horned_azure_wolf', 'beast_ridge').reason).toBe('ONE_HORNED_AZURE_WOLF_DEAD')
    expect(advanceWorldTime(state, 90).state.beastEcology?.populations[key].pressure).toBe(1)
  })

  it('keeps old states without beast ecology legal and deep-clones R22 runtime through save/reload', () => {
    expect(createInitialGameState({ runSeed: 'pre-r22' }).beastEcology).toBeUndefined()
    let state = settleBeastVictory(adultState('r22-save'), {
      beastId: 'greenback_wolf', beastName: '青背狼', battleId: 'save-battle', locationId: 'blackwind_mountain', variant: 'ordinary',
    })
    const persistent: PersistentGame = {
      schemaVersion: 3, phase: 'life', currentSession: { state, debugLog: [], pendingResult: null, pendingAction: null },
      pendingBirthSelection: null, archives: [], meta: { totalRuns: 1 },
    }
    const storage = new MemoryStorage()
    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)?.currentSession?.state
    expect(loaded?.beastEcology).toEqual(state.beastEcology)
    expect(loaded?.pendingBeastLoot).toEqual(state.pendingBeastLoot)
    expect(loaded?.beastEcology).not.toBe(state.beastEcology)
    expect(loaded?.pendingBeastLoot?.remaining).not.toBe(state.pendingBeastLoot?.remaining)
  })
})

describe('R22 beast combat integration', () => {
  it('telegraphs a movement special and allows binding to interrupt it', () => {
    let state = start(adultState('r22-bind'), 'ironhide-boar')
    state = {
      ...state,
      combat: {
        ...state.combat!, beat: 3,
        telegraph: { ...COMBAT_OPPONENTS['ironhide-boar'].specials![0] },
        opponent: { ...state.combat!.opponent, statuses: { boundUntilBeat: 3 } },
      },
    }
    const hp = state.combat!.player.currentHP
    state = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(state.combat?.player.currentHP).toBe(hp)
    expect(state.combat?.log.join(' ')).toContain('冲撞被打断')
    expect(state.combat?.opponentSpecialReadyBeat?.charge).toBe(6)
  })

  it('records Bishui venom only from a damaging venom strike and settles it after victory', () => {
    let state = start(adultState('r22-venom'), 'bishui-snake')
    state = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(state.combat?.pendingPoisonExposures?.bishui_venom ?? 0).toBe(0)
    expect(state.poison).toBeUndefined()

    state = {
      ...state,
      combat: { ...state.combat!, beat: 3, telegraph: { ...COMBAT_OPPONENTS['bishui-snake'].specials![0] } },
    }
    state = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(state.combat?.pendingPoisonExposures?.bishui_venom).toBe(1)
    expect(state.poison).toBeUndefined()

    state = { ...state, combat: { ...state.combat!, opponent: { ...state.combat!.opponent, currentHP: 1 } } }
    state = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(state.combat).toBeUndefined()
    expect(state.poison?.conditions.bishui_venom).toMatchObject({ severity: 'mild' })
  })

  it('settles Bishui exposure on player flee and snake flee, but does not extend a serious-poison deadline', () => {
    let playerFlee = start(adultState('r22-player-flee'), 'bishui-snake')
    playerFlee = { ...playerFlee, combat: { ...playerFlee.combat!, rngState: 1, pendingPoisonExposures: { bishui_venom: 1 } } }
    playerFlee = applyGameAction(playerFlee, { type: 'COMBAT_ACTION', action: { type: 'flee' } }).state
    expect(playerFlee.combat).toBeUndefined()
    expect(playerFlee.poison?.conditions.bishui_venom.severity).toBe('mild')

    let snakeFlee = start(adultState('r22-snake-flee'), 'bishui-snake')
    snakeFlee = {
      ...snakeFlee,
      combat: {
        ...snakeFlee.combat!, rngState: 1, pendingPoisonExposures: { bishui_venom: 1 },
        opponent: { ...snakeFlee.combat!.opponent, currentHP: 20 },
      },
    }
    snakeFlee = applyGameAction(snakeFlee, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(snakeFlee.combat).toBeUndefined()
    expect(snakeFlee.poison?.conditions.bishui_venom.severity).toBe('mild')

    let serious = adultState('r22-serious')
    serious = resolveApplyPoisonCondition(serious, 'bishui_venom').state
    serious = resolveApplyPoisonCondition(serious, 'bishui_venom').state
    const deadline = serious.poison!.conditions.bishui_venom.nextWorsenDay
    serious = start(serious, 'bishui-snake')
    serious = { ...serious, combat: { ...serious.combat!, rngState: 1, pendingPoisonExposures: { bishui_venom: 1 } } }
    serious = applyGameAction(serious, { type: 'COMBAT_ACTION', action: { type: 'flee' } }).state
    expect(serious.poison?.conditions.bishui_venom.nextWorsenDay).toBe(deadline)
  })

  it('does not write long-term poison after combat HP reaches zero', () => {
    let state = start(adultState('r22-poison-death'), 'bishui-snake')
    state = {
      ...state,
      combat: {
        ...state.combat!, pendingPoisonExposures: { bishui_venom: 1 },
        player: { ...state.combat!.player, currentHP: 1 },
      },
    }
    state = applyGameAction(state, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(state.status).toBe('dead')
    expect(state.poison).toBeUndefined()
  })

  it('applies cold-pool flee and armor context only when explicitly tagged', () => {
    const makePythonAvailable = (state: GameState) => {
      const materialized = materializeBeastEcology(state)
      return {
        ...materialized,
        beastEcology: {
          ...materialized.beastEcology!,
          specialIndividuals: {
            ...materialized.beastEcology!.specialIndividuals,
            coldPoolScalePython: {
              generated: true, instanceId: `${state.runId}:beast:cold_pool_scale_python`, alive: true, lootClaimed: false, lairCleared: false,
            },
          },
        },
      }
    }
    const base = makePythonAvailable({ ...adultState('r22-cold', 'lingxi_valley'), cultivation: { realm: 'foundation', stage: 4 } })
    let dry = start(base, 'cold-pool-scale-python')
    let wet = start(base, 'cold-pool-scale-python', ['cold-pool'])
    const dryFlee = import('./combatEngine').then(() => 0)
    void dryFlee
    const beforeDry = dry.combat!.opponent.currentHP
    const beforeWet = wet.combat!.opponent.currentHP
    dry = applyGameAction(dry, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    wet = applyGameAction(wet, { type: 'COMBAT_ACTION', action: { type: 'basic' } }).state
    expect(beforeDry - dry.combat!.opponent.currentHP).toBeGreaterThan(beforeWet - wet.combat!.opponent.currentHP)
  })
})
