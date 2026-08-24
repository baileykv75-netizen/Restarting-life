import type { WorldLocationDefinition } from '../types/world'
import '../world-map-visual.css'

interface VisibleConnection {
  key: string
  from: WorldLocationDefinition
  to: WorldLocationDefinition
}

interface FogPoint {
  x: number
  y: number
}

interface WorldMapTerrainProps {
  connections: readonly VisibleConnection[]
  fogPoints: readonly FogPoint[]
}

function curvedRoute(from: WorldLocationDefinition, to: WorldLocationDefinition): string {
  const x1 = from.mapPosition.x
  const y1 = from.mapPosition.y
  const x2 = to.mapPosition.x
  const y2 = to.mapPosition.y
  const dx = x2 - x1
  const dy = y2 - y1
  const bend = Math.min(6, Math.max(1.8, Math.hypot(dx, dy) * 0.09))
  const normalX = dy === 0 && dx === 0 ? 0 : -dy / Math.max(1, Math.hypot(dx, dy))
  const normalY = dx === 0 && dy === 0 ? 0 : dx / Math.max(1, Math.hypot(dx, dy))
  const mx = (x1 + x2) / 2 + normalX * bend
  const my = (y1 + y2) / 2 + normalY * bend
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
}

function TreeCluster({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g className="terrain-tree-cluster" transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M0 4 L2.7 -1.8 L5.1 4 Z" />
    <path d="M4.4 5.2 L7.3 -1 L10.1 5.2 Z" />
    <path d="M8.7 4.3 L11.2 -.8 L13.5 4.3 Z" />
    <path d="M2.3 6.2 L5.5 .6 L8.4 6.2 Z" />
  </g>
}

export function WorldMapTerrain({ connections, fogPoints }: WorldMapTerrainProps) {
  return <svg className="world-map-terrain" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="map-paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#263027" />
        <stop offset=".48" stopColor="#222b24" />
        <stop offset="1" stopColor="#171f1b" />
      </linearGradient>
      <linearGradient id="map-valley" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#50684f" stopOpacity=".28" />
        <stop offset="1" stopColor="#263d31" stopOpacity=".08" />
      </linearGradient>
      <linearGradient id="map-water" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#73908c" stopOpacity=".46" />
        <stop offset="1" stopColor="#3f6865" stopOpacity=".24" />
      </linearGradient>
      <radialGradient id="map-fog">
        <stop offset="0" stopColor="#dce2d8" stopOpacity=".34" />
        <stop offset=".55" stopColor="#b8c1b8" stopOpacity=".18" />
        <stop offset="1" stopColor="#b8c1b8" stopOpacity="0" />
      </radialGradient>
      <filter id="map-soften" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.3" />
      </filter>
      <filter id="map-fog-blur" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="3.4" />
      </filter>
      <pattern id="map-grain" width="7" height="7" patternUnits="userSpaceOnUse">
        <circle cx="1.2" cy="1.3" r=".18" fill="#d8d0b9" opacity=".16" />
        <circle cx="5.6" cy="4.7" r=".12" fill="#111811" opacity=".28" />
        <path d="M0 6.4 L7 5.8" stroke="#d6cfb9" strokeWidth=".08" opacity=".1" />
      </pattern>
    </defs>

    <rect width="100" height="100" fill="url(#map-paper)" />
    <path className="terrain-valley" d="M28 18 C42 9 63 8 78 18 C87 29 88 44 81 56 C73 70 69 86 54 96 C41 91 33 80 29 65 C24 48 20 31 28 18Z" fill="url(#map-valley)" />

    <g className="terrain-mountains terrain-mountains-north">
      <path d="M34 14 L42 1.5 L49 13 L56 2 L64 15 L72 5 L80 19 L87 8 L96 22 L100 22 L100 0 L28 0Z" />
      <path d="M40 13 L42 4.8 L44.2 13 M53.5 13 L56 6 L58.5 13 M69.4 16 L72 9.3 L74.8 17 M84.3 17 L87 11.8 L89.4 19" />
    </g>
    <g className="terrain-mountains terrain-mountains-west">
      <path d="M0 13 L8 18 L12 27 L7 35 L15 44 L9 54 L14 64 L7 73 L12 82 L5 92 L0 95Z" />
      <path d="M4 21 L8 16 L12 29 M3 47 L9 38 L14 51 M2 69 L8 61 L13 73" />
    </g>
    <g className="terrain-mountains terrain-mountains-east">
      <path d="M100 17 L94 22 L91 31 L96 40 L90 49 L95 58 L89 69 L95 79 L91 90 L100 96Z" />
      <path d="M96 27 L92 21 L89 34 M97 51 L93 44 L89 56 M98 73 L94 65 L89 78" />
    </g>

    <g className="terrain-blackwind" filter="url(#map-soften)">
      <path d="M8 34 L14 21 L20 31 L25 19 L31 34 L29 47 L20 51 L10 45Z" />
      <path d="M9 41 L16 29 L20 39 L25 27 L30 42" />
    </g>

    <g className="terrain-beast-ridge">
      <path d="M35 12 C42 3 54 1 63 9 C70 14 72 20 67 25 C58 20 48 19 38 23 C34 20 33 16 35 12Z" />
      <path d="M38 16 L43 8 L47 16 L52 5 L57 16 L61 9 L66 18" />
    </g>

    <g className="terrain-rivers">
      <path d="M64 -3 C66 10 60 17 62 28 C64 40 57 47 58 58 C59 71 54 78 55 103" />
      <path d="M58 48 C48 51 40 48 31 53 C23 58 17 65 9 70" />
      <path d="M60 35 C70 37 75 42 82 50 C88 58 92 65 101 68" />
      <path d="M55 72 C65 72 72 76 79 83 C84 88 91 91 101 90" />
    </g>

    <g className="terrain-forest">
      <TreeCluster x={8} y={54} scale={1.25} />
      <TreeCluster x={17} y={57} scale={.9} />
      <TreeCluster x={29} y={37} scale={.8} />
      <TreeCluster x={70} y={33} scale={.85} />
      <TreeCluster x={77} y={22} scale={.78} />
      <TreeCluster x={73} y={48} scale={1.15} />
      <TreeCluster x={82} y={57} scale={.82} />
      <TreeCluster x={28} y={76} scale={.9} />
      <TreeCluster x={37} y={83} scale={.75} />
      <TreeCluster x={67} y={87} scale={.9} />
    </g>

    <g className="terrain-fields">
      <path d="M65 36 C72 34 78 36 83 41" />
      <path d="M64 39 C71 37 78 39 82 44" />
      <path d="M66 42 C72 40 77 42 80 46" />
      <path d="M31 67 C39 64 47 66 51 70" />
      <path d="M32 71 C39 68 46 70 49 74" />
      <path d="M37 88 C43 84 50 85 55 90" />
    </g>

    <g className="terrain-routes">
      {connections.map(({ key, from, to }) => <path key={key} d={curvedRoute(from, to)} />)}
    </g>

    <g className="terrain-fog" filter="url(#map-fog-blur)">
      {fogPoints.map((point, index) => <ellipse key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} rx="13" ry="9" fill="url(#map-fog)" />)}
      <ellipse cx="96" cy="13" rx="14" ry="13" fill="url(#map-fog)" />
      <ellipse cx="3" cy="94" rx="15" ry="12" fill="url(#map-fog)" />
    </g>

    <rect width="100" height="100" fill="url(#map-grain)" opacity=".55" />
    <path className="terrain-vignette" d="M0 0 H100 V100 H0 Z M3 4 V96 H97 V4 Z" fillRule="evenodd" />
  </svg>
}
