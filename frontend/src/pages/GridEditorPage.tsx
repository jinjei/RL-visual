import { useMemo, useState, useEffect } from 'react'
import { Play, Pause, SkipForward, SkipBack, Loader2, RotateCcw } from 'lucide-react'
import { api } from '../api/client'
import type { GridConfig, EpisodeStep, LiveTrainResponse } from '../types'
import GridWorldViz from '../components/GridWorldViz'
import PlayerControls from '../components/PlayerControls'
import LiveRewardCurve from '../components/LiveRewardCurve'
import { useLanguage } from '../i18n'

const COLOR = '#22d3ee'
type Brush = 'wall' | 'start' | 'goal' | 'erase'
type Mode = 'solve' | 'learn'
type Phase = 'edit' | 'learning' | 'solving'

interface RunResult {
  episode: EpisodeStep[]
  total_reward: number
  policy?: number[]
  q_table?: number[][]
  reached_goal: boolean
}

export default function GridEditorPage() {
  const { t } = useLanguage()

  // ---- Layout ---------------------------------------------------------- //
  const [rows, setRows] = useState(6)
  const [cols, setCols] = useState(6)
  const [walls, setWalls] = useState<Set<string>>(
    () => new Set(['1,1', '1,2', '1,3', '2,4', '3,1', '3,2', '4,3', '4,4'])
  )
  const [start, setStart] = useState<[number, number]>([0, 0])
  const [goal, setGoal] = useState<[number, number]>([5, 5])
  const [brush, setBrush] = useState<Brush>('wall')
  const [algo, setAlgo] = useState<'q_learning' | 'sarsa'>('q_learning')

  // ---- Mode + hyperparameters ------------------------------------------ //
  const [mode, setMode] = useState<Mode>('learn')
  const [alpha, setAlpha] = useState(0.1)
  const [gamma, setGamma] = useState(0.99)
  const [epsilon, setEpsilon] = useState(0.1)
  const [episodes, setEpisodes] = useState(2000)

  // ---- Run state ------------------------------------------------------- //
  const [phase, setPhase] = useState<Phase>('edit')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [live, setLive] = useState<LiveTrainResponse | null>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [learnPlaying, setLearnPlaying] = useState(false)
  const [learnSpeed, setLearnSpeed] = useState(1)

  const [demo, setDemo] = useState<RunResult | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(6)

  // Any layout/param change makes a previous policy stale.
  const invalidate = () => {
    setPhase('edit'); setLive(null); setDemo(null)
    setFrameIdx(0); setCurrentStep(0)
    setLearnPlaying(false); setPlaying(false); setError(null)
  }

  const resize = (r: number, c: number) => {
    setRows(r); setCols(c); setWalls(new Set()); setStart([0, 0]); setGoal([r - 1, c - 1])
    invalidate()
  }

  const onCellClick = (r: number, c: number) => {
    const key = `${r},${c}`
    const isStart = r === start[0] && c === start[1]
    const isGoal = r === goal[0] && c === goal[1]
    if (brush === 'wall') {
      if (isStart || isGoal) return
      setWalls((w) => { const next = new Set(w); next.has(key) ? next.delete(key) : next.add(key); return next })
    } else if (brush === 'erase') {
      setWalls((w) => { const next = new Set(w); next.delete(key); return next })
    } else if (brush === 'start') {
      if (isGoal || walls.has(key)) return
      setStart([r, c])
    } else if (brush === 'goal') {
      if (isStart || walls.has(key)) return
      setGoal([r, c])
    }
    invalidate()
  }

  const wallsList = useMemo(
    () => Array.from(walls).map((s) => s.split(',').map(Number) as [number, number]),
    [walls]
  )
  const body = () => ({ algo, rows, cols, start, goal, walls: wallsList, alpha, gamma, epsilon, episodes })

  // ---- The two run actions --------------------------------------------- //
  const runSolve = async () => {
    setLoading(true); invalidate()
    try {
      const res = await api.gridTrain(body())
      setDemo(res as RunResult)
      setPhase('solving'); setCurrentStep(0); setPlaying(true)
    } catch (e: any) { setError(e.message ?? 'Training failed.') }
    finally { setLoading(false) }
  }

  const runLearn = async () => {
    setLoading(true); invalidate()
    try {
      const res = await api.gridTrainLive(body())
      setLive(res)
      setPhase('learning'); setFrameIdx(0); setLearnPlaying(true)
    } catch (e: any) { setError(e.message ?? 'Training failed.') }
    finally { setLoading(false) }
  }

  const primary = () => (mode === 'learn' ? runLearn() : runSolve())

  // ---- Learning playback: animate frames, then run the final policy ----- //
  useEffect(() => {
    if (phase !== 'learning' || !live || !learnPlaying) return
    if (frameIdx >= live.frames.length - 1) {
      const tmo = setTimeout(() => {
        setDemo({
          episode: live.final.episode,
          total_reward: live.final.total_reward,
          policy: live.final.policy,
          q_table: live.final.q_table,
          reached_goal: live.final.reached_goal,
        })
        setPhase('solving'); setCurrentStep(0); setPlaying(true)
      }, 900)
      return () => clearTimeout(tmo)
    }
    const timer = setTimeout(() => setFrameIdx((i) => i + 1), 1000 / learnSpeed)
    return () => clearTimeout(timer)
  }, [phase, live, learnPlaying, frameIdx, learnSpeed])

  // ---- Solving playback: animate the greedy agent run ------------------ //
  useEffect(() => {
    if (phase !== 'solving' || !demo || !playing) return
    if (currentStep >= demo.episode.length) { setPlaying(false); return }
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), 1000 / speed)
    return () => clearTimeout(timer)
  }, [phase, demo, playing, currentStep, speed])

  // ---- Derived view data ----------------------------------------------- //
  const config: GridConfig = useMemo(() => ({
    rows, cols, start, goal, walls: wallsList, cliff_cells: [],
  }), [rows, cols, start, goal, wallsList])

  const frame = phase === 'learning' && live ? live.frames[Math.min(frameIdx, live.frames.length - 1)] : null

  const solveHeatmap = useMemo(
    () => demo?.q_table?.map((qs) => Math.max(...qs)),
    [demo]
  )
  const vizPolicy = phase === 'learning' ? frame?.policy : phase === 'solving' ? demo?.policy : undefined
  const vizHeatmap = phase === 'learning' ? frame?.heatmap : phase === 'solving' ? solveHeatmap : undefined
  const agentPos = phase === 'solving' && demo
    ? (demo.episode[Math.min(currentStep, demo.episode.length - 1)]?.state as [number, number] | undefined)
    : undefined

  const BRUSHES: { id: Brush; label: string; color: string }[] = [
    { id: 'wall', label: t('playground.brushWall'), color: '#9ca3af' },
    { id: 'start', label: t('playground.brushStart'), color: '#10b981' },
    { id: 'goal', label: t('playground.brushGoal'), color: COLOR },
    { id: 'erase', label: t('playground.brushErase'), color: '#64748b' },
  ]
  const SIZES = [4, 5, 6, 7, 8]
  const PARAMS: { label: string; val: number; set: (v: number) => void; min: number; max: number; step: number; fmt?: (v: number) => string }[] = [
    { label: t('playground.alpha'), val: alpha, set: setAlpha, min: 0.01, max: 1, step: 0.01 },
    { label: t('playground.gamma'), val: gamma, set: setGamma, min: 0.5, max: 0.99, step: 0.01 },
    { label: t('playground.epsilon'), val: epsilon, set: setEpsilon, min: 0, max: 0.5, step: 0.01 },
    { label: t('playground.episodes'), val: episodes, set: setEpisodes, min: 200, max: 5000, step: 100, fmt: (v) => String(v) },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ color: COLOR, background: COLOR + '20' }}>
          {t('playground.chapter')}
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">{t('playground.name')}</h1>
        <p className="text-slate-400 mt-1 max-w-2xl">{t('playground.description')}</p>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left: grid + playback */}
        <div className="col-span-3 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('playground.designLabel')}</p>
              {frame && (
                <div className="flex gap-3 text-[10px] font-mono">
                  <span className="text-slate-500">{t('playground.episodeLabel')} <span className="text-white">{frame.episode}</span></span>
                  {frame.epsilon !== undefined && frame.epsilon !== null && (
                    <span className="text-slate-500">ε <span style={{ color: COLOR }}>{frame.epsilon.toFixed(3)}</span></span>
                  )}
                  <span className="text-slate-500">{t('playground.avgReward')} <span className="text-emerald-400">{frame.avg_reward.toFixed(1)}</span></span>
                </div>
              )}
            </div>
            {error && <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg p-3 mb-3">{error}</div>}
            <div className="overflow-x-auto">
              <GridWorldViz
                config={config}
                agentPos={agentPos}
                heatmap={vizHeatmap}
                policy={vizPolicy}
                accentColor={COLOR}
                showStart
                editable={phase === 'edit'}
                onCellClick={onCellClick}
                maxWidth={480}
              />
            </div>
            {phase === 'learning' && (
              <p className="text-[10px] text-slate-500 mt-2">{t('playground.learnNote')}</p>
            )}
          </div>

          {phase === 'learning' && live ? (
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              {/* Playback row */}
              <div className="flex items-center gap-2">
                <button onClick={() => setLearnPlaying((p) => !p)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                  style={{ backgroundColor: COLOR + '30', color: COLOR }}>
                  {learnPlaying ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button onClick={() => { setLearnPlaying(false); setFrameIdx((i) => Math.max(0, i - 1)) }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">
                  <SkipBack size={13} className="text-slate-400" />
                </button>
                <button onClick={() => { setLearnPlaying(false); setFrameIdx((i) => Math.min(live.frames.length - 1, i + 1)) }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">
                  <SkipForward size={13} className="text-slate-400" />
                </button>
                {/* Scrubber */}
                <input
                  type="range" min={0} max={live.frames.length - 1} value={frameIdx}
                  onChange={(e) => { setLearnPlaying(false); setFrameIdx(Number(e.target.value)) }}
                  className="flex-1 h-1" style={{ accentColor: COLOR }}
                />
                <span className="text-[10px] font-mono text-slate-400 w-14 text-right">{frameIdx + 1}/{live.frames.length}</span>
              </div>
              {/* Speed row */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-10">{t('common.speed')}</span>
                <input
                  type="range" min={0.25} max={8} step={0.25} value={learnSpeed}
                  onChange={(e) => setLearnSpeed(Number(e.target.value))}
                  className="flex-1 h-1" style={{ accentColor: COLOR }}
                />
                <span className="text-[10px] font-mono text-slate-400 w-12 text-right">{learnSpeed}×/s</span>
              </div>
            </div>
          ) : (
            <PlayerControls
              playing={playing} loading={loading} onPlay={() => { if (demo) { if (currentStep >= demo.episode.length) setCurrentStep(0); setPlaying(true) } else primary() }}
              onPause={() => setPlaying(false)}
              onReset={() => { setCurrentStep(0); setPlaying(false) }}
              onStep={() => demo && setCurrentStep((s) => Math.min(s + 1, demo.episode.length - 1))}
              onFetch={() => primary()} speed={speed} onSpeedChange={setSpeed}
              step={currentStep} total={demo?.episode.length ?? 0}
              totalReward={demo?.total_reward} color={COLOR}
            />
          )}

          {live && (
            <LiveRewardCurve
              curve={live.reward_curve}
              totalEpisodes={live.total_episodes}
              currentEpisode={frame ? frame.episode : live.total_episodes}
              color={COLOR}
            />
          )}
        </div>

        {/* Right: tools */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            {/* Mode */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('playground.modeTitle')}</p>
              <div className="flex gap-2">
                {([['solve', t('playground.modeSolve')], ['learn', t('playground.modeLearn')]] as const).map(([m, label]) => (
                  <button key={m} onClick={() => { setMode(m as Mode); invalidate() }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border transition-colors"
                    style={mode === m
                      ? { borderColor: COLOR, color: COLOR, background: COLOR + '15' }
                      : { borderColor: '#2a2d3e', color: '#64748b' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brush */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('playground.brushTitle')}</p>
              <div className="flex flex-wrap gap-2">
                {BRUSHES.map((b) => (
                  <button key={b.id} onClick={() => setBrush(b.id)}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                    style={brush === b.id ? { borderColor: b.color, color: b.color, background: b.color + '15' } : { borderColor: '#2a2d3e', color: '#64748b' }}>
                    {b.label}
                  </button>
                ))}
                <button onClick={() => { setWalls(new Set()); invalidate() }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-slate-500 hover:text-white transition-colors">
                  {t('playground.clear')}
                </button>
              </div>
            </div>

            {/* Size */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('playground.sizeTitle')}</p>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((n) => (
                  <button key={n} onClick={() => resize(n, n)}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                    style={rows === n && cols === n ? { borderColor: COLOR, color: COLOR, background: COLOR + '15' } : { borderColor: '#2a2d3e', color: '#64748b' }}>
                    {n}×{n}
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('playground.algoTitle')}</p>
              <div className="flex gap-2">
                {(['q_learning', 'sarsa'] as const).map((a) => (
                  <button key={a} onClick={() => { setAlgo(a); invalidate() }}
                    className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                    style={algo === a ? { borderColor: COLOR, color: COLOR, background: COLOR + '15' } : { borderColor: '#2a2d3e', color: '#64748b' }}>
                    {a === 'q_learning' ? 'Q-Learning' : 'SARSA'}
                  </button>
                ))}
              </div>
            </div>

            {/* Hyperparameters */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('playground.paramTitle')}</p>
              <div className="space-y-2.5">
                {PARAMS.map((p) => (
                  <div key={p.label}>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span className="text-slate-500">{p.label}</span>
                      <span className="font-mono" style={{ color: COLOR }}>{p.fmt ? p.fmt(p.val) : p.val.toFixed(2)}</span>
                    </div>
                    <input type="range" min={p.min} max={p.max} step={p.step} value={p.val}
                      onChange={(e) => { p.set(Number(e.target.value)); invalidate() }}
                      className="w-full h-1" style={{ accentColor: COLOR }} />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={primary} disabled={loading}
              className="w-full py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: COLOR + '25', color: COLOR }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? (mode === 'learn' ? t('playground.learning') : t('playground.training'))
                : (mode === 'learn' ? t('playground.watchLearn') : t('playground.train'))}
            </button>

            {phase === 'solving' && demo && (
              <div className={`text-xs rounded-lg p-3 border flex items-center justify-between ${demo.reached_goal
                ? 'text-emerald-400 bg-emerald-900/20 border-emerald-800/40'
                : 'text-amber-400 bg-amber-900/20 border-amber-800/40'}`}>
                <span>{demo.reached_goal ? t('playground.reached') : t('playground.notReached')}</span>
                <button onClick={() => { setCurrentStep(0); setPlaying(true) }} title="replay"
                  className="p-1 rounded hover:bg-white/10"><RotateCcw size={12} /></button>
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              {phase === 'learning' || mode === 'learn' ? t('playground.learnHint') : t('playground.hint')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
