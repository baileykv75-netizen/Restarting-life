import { PROJECT_STAGE } from './core/projectStage'

function App() {
  return (
    <main className="shell">
      <section className="card" aria-labelledby="project-title">
        <p className="eyebrow">RESTARTING LIFE</p>
        <h1 id="project-title">修仙人生重开模拟器</h1>
        <p className="status">当前阶段：{PROJECT_STAGE}</p>
        <p className="description">
          工程骨架已建立。正式游戏逻辑将在后续阶段按照 GAME_DESIGN_V1.md 逐步接入。
        </p>
      </section>
    </main>
  )
}

export default App
