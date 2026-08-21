import { useEffect, useState, type ReactNode } from 'react'
import { getWorldLocationById } from '../data/worldLocations'
import { getActiveInjuries } from '../core/injuryEngine'
import { getCharacterDisplayName } from '../core/nameEngine'
import { getActivePoisonConditions } from '../core/poisonEngine'
import type { GameState } from '../types/game'
import { formatAge, formatRealm } from '../ui/formatters'
import '../adult-shell-bridge.css'

type AdultDrawer = 'character' | 'inventory' | 'cultivation' | 'assignment' | 'chronicle'

interface AdultWorldShellProps {
  state: GameState
  world: ReactNode
  character: ReactNode
  inventory?: ReactNode
  cultivation?: ReactNode
  assignment?: ReactNode
  chronicle: ReactNode
  notice?: string | null
  archiveCount: number
  onOpenArchive: () => void
}

const DRAWER_TITLES: Record<AdultDrawer, string> = {
  character: '人物',
  inventory: '背包',
  cultivation: '修炼',
  assignment: '当前事务',
  chronicle: '此世记',
}

export function AdultWorldShell({ state, world, character, inventory, cultivation, assignment, chronicle, notice, archiveCount, onOpenArchive }: AdultWorldShellProps) {
  const [drawer, setDrawer] = useState<AdultDrawer | null>(null)
  const location = state.world.currentLocationId ? getWorldLocationById(state.world.currentLocationId) : undefined
  const displayName = getCharacterDisplayName(state.identity.name, state.runSeed)
  const injuries = getActiveInjuries(state)
  const poisons = getActivePoisonConditions(state)
  const healthLabel = poisons.some((poison) => poison.severity === 'serious') ? '重度中毒'
    : injuries.some((injury) => injury.kind === 'severe') ? '重伤'
      : poisons.length > 0 ? '中毒'
        : injuries.length > 0 ? '有伤'
          : '状态正常'

  useEffect(() => {
    if (!drawer) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawer(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawer])

  useEffect(() => { setDrawer(null) }, [state.world.currentLocationId])

  const drawerContent = drawer === 'character' ? character
    : drawer === 'inventory' ? inventory
      : drawer === 'cultivation' ? cultivation
        : drawer === 'assignment' ? assignment
          : drawer === 'chronicle' ? chronicle
            : null

  return <main className="adult-world-shell">
    <header className="adult-hud">
      <div className="adult-hud-identity">
        <strong>{displayName}</strong>
        <span>{location?.name ?? '行旅途中'}</span>
      </div>
      <div className="adult-hud-stats" aria-label="当前状态">
        <span>{formatRealm(state)}</span>
        <span>{formatAge(state.worldDay, state.identity.birthDay)}</span>
        <span>第 {state.worldDay} 日</span>
        <span>灵石 {state.resources.spiritStones}</span>
        <span className={healthLabel === '状态正常' ? '' : 'warning'}>{healthLabel}</span>
      </div>
      <button className="adult-archive-button" onClick={onOpenArchive} type="button">人生档案 · {archiveCount}</button>
    </header>

    <section className="adult-world-stage" aria-label="当前世界">{world}</section>
    {notice && <div className="adult-world-toast" role="status">{notice}</div>}

    <nav className="adult-bottom-nav" aria-label="常用功能">
      <button className={drawer === 'character' ? 'active' : ''} onClick={() => setDrawer(drawer === 'character' ? null : 'character')} type="button"><span>人</span><strong>人物</strong></button>
      {inventory && <button className={drawer === 'inventory' ? 'active' : ''} onClick={() => setDrawer(drawer === 'inventory' ? null : 'inventory')} type="button"><span>囊</span><strong>背包</strong></button>}
      {cultivation && <button className={drawer === 'cultivation' ? 'active' : ''} onClick={() => setDrawer(drawer === 'cultivation' ? null : 'cultivation')} type="button"><span>修</span><strong>修炼</strong></button>}
      {assignment && <button className={drawer === 'assignment' ? 'active' : ''} onClick={() => setDrawer(drawer === 'assignment' ? null : 'assignment')} type="button"><span>令</span><strong>事务</strong></button>}
      <button className={drawer === 'chronicle' ? 'active' : ''} onClick={() => setDrawer(drawer === 'chronicle' ? null : 'chronicle')} type="button"><span>记</span><strong>此世记</strong></button>
    </nav>

    {drawer && <div className="adult-drawer-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setDrawer(null) }}>
      <section className="adult-drawer" role="dialog" aria-modal="true" aria-label={DRAWER_TITLES[drawer]}>
        <header><div><span>此世问长生</span><h2>{DRAWER_TITLES[drawer]}</h2></div><button onClick={() => setDrawer(null)} type="button" aria-label="关闭">关闭</button></header>
        <div className="adult-drawer-body">{drawerContent}</div>
      </section>
    </div>}
  </main>
}
