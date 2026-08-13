import { PROJECT_STAGE } from './core/projectStage'

function App() {
  return (
    <main className="shell">
      <section className="card" aria-labelledby="project-title">
        <p className="eyebrow">RESTARTING LIFE</p>
        <h1 id="project-title">修仙人生重开模拟器</h1>
        <p className="status">当前阶段：{PROJECT_STAGE}</p>
        <p className="description">
          底层正在建立可复现的 GameState、随机数、时间、寿元、修炼与死亡规则；正式剧情仍未接入。
        </p>
      </section>
    </main>
  )
}

export default App
