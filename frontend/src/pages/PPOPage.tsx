import { useMemo } from 'react'
import { useEpisodePlayer } from '../components/useEpisodePlayer'
import GridWorldViz from '../components/GridWorldViz'
import Nav2DViz from '../components/Nav2DViz'
import TrainingCurve from '../components/TrainingCurve'
import PlayerControls from '../components/PlayerControls'
import { useLanguage } from '../i18n'
import type { GridConfig, NavConfig } from '../types'

const COLOR = '#06b6d4'

export default function PPOPage() {
  const { t } = useLanguage()
  const ENVS = [
    { id: 'gridworld', label: t('envTabs.gridworld') },
    { id: 'nav2d', label: t('envTabs.nav2d') },
  ]

  const { env, switchEnv, demo, training, loading, error,
    currentStep, playing, speed, setSpeed, play, pause, reset, stepForward, fetchDemo } =
    useEpisodePlayer('ppo', 'gridworld')

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

  const compareRows = [
    { label: t('ppo.updateFreq'), a2c: t('ppo.a2c_vals.0'), ppo: t('ppo.ppo_vals.0') },
    { label: t('ppo.stepControl'), a2c: t('ppo.a2c_vals.1'), ppo: t('ppo.ppo_vals.1') },
    { label: t('ppo.sampleReuse'), a2c: t('ppo.a2c_vals.2'), ppo: t('ppo.ppo_vals.2') },
    { label: t('ppo.stability'), a2c: t('ppo.a2c_vals.3'), ppo: t('ppo.ppo_vals.3') },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color: COLOR, background: COLOR + '20' }}>
          {t('ppo.chapter')}
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">{t('ppo.name')}</h1>
        <p className="text-slate-400 mt-1 max-w-2xl">{t('ppo.description')}</p>
      </div>

      <div className="mb-5 p-4 rounded-xl border border-border bg-card">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('ppo.clipTitle')}</p>
        <div className="font-mono text-xs space-y-1">
          <p className="text-slate-400">ratio r(θ) = π_θ(a|s) / π_θ_old(a|s)</p>
          <p style={{ color: COLOR }}>L_CLIP = E[ min( r·A, clip(r, 1−ε, 1+ε)·A ) ]</p>
          <p className="text-slate-500">{t('ppo.clipNote')}</p>
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {isGrid ? t('ppo.envLabel_grid') : t('ppo.envLabel_nav')}
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('ppo.compareTitle')}</p>
            <div className="space-y-3 text-[10px]">
              <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold">
                <span className="text-slate-600"></span>
                <span className="text-rose-400">A2C</span>
                <span style={{ color: COLOR }}>PPO</span>
              </div>
              {compareRows.map((row) => (
                <div key={row.label} className="grid grid-cols-3 gap-1">
                  <span className="text-slate-500 font-semibold text-[10px]">{row.label}</span>
                  <span className="text-rose-400 text-[10px]">{row.a2c}</span>
                  <span style={{ color: COLOR }} className="text-[10px]">{row.ppo}</span>
                </div>
              ))}
            </div>
          </div>

          {step && (
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('q_learning.currentStep')}</p>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.value')}</span>
                  <span className="text-amber-400">{step.value?.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.logProb')}</span>
                  <span style={{ color: COLOR }}>{step.log_prob?.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.reward')}</span>
                  <span className={step.reward >= 0 ? 'text-emerald-400' : 'text-red-400'}>{step.reward}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('ppo.whyTitle')}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{t('ppo.whyDesc')}</p>
          </div>

          {training && <TrainingCurve data={training} color={COLOR} title={t('common.trainingRewards')} />}
        </div>
      </div>
    </div>
  )
}
