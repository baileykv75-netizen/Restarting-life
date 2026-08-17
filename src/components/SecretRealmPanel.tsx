import { getSunkenVeinNodeLabel } from '../core/secretRealmEngine'
import type { GameState } from '../types/game'
import type { SecretRealmAction, SecretRealmMaterialId } from '../types/secretRealm'

interface SecretRealmPanelProps {
  state: GameState
  onAction: (action: SecretRealmAction) => void
  onStartCoreCombat: () => void
}

const MATERIAL_LABELS: Record<SecretRealmMaterialId, string> = {
  green_dew_grass: '青露草',
  water_spirit_moss: '水灵苔',
  jade_marrow_fungus: '玉髓芝',
  black_iron: '黑铁',
  red_pattern_iron: '赤纹铁',
  shattered_spirit_crystal: '碎灵晶',
  rock_lizard_carapace: '岩甲蜥背甲',
  rock_lizard_mineral_crystal: '岩甲蜥矿性结晶',
}

function encounterRiskText(state: GameState, safeGate: boolean): string {
  const { realm, stage } = state.cultivation
  if (realm === 'mortal') return '你没有正常修士的力量。进入核心后面对成年妖兽，几乎没有活下来的把握。'
  if (realm === 'foundation' || realm === 'golden_core') return '以你当前修为，成年岩甲蜥本身不是主要威胁，但核心区仍无法原路退出。'
  const base = stage <= 2 ? '危险极高' : stage <= 5 ? '风险明显' : '有较大把握'
  return `${base}。${safeGate ? '旧阵已经按泄压顺序开启，核心灵压相对稳定一些。' : '石门是强行开启的，核心灵压仍明显紊乱。'}`
}

export function SecretRealmPanel({ state, onAction, onStartCoreCombat }: SecretRealmPanelProps) {
  const runtime = state.secretRealm?.sunkenVeinChamber
  if (!runtime?.active || !runtime.currentNodeId) return null

  const node = runtime.currentNodeId
  const pending = Object.entries(runtime.pendingMaterials)
    .filter(([, count]) => Boolean(count))
    .map(([id, count]) => `${MATERIAL_LABELS[id as SecretRealmMaterialId]} ${count}`)

  if (runtime.cleared) {
    return <section className="story-card secret-realm-card">
      <p className="story-kicker">黑风山地下 · 已确认遗迹</p>
      <h2>沉脉石室</h2>
      <p className="story-text">核心已经泄压，外围能取走的东西也不会在本世重新长出来。石室仍在，但这里只剩已经确认过的旧设施和空下来的浅槽。</p>
      <div className="secret-realm-status"><span>状态</span><strong>核心已泄压 / 已取</strong></div>
      <button className="secondary-button secret-realm-wide" onClick={() => onAction('exit-outer')} type="button">离开石室，返回黑风山</button>
    </section>
  }

  return <section className="story-card secret-realm-card">
    <div className="secret-realm-heading"><div><p className="story-kicker">沉脉石室</p><h2>{getSunkenVeinNodeLabel(node)}</h2></div><span>{runtime.coreLockedBehindPlayer ? '核心区 · 无法原路退出' : '外围可退出'}</span></div>

    {node === 'fissure-corridor' && <>
      <p className="story-text">旧矿道尽头被断层切开，石壁后露出不同于矿工支护的青灰石面。地上散着碎裂晶屑，越往里走，灵气越不稳定。</p>
      <div className="secret-realm-actions">
        <button onClick={() => onAction('visit-herb-bed')} type="button"><strong>去渗水药圃</strong><span>{runtime.nodeClaims.herbBed ? '已经检查过' : '可检查其中残存的灵植'}</span></button>
        <button onClick={() => onAction('visit-side-room')} type="button"><strong>去引脉侧室</strong><span>{runtime.nodeClaims.sideRoom ? '已经检查过' : '查看残存引脉结构与矿材'}</span></button>
        <button onClick={() => onAction('visit-gate')} type="button"><strong>去锁脉石门</strong><span>{runtime.gateOpened ? '石门已经开启' : '门后灵压异常，并有大型爬行妖兽痕迹'}</span></button>
      </div>
      <button className="secondary-button secret-realm-wide" onClick={() => onAction('exit-outer')} type="button">从裂隙退出，返回黑风山</button>
    </>}

    {node === 'seepage-herb-bed' && <>
      <p className="story-text">几排浅槽早已破裂，地下水从石缝渗进来，反而让一小片灵植活到了现在。腐叶、苔藓和矿尘混在一起，需要花时间辨认还能取用的部分。</p>
      {runtime.nodeClaims.herbBed ? <p className="secret-realm-done">这里已经检查并采集过，本世不会再次刷新。</p> : <button className="primary-button secret-realm-wide" onClick={() => onAction('inspect-herb-bed')} type="button">检查并采集 · 需 1 天</button>}
      <button className="secondary-button secret-realm-wide" onClick={() => onAction('return-corridor')} type="button">回裂隙矿廊</button>
    </>}

    {node === 'vein-guide-side-room' && <>
      <p className="story-text">石墙上刻着连续沟槽，黑铁与赤纹铁嵌在槽口，几处晶体座仍会间歇亮起。这里不像住人的地方，更像一处维持地下灵气走向的旧设施。</p>
      {runtime.nodeClaims.sideRoom ? <p className="secret-realm-done">旧阵已经检查过。你记得其中仍可使用的泄压顺序。</p> : <button className="primary-button secret-realm-wide" onClick={() => onAction('inspect-side-room')} type="button">检查旧阵与可取材料 · 需 1 天</button>}
      <button className="secondary-button secret-realm-wide" onClick={() => onAction('return-corridor')} type="button">回裂隙矿廊</button>
    </>}

    {node === 'vein-lock-gate' && <>
      <p className="story-text">厚重石门后的灵压明显高于外围。门边石屑里能看见大型爬行妖兽留下的摩擦痕迹，残存阵纹则说明石门在有人通过后可能重新闭锁。</p>
      {!runtime.gateOpened ? <div className="secret-realm-actions">
        {runtime.knowledge.ventSequence && <button onClick={() => onAction('open-gate-safe')} type="button"><strong>按旧阵泄压顺序开启 · 需 1 天</strong><span>风险低于强行破门，但旧阵仍可能失效。</span></button>}
        <button className="danger-action" onClick={() => onAction('open-gate-force')} type="button"><strong>强行开启 · 需 1 天</strong><span>灵压异常，风险较高。</span></button>
      </div> : <div className="secret-realm-warning"><strong>进入前确认</strong><p>石门后的灵压明显比外侧紊乱。现存阵纹显示，通过后旧阵会重新闭合，未找到内侧泄压口前无法原路返回。门内还有大型爬行妖兽活动痕迹。继续进入，可能死在里面。</p><button className="danger-action confirm-core-button" onClick={() => onAction('confirm-core-entry')} type="button">确认进入脉心室</button></div>}
      <button className="secondary-button secret-realm-wide" onClick={() => onAction('return-corridor')} type="button">退回裂隙矿廊</button>
    </>}

    {node === 'vein-heart-chamber' && <>
      <p className="story-text">中央引脉石柱已经开裂，旧槽被碎灵晶撑开。墙角堆着脱落岩甲，另一侧能看见被石屑堵住的泄压孔。身后的石门已经重新落下。</p>
      {runtime.encounter === 'unresolved' && <div className="secret-realm-warning core-danger"><strong>成年岩甲蜥占据着核心区</strong><p>{encounterRiskText(state, runtime.gateMethod === 'safe')}</p><button className="danger-action confirm-core-button" onClick={onStartCoreCombat} type="button">迎战岩甲蜥</button></div>}
      {runtime.encounter === 'victory' && <><p className="secret-realm-done">核心危险已经处理。现在可以靠近泄压结构，并从侧面断层打开离开的路。</p><button className="primary-button secret-realm-wide" onClick={() => onAction('vent-and-exit')} type="button">完成泄压并从断层离开</button></>}
    </>}

    {pending.length > 0 && <div className="secret-realm-pending"><span>已收取 · R14 待接管</span><strong>{pending.join('、')}</strong></div>}
  </section>
}
