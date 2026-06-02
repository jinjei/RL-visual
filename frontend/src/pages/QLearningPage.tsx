import { useMemo } from 'react'
import { useEpisodePlayer } from '../components/useEpisodePlayer'
import GridWorldViz from '../components/GridWorldViz'
import TrainingCurve from '../components/TrainingCurve'
import PlayerControls from '../components/PlayerControls'
import { useLanguage } from '../i18n'
import type { GridConfig } from '../types'

const COLOR = '#f59e0b'

export default function QLearningPage() {
  const { t } = useLanguage()

  const ENVS = [
    { id: 'gridworld', label: t('envTabs.gridworld') },
    { id: 'cliff', label: t('envTabs.cliff') },
  ]

  const { env, switchEnv, demo, training, loading, error,
    currentStep, playing, speed, setSpeed, play, pause, reset, stepForward, fetchDemo } =
    useEpisodePlayer('q_learning', 'gridworld')

  const agentPos = demo?.episode[Math.min(currentStep, demo.episode.length - 1)]?.state as [number, number] | undefined
  const heatmap = useMemo(() => demo?.q_table?.map((qs) => Math.max(...qs)), [demo])
  const config = demo?.env_config as GridConfig | undefined
  const stepData = demo?.episode[Math.min(currentStep, (demo?.episode.length ?? 1) - 1)]

  const EXPLAINER = [
    { term: t('q_learning.off_policy'), desc: t('q_learning.off_policy_desc') },
    { term: t('q_learning.update_rule'), desc: t('q_learning.update_rule_desc') },
    { term: t('q_learning.exploration'), desc: t('q_learning.exploration_desc') },
    { term: t('q_learning.gridworld_env'), desc: t('q_learning.gridworld_env_desc') },
    { term: t('q_learning.cliff_env'), desc: t('q_learning.cliff_env_desc') },
  ]

  // For CliffWalking (12 cols), shrink cells to fit container (~540px)
  const maxWidth = env === 'cliff' ? 540 : undefined

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color: COLOR, background: COLOR + '20' }}>
          {t('q_learning.chapter')}
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">{t('q_learning.name')}</h1>
        <p className="text-slate-400 mt-1 max-w-2xl">{t('q_learning.description')}</p>
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

      {/* Layout: full-width env on top for cliff, side-by-side for gridworld */}
      {env === 'cliff' ? (
        /* Cliff Walking: stack vertically so the wide grid has room */
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('q_learning.envLabel')}</p>
            {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-3">{error}</div>}
            {config ? (
              <div className="overflow-x-auto">
                <GridWorldViz config={config} agentPos={agentPos} heatmap={heatmap} policy={demo?.policy} accentColor={COLOR} maxWidth={maxWidth} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-500 text-sm">{t('common.clickToLoad')}</div>
            )}
          </div>

          <PlayerControls playing={playing} loading={loading} onPlay={play} onPause={pause}
            onReset={reset} onStep={stepForward} onFetch={fetchDemo} speed={speed}
            onSpeedChange={setSpeed} step={currentStep} total={demo?.episode.length ?? 0}
            totalReward={demo?.total_reward} color={COLOR} />

          <div className="grid grid-cols-2 gap-5">
            {training && <TrainingCurve data={training} color={COLOR} title={t('common.trainingRewards')} />}
            {stepData && (
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('q_learning.currentStep')}</p>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between"><span className="text-slate-500">{t('common.state')}</span><span className="text-white">{JSON.stringify(stepData.state)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t('common.action')}</span><span style={{ color: COLOR }}>{['↑','→','↓','←'][stepData.action as number]}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t('common.reward')}</span>
                    <span className={stepData.reward >= 0 ? 'text-emerald-400' : 'text-red-400'}>{stepData.reward}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* GridWorld: side-by-side */
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 space-y-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('q_learning.envLabel')}</p>
              {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-3">{error}</div>}
              {config ? (
                <GridWorldViz config={config} agentPos={agentPos} heatmap={heatmap} policy={demo?.policy} accentColor={COLOR} />
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('q_learning.heatmapTitle')}</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-4 rounded" style={{ background: 'linear-gradient(to right, rgb(15,10,80), rgb(80,18,160), rgb(180,55,110), rgb(245,130,45), rgb(252,220,30))' }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{t('common.low')}</span><span>{t('common.high')}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{t('q_learning.heatmapDesc')}</p>
            </div>

            {stepData && (
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('q_learning.currentStep')}</p>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between"><span className="text-slate-500">{t('common.state')}</span><span className="text-white">{JSON.stringify(stepData.state)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t('common.action')}</span><span style={{ color: COLOR }}>{['↑','→','↓','←'][stepData.action as number]}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t('common.reward')}</span>
                    <span className={stepData.reward >= 0 ? 'text-emerald-400' : 'text-red-400'}>{stepData.reward}</span>
                  </div>
                </div>
              </div>
            )}

            {training && <TrainingCurve data={training} color={COLOR} title={t('common.trainingRewards')} />}
          </div>
        </div>
      )}

      <div className="mt-8 bg-card rounded-xl border border-border p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('q_learning.howTitle')}</p>
        <div className="grid grid-cols-2 gap-4">
          {EXPLAINER.map((item) => (
            <div key={item.term}>
              <p className="text-sm font-semibold mb-1" style={{ color: COLOR }}>{item.term}</p>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
