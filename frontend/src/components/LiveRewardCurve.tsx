import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { useLanguage } from '../i18n'

interface Props {
  /** Per-episode reward, downsampled. */
  curve: number[]
  totalEpisodes: number
  /** Episode of the frame currently on screen — draws a moving marker. */
  currentEpisode: number
  color: string
}

export default function LiveRewardCurve({ curve, totalEpisodes, currentEpisode, color }: Props) {
  const { t } = useLanguage()
  const n = curve.length
  const data = curve.map((v, i) => ({
    ep: Math.round((i / Math.max(n - 1, 1)) * totalEpisodes),
    reward: v,
  }))

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        {t('playground.rewardCurve')}
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
          <XAxis
            dataKey="ep" type="number" domain={[0, totalEpisodes]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#2a2d3e' }} tickLine={false}
            label={{ value: t('common.episode'), position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 10 }}
          />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#2a2d3e' }} tickLine={false} width={42} />
          <Tooltip
            contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ fontSize: 12 }}
            formatter={(v: number) => v.toFixed(1)}
          />
          <Line type="monotone" dataKey="reward" stroke={color} strokeWidth={2} dot={false} />
          <ReferenceLine x={currentEpisode} stroke="#ffffff" strokeOpacity={0.6} strokeDasharray="4 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
