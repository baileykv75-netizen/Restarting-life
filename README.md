# Restarting Life

纯文字、规则驱动、不接入大模型 API 的修仙人生 Roguelike。

游戏设计与 V1 技术边界以 [`GAME_DESIGN_V1.md`](./GAME_DESIGN_V1.md) 为唯一功能基线。

## 当前开发阶段

**阶段 0：工程骨架**

本阶段只建立可运行、可测试的前端工程，不实现正式修仙玩法。

已包含：

- React + Vite + TypeScript
- Vitest
- `src/core`、`src/data`、`src/data/events`、`src/types`、`src/components`、`src/store` 目录骨架
- 最小页面入口
- 最小单元测试

## 环境要求

- Node.js >= 20.19
- npm

Vite 8 要求 Node.js 20.19+ 或 22.12+；项目以 `package.json` 中的 `engines` 为准。

## 本地运行

```bash
npm install
npm run dev
```

## 验收命令

```bash
npm run typecheck
npm test
npm run build
```

三个命令全部通过，阶段 0 才算验收完成。

## 目录约束

```text
src/
├─ core/        # 规则与游戏引擎，后续状态变化只能从这里发起
├─ data/        # 静态游戏内容与数值表
│  └─ events/   # 事件数据
├─ types/       # 核心类型
├─ components/  # UI 组件，不允许直接修改游戏规则状态
└─ store/       # 集中状态入口
```

目前这些目录中除阶段标记外没有正式游戏逻辑，这是刻意设计的。

## 下一阶段

阶段 1 只实现：

- `GameState`
- Seeded RNG
- 时间
- 寿元
- 最小修炼推进
- 死亡判定

在阶段 1 验收通过前，不加入正式剧情、宗门、灵根、天赋或事件内容。
