interface Obstacle { cx: number; cy: number; r: number }
interface NavConfig {
  obstacles: Obstacle[]
  goal: { cx: number; cy: number; r: number }
  bounds: [number, number, number, number]
}

interface Props {
  config: NavConfig
  trajectory: [number, number][]
  currentStep: number
  color: string
}

const SZ = 380

function scale(v: number): number {
  return v * SZ
}

export default function Nav2DViz({ config, trajectory, currentStep, color }: Props) {
  const trail = trajectory.slice(0, currentStep + 1)
  const agent = trail[trail.length - 1]

  return (
    <svg
      width={SZ}
      height={SZ}
      style={{ display: 'block', borderRadius: 8, border: '1px solid #2a2d3e', background: '#0d0f1a' }}
    >
      {/* Grid lines */}
      {[0.2, 0.4, 0.6, 0.8].map((v) => (
        <g key={v}>
          <line
            x1={scale(v)} y1={0} x2={scale(v)} y2={SZ}
            stroke="#1e2337" strokeWidth={1}
          />
          <line
            x1={0} y1={scale(v)} x2={SZ} y2={scale(v)}
            stroke="#1e2337" strokeWidth={1}
          />
        </g>
      ))}

      {/* Goal zone */}
      <circle
        cx={scale(config.goal.cx)}
        cy={scale(1 - config.goal.cy)}
        r={scale(config.goal.r)}
        fill={color + '20'}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5 3"
      />
      <text
        x={scale(config.goal.cx)}
        y={scale(1 - config.goal.cy) + 5}
        textAnchor="middle"
        fontSize={16}
      >
        🎯
      </text>

      {/* Obstacles */}
      {config.obstacles.map((ob, i) => (
        <g key={i}>
          <circle
            cx={scale(ob.cx)}
            cy={scale(1 - ob.cy)}
            r={scale(ob.r)}
            fill="#1f0a0a"
            stroke="#7f1d1d"
            strokeWidth={1.5}
          />
          <circle
            cx={scale(ob.cx)}
            cy={scale(1 - ob.cy)}
            r={scale(ob.r) * 0.6}
            fill="#3b0f0f"
          />
        </g>
      ))}

      {/* Trail */}
      {trail.length > 1 && (
        <polyline
          points={trail
            .map(([x, y], i) => `${scale(x)},${scale(1 - y)}`)
            .join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeOpacity={0.6}
          strokeLinejoin="round"
        />
      )}

      {/* Trail dots */}
      {trail.slice(0, -1).map(([x, y], i) => (
        <circle
          key={i}
          cx={scale(x)}
          cy={scale(1 - y)}
          r={2}
          fill={color}
          fillOpacity={(i + 1) / trail.length * 0.5}
        />
      ))}

      {/* Agent */}
      {agent && (
        <g>
          <circle
            cx={scale(agent[0])}
            cy={scale(1 - agent[1])}
            r={10}
            fill="white"
            fillOpacity={0.9}
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.7))' }}
          />
          <circle
            cx={scale(agent[0])}
            cy={scale(1 - agent[1])}
            r={5}
            fill={color}
          />
        </g>
      )}

      {/* Start label */}
      <text x={8} y={SZ - 8} fontSize={10} fill="#475569" fontFamily="monospace">
        START
      </text>
    </svg>
  )
}
