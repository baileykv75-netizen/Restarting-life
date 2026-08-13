import { PROJECT_STAGE } from './core/projectStage'

function App() {
  return (
    <main className="shell">
      <section className="card" aria-labelledby="project-title">
        <p className="eyebrow">RESTARTING LIFE</p>
        <h1 id="project-title">修仙人生重开模拟器</h1>
        <p className="status">当前阶段：{PROJECT_STAGE}</p>
        <p className="description">
          出生系统正在接入：同一个 Seed 必须得到相同的出身、灵根、天赋与初始属性。
        </p>
      </section>
    </main>
  )
}

export default App
