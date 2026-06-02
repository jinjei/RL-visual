import { useMemo } from 'react'
import { useEpisodePlayer } from '../components/useEpisodePlayer'
import GridWorldViz from '../components/GridWorldViz'
import CartPoleViz from '../components/CartPoleViz'
import TrainingCurve from '../components/TrainingCurve'
import PlayerControls from '../components/PlayerControls'
import { useLanguage } from '../i18n'
import type { GridConfig } from '../types'

const COLOR = '#3b82f6'

export default function DQNPage() {
  const { t } = useLanguage()
  const ENVS = [
    { id: 'gridworld', label: t('envTabs.gridworld') },
    { id: 'cartpole', label: t('envTabs.cartpole') },
  ]

  const { env, switchEnv, demo, training, loading, error,
    currentStep, playing, speed, setSpeed, play, pause, reset, stepForward, fetchDemo } =
    useEpisodePlayer('dqn', 'gridworld')

  const step = demo?.episode[Math.min(currentStep, (demo?.episode.length ?? 1) - 1)]
  const isGrid = env === 'gridworld'
  const config = demo?.env_config as GridConfig | undefined
  const heatmap = useMemo(() => demo?.q_map?.map((qs) => Math.max(...qs)), [demo])

  const archRows = [
    { label: 'Input', val: isGrid ? 'obs (2)' : 'state (4)', color: '#64748b' },
    { label: 'Linear', val: '→ 128, ReLU', color: COLOR },
    { label: 'Linear', val: '→ 128, ReLU', color: COLOR },
    { label: 'Output Q(s,·)', val: isGrid ? '→ 4 actions' : '→ 2 actions', color: '#fbbf24' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color: COLOR, background: COLOR + '20' }}>
          {t('dqn.chapter')}
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">{t('dqn.name')}</h1>
        <p className="text-slate-400 mt-1 max-w-2xl">{t('dqn.description')}</p>
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {isGrid ? t('envTabs.gridworld') + ' — Q-value heatmap' : t('envTabs.cartpole')}
            </p>
            {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-3">{error}</div>}
            {isGrid && config && 'rows' in config ? (
              <GridWorldViz config={config} agentPos={step?.state as [number, number]} heatmap={heatmap} policy={demo?.policy} accentColor={COLOR} />
            ) : !isGrid ? (
              <CartPoleViz state={step?.state as [number, number, number, number] ?? null}
                qValues={step?.q_values as [number, number] | undefined} color={COLOR} />
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">{t('common.clickToLoad')}</div>
            )}
          </div>

          <PlayerControls playing={playing} loading={loading} onPlay={play} onPause={pause}
            onReset={reset} onStep={stepForward} onFetch={fetchDemo} speed={speed}
            onSpeedChange={setSpeed} step={currentStep} total={demo?.episode.length ?? 0}
            totalReward={demo?.total_reward} color={COLOR} />
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('dqn.archTitle')}</p>
            <div className="text-xs font-mono space-y-1.5 text-slate-400">
              {archRows.map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-20 text-slate-600">{row.label}</span>
                  <span style={{ color: row.color }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('dqn.innovTitle')}</p>
            <div className="space-y-3 text-xs text-slate-400">
              <div><p className="font-semibold text-white mb-0.5">{t('dqn.replayTitle')}</p><p>{t('dqn.replayDesc')}</p></div>
              <div><p className="font-semibold text-white mb-0.5">{t('dqn.targetTitle')}</p><p>{t('dqn.targetDesc')}</p></div>
            </div>
          </div>

          {training && <TrainingCurve data={training} color={COLOR} title={t('common.trainingRewards')} />}
        </div>
      </div>

      <div className="mt-8 bg-card rounded-xl border border-border p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('dqn.evolutionTitle')}</p>
        <div className="grid grid-cols-3 gap-4 text-xs text-slate-400">
          {[
            { title: t('dqn.qtable.title'), icon: '📋', desc: t('dqn.qtable.desc') },
            { title: t('dqn.nnet.title'), icon: '🧠', desc: t('dqn.nnet.desc') },
            { title: t('dqn.tricks.title'), icon: '⚖️', desc: t('dqn.tricks.desc') },
          ].map((item) => (
            <div key={item.title}>
              <p className="font-semibold text-white mb-1">{item.icon} {item.title}</p>
              <p className="leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
