import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { TrainingData } from '../types'
import { useLanguage } from '../i18n'

interface Props {
  data: TrainingData
  color: string
  title?: string
}

export default function TrainingCurve({ data, color, title }: Props) {
  const { t } = useLanguage()
  const chartData = data.smoothed.map((v, i) => ({
    ep: i,
    smoothed: v,
    raw: data.rewards[i],
  }))

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {(title || true) && (
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {title ?? t('common.trainingRewards')}
        </p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
          <XAxis
            dataKey="ep"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#2a2d3e' }}
            tickLine={false}
            label={{ value: t('common.episode'), position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 10 }}
          />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#2a2d3e' }} tickLine={false} width={42} />
          <Tooltip
            contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8', fontSize: 11 }}
            itemStyle={{ fontSize: 12 }}
            formatter={(v: number) => v.toFixed(2)}
          />
          <Line type="monotone" dataKey="raw" stroke={color} strokeOpacity={0.25} strokeWidth={1} dot={false} name={t('common.reward')} />
          <Line type="monotone" dataKey="smoothed" stroke={color} strokeWidth={2} dot={false} name="Smoothed" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
