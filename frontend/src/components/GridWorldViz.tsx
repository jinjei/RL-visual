import { useMemo } from 'react'
import type { GridConfig } from '../types'

const DEFAULT_CELL = 64
const ARROW_DIRS = [
  { dx: 0, dy: -1 },  // up
  { dx: 1, dy: 0 },   // right
  { dx: 0, dy: 1 },   // down
  { dx: -1, dy: 0 },  // left
]

function heatColor(t: number): string {
  const stops: [number, number, number][] = [
    [15, 10, 80],
    [80, 18, 160],
    [180, 55, 110],
    [245, 130, 45],
    [252, 220, 30],
  ]
  t = Math.max(0, Math.min(1, t))
  const seg = t * (stops.length - 1)
  const i = Math.floor(seg)
  const f = seg - i
  const a = stops[Math.min(i, stops.length - 2)]
  const b = stops[Math.min(i + 1, stops.length - 1)]
  const r = Math.round(a[0] + f * (b[0] - a[0]))
  const g = Math.round(a[1] + f * (b[1] - a[1]))
  const bl = Math.round(a[2] + f * (b[2] - a[2]))
  return `rgb(${r},${g},${bl})`
}

interface Props {
  config: GridConfig
  agentPos?: [number, number]
  heatmap?: number[]
  policy?: number[]
  policyMap?: number[][]
  accentColor?: string
  showPolicy?: boolean
  showHeat?: boolean
  /** Constrain total SVG width; cell size is derived automatically */
  maxWidth?: number
  /** Show a green "S" marker on the start cell (used by the editor) */
  showStart?: boolean
  /** When set, cells become clickable for editing */
  editable?: boolean
  onCellClick?: (r: number, c: number) => void
}

export default function GridWorldViz({
  config,
  agentPos,
  heatmap,
  policy,
  policyMap,
  accentColor = '#3b82f6',
  showPolicy = true,
  showHeat = true,
  maxWidth,
  showStart = false,
  editable = false,
  onCellClick,
}: Props) {
  const { rows, cols, start, goal, walls, cliff_cells } = config

  // Adaptive cell size: shrink when grid is wider than maxWidth
  const CELL = maxWidth ? Math.min(DEFAULT_CELL, Math.floor(maxWidth / cols)) : DEFAULT_CELL
  const ARROW_LEN = Math.round(CELL * 0.28)
  const ARROW_BACK = Math.round(CELL * 0.10)

  const wallSet = useMemo(
    () => new Set(walls.map(([r, c]) => `${r},${c}`)),
    [walls]
  )
  const cliffSet = useMemo(
    () => new Set(cliff_cells.map(([r, c]) => `${r},${c}`)),
    [cliff_cells]
  )
  const [heatMin, heatMax] = useMemo(() => {
    if (!heatmap || heatmap.length === 0) return [0, 1]
    const valid = heatmap.filter(Number.isFinite)
    return [Math.min(...valid), Math.max(...valid)]
  }, [heatmap])

  const svgW = cols * CELL
  const svgH = rows * CELL

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ display: 'block', borderRadius: 8, border: '1px solid #2a2d3e' }}
    >
      <defs>
        <marker id="arrowhead-gw" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="white" fillOpacity={0.8} />
        </marker>
      </defs>

      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const key = `${r},${c}`
          const idx = r * cols + c
          const isWall = wallSet.has(key)
          const isCliff = cliffSet.has(key)
          const isGoal = r === goal[0] && c === goal[1]
          const isStart = r === start[0] && c === start[1]

          let fill = '#1a1d2e'
          if (isWall) fill = '#374151'
          else if (isCliff) fill = '#4c0519'
          else if (showHeat && heatmap) {
            const t = (heatmap[idx] - heatMin) / (heatMax - heatMin + 1e-8)
            fill = heatColor(t)
          }

          const cx = c * CELL + CELL / 2
          const cy = r * CELL + CELL / 2
          const iconSize = Math.max(10, Math.round(CELL * 0.22))

          return (
            <g key={key}>
              <rect
                x={c * CELL} y={r * CELL} width={CELL} height={CELL}
                fill={fill} stroke="#0f1117" strokeWidth={1}
                style={editable ? { cursor: 'pointer' } : undefined}
                onClick={editable && onCellClick ? () => onCellClick(r, c) : undefined}
              />

              {showStart && isStart && !isGoal && (
                <>
                  <circle cx={cx} cy={cy} r={CELL * 0.25} fill="#10b98140" stroke="#10b981" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                  <text x={cx} y={cy + iconSize * 0.4} textAnchor="middle" fontSize={iconSize} fill="#10b981" fontFamily="monospace" style={{ pointerEvents: 'none' }}>S</text>
                </>
              )}

              {isCliff && (
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={iconSize * 0.7} fill="#f87171" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                  cliff
                </text>
              )}

              {isGoal && (
                <>
                  <circle cx={cx} cy={cy} r={CELL * 0.25} fill={accentColor + '40'} stroke={accentColor} strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                  <text x={cx} y={cy + iconSize * 0.4} textAnchor="middle" fontSize={iconSize} style={{ pointerEvents: 'none' }}>★</text>
                </>
              )}

              {showPolicy && !isWall && !isCliff && !isGoal && policy && (
                <PolicyArrow
                  cx={cx} cy={cy}
                  action={policy[idx]}
                  probs={policyMap?.[idx]}
                  len={ARROW_LEN}
                  back={ARROW_BACK}
                />
              )}
            </g>
          )
        })
      )}

      {agentPos && (
        <g style={{ pointerEvents: 'none' }}>
          <circle
            cx={agentPos[1] * CELL + CELL / 2}
            cy={agentPos[0] * CELL + CELL / 2}
            r={CELL * 0.22}
            fill="white"
            fillOpacity={0.95}
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }}
          />
          <text
            x={agentPos[1] * CELL + CELL / 2}
            y={agentPos[0] * CELL + CELL / 2 + CELL * 0.08}
            textAnchor="middle"
            fontSize={Math.round(CELL * 0.28)}
          >
            🤖
          </text>
        </g>
      )}
    </svg>
  )
}

function PolicyArrow({
  cx, cy, action, probs, len, back,
}: {
  cx: number; cy: number; action: number; probs?: number[]; len: number; back: number
}) {
  const { dx, dy } = ARROW_DIRS[action]
  const opacity = probs ? 0.5 + 0.5 * probs[action] : 0.75
  return (
    <line
      x1={cx - dx * back} y1={cy - dy * back}
      x2={cx + dx * len} y2={cy + dy * len}
      stroke="white" strokeWidth={1.5} strokeOpacity={opacity}
      markerEnd="url(#arrowhead-gw)"
      style={{ pointerEvents: 'none' }}
    />
  )
}
