import { Play, Pause, RotateCcw, SkipForward, Loader2 } from 'lucide-react'
import { useLanguage } from '../i18n'

interface Props {
  playing: boolean
  loading: boolean
  onPlay: () => void
  onPause: () => void
  onReset: () => void
  onStep: () => void
  onFetch: () => void
  speed: number
  onSpeedChange: (v: number) => void
  step: number
  total: number
  totalReward?: number
  color: string
}

export default function PlayerControls({
  playing, loading, onPlay, onPause, onReset, onStep, onFetch,
  speed, onSpeedChange, step, total, totalReward, color,
}: Props) {
  const { t } = useLanguage()
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onFetch()}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : t('common.newEpisode')}
        </button>
        <button
          onClick={playing ? onPause : onPlay}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: color + '30', color }}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button onClick={onReset} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">
          <RotateCcw size={13} className="text-slate-400" />
        </button>
        <button onClick={onStep} disabled={playing} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50">
          <SkipForward size={13} className="text-slate-400" />
        </button>
      </div>

      {total > 0 && (
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>{t('common.step', { s: step, total })}</span>
            {totalReward !== undefined && (
              <span style={{ color }}>{t('common.reward')}: {totalReward.toFixed(1)}</span>
            )}
          </div>
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${total > 0 ? (step / total) * 100 : 0}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 w-10">{t('common.speed')}</span>
        <input
          type="range" min={1} max={30} value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="flex-1 h-1" style={{ accentColor: color }}
        />
        <span className="text-[10px] font-mono text-slate-400 w-8">{speed}×</span>
      </div>
    </div>
  )
}
