import { useMemo } from 'react'
import { useEpisodePlayer } from '../components/useEpisodePlayer'
import GridWorldViz from '../components/GridWorldViz'
import CartPoleViz from '../components/CartPoleViz'
import TrainingCurve from '../components/TrainingCurve'
import PlayerControls from '../components/PlayerControls'
import { useLanguage } from '../i18n'
import type { GridConfig } from '../types'

const COLOR = '#8b5cf6'

export default function DuelingDQNPage() {
  const { t } = useLanguage()
  const ENVS = [
    { id: 'gridworld', label: t('envTabs.gridworld') },
    { id: 'cartpole', label: t('envTabs.cartpole') },
  ]

  const { env, switchEnv, demo, training, loading, error,
    currentStep, playing, speed, setSpeed, play, pause, reset, stepForward, fetchDemo } =
    useEpisodePlayer('dueling_dqn', 'gridworld')

  const step = demo?.episode[Math.min(currentStep, (demo?.episode.length ?? 1) - 1)]
  const isGrid = env === 'gridworld'
  const config = demo?.env_config as GridConfig | undefined

  const [valueHeatmap, qHeatmap] = useMemo(() => [
    demo?.value_map,
    demo?.q_map?.map((qs) => Math.max(...qs)),
  ], [demo])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color: COLOR, background: COLOR + '20' }}>
          {t('dueling_dqn.chapter')}
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">{t('dueling_dqn.name')}</h1>
        <p className="text-slate-400 mt-1 max-w-2xl">{t('dueling_dqn.description')}</p>
      </div>

      {/* Architecture pill */}
      <div className="mb-5 p-4 rounded-xl border border-border bg-card font-mono text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-400">{t('dueling_dqn.archLine')}</span>
          <div className="flex gap-3">
            <span className="px-2 py-1 rounded" style={{ background: '#f59e0b20', color: '#f59e0b' }}>V(s) head</span>
            <span className="text-slate-600">+</span>
            <span className="px-2 py-1 rounded" style={{ background: COLOR + '20', color: COLOR }}>A(s,a) head</span>
          </div>
          <span className="text-slate-400">→</span>
          <span className="px-2 py-1 rounded bg-white/10 text-white">{t('dueling_dqn.archCombine')}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {ENVS.map((e) => (
          <button key={e.id} onClick={() => switchEnv(e.id)}
            className="px-4 py-1.5 text-sm rounded-lg border transition-colors"
            style={env === e.id ? { borderColor: COLOR, color: COLOR, background: COLOR + '15' } : { borderColor: '#2a2d3e', color: '#64748b' }}>
            {e.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('dueling_dqn.envLabel')}</p>
            {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-3">{error}</div>}
            {isGrid && config && 'rows' in config ? (
              <GridWorldViz config={config} agentPos={step?.state as [number, number]} heatmap={qHeatmap} policy={demo?.policy} accentColor={COLOR} />
            ) : !isGrid ? (
              <CartPoleViz state={step?.state as [number, number, number, number] ?? null}
                qValues={step?.q_values as [number, number] | undefined} color={COLOR} />
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">{t('common.clickToLoad')}</div>
            )}
          </div>

          {isGrid && config && 'rows' in config && valueHeatmap && (
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('dueling_dqn.valueLabel')}</p>
              <GridWorldViz config={config} agentPos={undefined} heatmap={valueHeatmap} policy={undefined} accentColor={COLOR} showPolicy={false} />
              <p className="text-xs text-slate-500 mt-2">{t('dueling_dqn.valueDesc')}</p>
            </div>
          )}

          <PlayerControls playing={playing} loading={loading} onPlay={play} onPause={pause}
            onReset={reset} onStep={stepForward} onFetch={fetchDemo} speed={speed}
            onSpeedChange={setSpeed} step={currentStep} total={demo?.episode.length ?? 0}
            totalReward={demo?.total_reward} color={COLOR} />
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('dueling_dqn.legendTitle')}</p>
            {[
              { label: t('dueling_dqn.legendQLabel') },
              { label: t('dueling_dqn.legendVLabel') },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] text-slate-500 mb-1">{item.label}</p>
                <div className="h-3 rounded" style={{ background: 'linear-gradient(to right, rgb(15,10,80), rgb(252,220,30))' }} />
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                  <span>{t('common.low')}</span><span>{t('common.high')}</span>
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-500 leading-relaxed">{t('dueling_dqn.legendDesc')}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('dueling_dqn.whyTitle')}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{t('dueling_dqn.whyDesc')}</p>
          </div>

          {training && <TrainingCurve data={training} color={COLOR} title={t('common.trainingRewards')} />}
        </div>
      </div>
    </div>
  )
}
