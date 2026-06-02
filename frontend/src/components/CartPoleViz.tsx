import { useEffect, useRef } from 'react'

interface Props {
  state: [number, number, number, number] | null  // [pos, vel, angle, ang_vel]
  qValues?: [number, number]
  color: string
}

const W = 480
const H = 220
const TRACK_Y = 160
const CART_W = 80
const CART_H = 28
const POLE_LEN = 110

export default function CartPoleViz({ state, qValues, color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, W, H)

    // Track
    ctx.strokeStyle = '#2a2d3e'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(20, TRACK_Y + CART_H / 2 + 2)
    ctx.lineTo(W - 20, TRACK_Y + CART_H / 2 + 2)
    ctx.stroke()

    // Track markers
    for (let x = 40; x < W - 20; x += 40) {
      ctx.strokeStyle = '#1e2337'
      ctx.beginPath()
      ctx.moveTo(x, TRACK_Y + CART_H / 2 + 2)
      ctx.lineTo(x, TRACK_Y + CART_H / 2 + 8)
      ctx.stroke()
    }

    if (!state) {
      ctx.fillStyle = '#475569'
      ctx.font = '14px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Click Run Episode to start', W / 2, H / 2)
      return
    }

    const [pos, , angle] = state
    // Map cart position [-2.4, 2.4] → canvas x
    const cartX = W / 2 + (pos / 2.4) * (W / 2 - CART_W)

    // Cart
    const cartGrad = ctx.createLinearGradient(cartX - CART_W / 2, TRACK_Y, cartX + CART_W / 2, TRACK_Y + CART_H)
    cartGrad.addColorStop(0, color + 'cc')
    cartGrad.addColorStop(1, color + '66')
    ctx.fillStyle = cartGrad
    ctx.beginPath()
    ctx.roundRect(cartX - CART_W / 2, TRACK_Y, CART_W, CART_H, 5)
    ctx.fill()

    // Wheels
    for (const wx of [cartX - CART_W / 3, cartX + CART_W / 3]) {
      ctx.fillStyle = '#374151'
      ctx.beginPath()
      ctx.arc(wx, TRACK_Y + CART_H, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4b5563'
      ctx.beginPath()
      ctx.arc(wx, TRACK_Y + CART_H, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Pole
    const pivotX = cartX
    const pivotY = TRACK_Y + 4
    const poleX = pivotX + POLE_LEN * Math.sin(angle)
    const poleY = pivotY - POLE_LEN * Math.cos(angle)

    const poleGrad = ctx.createLinearGradient(pivotX, pivotY, poleX, poleY)
    poleGrad.addColorStop(0, '#f97316')
    poleGrad.addColorStop(1, '#fbbf24')
    ctx.strokeStyle = poleGrad
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(pivotX, pivotY)
    ctx.lineTo(poleX, poleY)
    ctx.stroke()

    // Pivot point
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2)
    ctx.fill()

    // Pole tip
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(poleX, poleY, 4, 0, Math.PI * 2)
    ctx.fill()

    // Angle indicator
    ctx.fillStyle = '#64748b'
    ctx.font = '11px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`angle: ${(angle * 180 / Math.PI).toFixed(1)}°`, 12, 18)
    ctx.fillText(`pos: ${pos.toFixed(2)}`, 12, 34)
  }, [state, color])

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ borderRadius: 8, border: '1px solid #2a2d3e', display: 'block' }}
      />
      {qValues && (
        <div className="mt-2 flex gap-2">
          {['← Push Left', 'Push Right →'].map((label, i) => (
            <div key={i} className="flex-1 bg-card rounded-lg p-2 border border-border">
              <p className="text-[10px] text-slate-500 mb-1">{label}</p>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(100, (qValues[i] - Math.min(...qValues)) / (Math.max(...qValues) - Math.min(...qValues) + 1e-8) * 100))}%`,
                    backgroundColor: i === 0 ? '#f43f5e' : '#06b6d4',
                  }}
                />
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1">Q = {qValues[i].toFixed(3)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
