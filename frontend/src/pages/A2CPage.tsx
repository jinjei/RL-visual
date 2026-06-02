import { useMemo } from 'react'
import { useEpisodePlayer } from '../components/useEpisodePlayer'
import GridWorldViz from '../components/GridWorldViz'
import Nav2DViz from '../components/Nav2DViz'
import TrainingCurve from '../components/TrainingCurve'
import PlayerControls from '../components/PlayerControls'
import { useLanguage } from '../i18n'
import type { GridConfig, NavConfig } from '../types'

const COLOR = '#f43f5e'

export default function A2CPage() {
  const { t } = useLanguage()
  const ENVS = [
    { id: 'gridworld', label: t('envTabs.gridworld') },
    { id: 'nav2d', label: t('envTabs.nav2d') },
  ]

  const { env, switchEnv, demo, training, loading, error,
    currentStep, playing, speed, setSpeed, play, pause, reset, stepForward, fetchDemo } =
    useEpisodePlayer('a2c', 'gridworld')

  const step = demo?.episode[Math.min(currentStep, (demo?.episode.length ?? 1) - 1)]
  const isGrid = env === 'gridworld'
  const gridConfig = isGrid ? demo?.env_config as GridConfig | undefined : undefined
  const navConfig = !isGrid ? demo?.env_config as NavConfig | undefined : undefined
  const trajectory = demo?.trajectory as [number, number][] | undefined

  const heatmap = useMemo(() => demo?.value_map, [demo])
  const policyMap = useMemo(() => demo?.policy_map, [demo])
  const policy = useMemo(() => {
    if (!policyMap) return undefined
    return policyMap.map((probs) => probs.indexOf(Math.max(...probs)))
  }, [policyMap])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color: COLOR, background: COLOR + '20' }}>
          {t('a2c.chapter')}
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">{t('a2c.name')}</h1>
        <p className="text-slate-400 mt-1 max-w-2xl">{t('a2c.description')}</p>
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
              {isGrid ? t('a2c.envLabel_grid') : t('a2c.envLabel_nav')}
            </p>
            {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-3">{error}</div>}
            {isGrid && gridConfig ? (
              <GridWorldViz config={gridConfig} agentPos={step?.state as [number, number]} heatmap={heatmap} policy={policy} policyMap={policyMap} accentColor={COLOR} />
            ) : !isGrid && navConfig && trajectory ? (
              <Nav2DViz config={navConfig} trajectory={trajectory} currentStep={currentStep} color={COLOR} />
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-500 text-sm">{t('common.clickToLoad')}</div>
            )}
          </div>

          <PlayerControls playing={playing} loading={loading} onPlay={play} onPause={pause}
            onReset={reset} onStep={stepForward} onFetch={fetchDemo} speed={speed}
            onSpeedChange={setSpeed} step={currentStep} total={demo?.episode.length ?? 0}
            totalReward={demo?.total_reward} color={COLOR} />
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('a2c.structTitle')}</p>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded bg-surface border border-border text-center">
                <span className="text-slate-400">State s</span>
              </div>
              <div className="text-center text-slate-600">↓ shared backbone</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded border text-center" style={{ borderColor: COLOR + '60', background: COLOR + '10' }}>
                  <p style={{ color: COLOR }} className="font-semibold">Actor</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">π(a|s)</p>
                </div>
                <div className="p-2 rounded border text-center" style={{ borderColor: '#f59e0b60', background: '#f59e0b10' }}>
                  <p className="text-amber-400 font-semibold">Critic</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">V(s)</p>
                </div>
              </div>
              <div className="p-2 rounded bg-surface border border-border text-center text-[10px] text-slate-400">
                {t('a2c.advantage')}
              </div>
            </div>
          </div>

          {step && (
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('q_learning.currentStep')}</p>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.value')}</span>
                  <span style={{ color: '#f59e0b' }}>{step.value?.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.reward')}</span>
                  <span className={step.reward >= 0 ? 'text-emerald-400' : 'text-red-400'}>{step.reward}</span>
                </div>
                {!isGrid && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('a2c.action_nav')}</span>
                    <span style={{ color: COLOR }}>
                      {Array.isArray(step.action) ? `[${(step.action as number[]).map(v => v.toFixed(2)).join(', ')}]` : step.action}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('a2c.legendTitle')}</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-3 rounded" style={{ background: 'linear-gradient(to right, rgb(15,10,80), rgb(252,220,30))' }} />
            </div>
            <p className="text-[10px] text-slate-500">{t('a2c.legendDesc')}</p>
          </div>

          {training && <TrainingCurve data={training} color={COLOR} title={t('common.trainingRewards')} />}
        </div>
      </div>
    </div>
  )
}
