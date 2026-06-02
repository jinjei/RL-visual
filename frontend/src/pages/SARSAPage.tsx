import { useMemo } from 'react'
import { useEpisodePlayer } from '../components/useEpisodePlayer'
import GridWorldViz from '../components/GridWorldViz'
import TrainingCurve from '../components/TrainingCurve'
import PlayerControls from '../components/PlayerControls'
import { useLanguage } from '../i18n'
import type { GridConfig } from '../types'

const COLOR = '#10b981'

export default function SARSAPage() {
  const { t } = useLanguage()

  const ENVS = [
    { id: 'gridworld', label: t('envTabs.gridworld') },
    { id: 'cliff', label: t('envTabs.cliff') },
  ]

  const { env, switchEnv, demo, training, loading, error,
    currentStep, playing, speed, setSpeed, play, pause, reset, stepForward, fetchDemo } =
    useEpisodePlayer('sarsa', 'gridworld')

  const agentPos = demo?.episode[Math.min(currentStep, demo.episode.length - 1)]?.state as [number, number] | undefined
  const heatmap = useMemo(() => demo?.q_table?.map((qs) => Math.max(...qs)), [demo])
  const config = demo?.env_config as GridConfig | undefined
  const stepData = demo?.episode[Math.min(currentStep, (demo?.episode.length ?? 1) - 1)]
  const isCliff = env === 'cliff'

  const EnvViz = config ? (
    <div className={isCliff ? 'overflow-x-auto' : ''}>
      <GridWorldViz config={config} agentPos={agentPos} heatmap={heatmap} policy={demo?.policy}
        accentColor={COLOR} maxWidth={isCliff ? 540 : undefined} />
    </div>
  ) : (
    <div className="flex items-center justify-center h-48 text-slate-500 text-sm">{t('common.clickToLoad')}</div>
  )

  const StepInfo = stepData ? (
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
  ) : null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color: COLOR, background: COLOR + '20' }}>
          {t('sarsa.chapter')}
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">{t('sarsa.name')}</h1>
        <p className="text-slate-400 mt-1 max-w-2xl">{t('sarsa.description')}</p>
      </div>

      {/* Callout */}
      <div className="mb-5 p-3 rounded-lg border flex gap-3" style={{ borderColor: COLOR + '40', background: COLOR + '08' }}>
        <div className="text-lg">💡</div>
        <div>
          <p className="text-xs font-semibold" style={{ color: COLOR }}>{t('sarsa.calloutTitle')}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('sarsa.calloutDesc')}</p>
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

      {isCliff ? (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border p-4">
            {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-3">{error}</div>}
            {EnvViz}
          </div>
          <PlayerControls playing={playing} loading={loading} onPlay={play} onPause={pause}
            onReset={reset} onStep={stepForward} onFetch={fetchDemo} speed={speed}
            onSpeedChange={setSpeed} step={currentStep} total={demo?.episode.length ?? 0}
            totalReward={demo?.total_reward} color={COLOR} />
          <div className="grid grid-cols-2 gap-5">
            {training && <TrainingCurve data={training} color={COLOR} title={t('common.trainingRewards')} />}
            {StepInfo}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 space-y-4">
            <div className="bg-card rounded-xl border border-border p-4">
              {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-3">{error}</div>}
              {EnvViz}
            </div>
            <PlayerControls playing={playing} loading={loading} onPlay={play} onPause={pause}
              onReset={reset} onStep={stepForward} onFetch={fetchDemo} speed={speed}
              onSpeedChange={setSpeed} step={currentStep} total={demo?.episode.length ?? 0}
              totalReward={demo?.total_reward} color={COLOR} />
          </div>

          <div className="col-span-2 space-y-4">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('sarsa.updateTitle')}</p>
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <p className="text-slate-400 mb-1">{t('sarsa.sarsa_label')}</p>
                  <p style={{ color: COLOR }}>Q(s,a) ← Q(s,a) + α[r + γ Q(s',<span className="underline">a'</span>) - Q(s,a)]</p>
                  <p className="text-slate-600 mt-1 text-[10px]">{t('sarsa.sarsa_desc')}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <p className="text-slate-400 mb-1">{t('sarsa.ql_label')}</p>
                  <p className="text-blue-400">Q(s,a) ← Q(s,a) + α[r + γ <span className="underline">max</span> Q(s',a') - Q(s,a)]</p>
                  <p className="text-slate-600 mt-1 text-[10px]">{t('sarsa.ql_desc')}</p>
                </div>
              </div>
            </div>
            {StepInfo}
            {training && <TrainingCurve data={training} color={COLOR} title={t('common.trainingRewards')} />}
          </div>
        </div>
      )}

      <div className="mt-8 bg-card rounded-xl border border-border p-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('sarsa.insightTitle')}</p>
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
          {[
            { title: t('sarsa.onpolicy_title'), color: COLOR, points: t('sarsa.onpolicy_points') as unknown as string[] },
            { title: t('sarsa.offpolicy_title'), color: '#3b82f6', points: t('sarsa.offpolicy_points') as unknown as string[] },
          ].map((col) => (
            <div key={col.title}>
              <p className="font-semibold mb-2" style={{ color: col.color }}>{col.title}</p>
              <ul className="space-y-1">
                {(Array.isArray(col.points) ? col.points : [col.points]).map((p: string) =>
                  <li key={p} className="flex gap-2"><span>•</span><span>{p}</span></li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
