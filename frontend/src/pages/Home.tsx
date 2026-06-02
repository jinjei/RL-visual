import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Network, Zap } from 'lucide-react'
import { useLanguage } from '../i18n'

export default function Home() {
  const { t } = useLanguage()

  const CHAPTERS = [
    {
      num: 1, icon: Layers, color: '#f59e0b',
      title: t('home.ch1Title'), desc: t('home.ch1Desc'),
      algos: [
        { name: 'Q-Learning', to: '/q-learning', color: '#f59e0b', tag: 'Off-policy TD', desc: t('home.ch1Title') },
        { name: 'SARSA', to: '/sarsa', color: '#10b981', tag: 'On-policy TD', desc: t('home.ch1Title') },
      ],
    },
    {
      num: 2, icon: Network, color: '#3b82f6',
      title: t('home.ch2Title'), desc: t('home.ch2Desc'),
      algos: [
        { name: 'DQN', to: '/dqn', color: '#3b82f6', tag: 'Deep Q-Network', desc: t('home.ch2Title') },
        { name: 'Dueling DQN', to: '/dueling-dqn', color: '#8b5cf6', tag: 'Value + Advantage', desc: t('home.ch2Title') },
      ],
    },
    {
      num: 3, icon: Zap, color: '#f43f5e',
      title: t('home.ch3Title'), desc: t('home.ch3Desc'),
      algos: [
        { name: 'A2C', to: '/a2c', color: '#f43f5e', tag: 'Actor-Critic', desc: t('home.ch3Title') },
        { name: 'PPO', to: '/ppo', color: '#06b6d4', tag: 'Clipped Surrogate', desc: t('home.ch3Title') },
      ],
    },
  ]

  const FEATURES = [
    { icon: '🗺️', en: 'Q-Value Heatmaps', zh: 'Q 值热力图', desc_en: 'Watch Q-values evolve on every grid cell as the agent learns', desc_zh: '实时观察每个网格单元的 Q 值演化过程' },
    { icon: '🎯', en: 'Policy Visualization', zh: '策略可视化', desc_en: 'See action probabilities as directional arrows on the grid', desc_zh: '以方向箭头展示每个状态的动作概率分布' },
    { icon: '⚡', en: 'Value + Advantage Split', zh: '价值/优势分解', desc_en: 'Dueling DQN\'s V(s) and A(s,a) shown as separate heatmaps', desc_zh: '对决 DQN 的 V(s) 与 A(s,a) 双热力图并排展示' },
    { icon: '🚗', en: '2D Continuous Control', zh: '2D 连续控制', desc_en: 'A2C & PPO navigating around obstacles with continuous actions', desc_zh: 'A2C & PPO 在连续动作空间中导航避障的轨迹' },
    { icon: '📈', en: 'Training Curves', zh: '训练曲线', desc_en: 'Smoothed episode reward curves from the actual training runs', desc_zh: '来自真实训练过程的平滑奖励曲线' },
    { icon: '🍎', en: 'Mac-native', zh: '本地运行', desc_en: 'MPS (Apple Silicon) auto-detected. No cloud, no GPU needed.', desc_zh: '自动检测 MPS 加速（Apple Silicon），无需云端与独立 GPU' },
  ]

  const { lang } = useLanguage()

  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      {/* Hero */}
      <div className="mb-14 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-5">
          {t('home.badge')}
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
          {t('home.title1')}<br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            {t('home.title2')}
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          {t('home.subtitle')}
        </p>
      </div>

      {/* Algorithm flow */}
      <div className="flex items-center justify-center gap-2 mb-14 flex-wrap">
        {[
          { label: 'Q-Learning', color: '#f59e0b' },
          { label: 'SARSA', color: '#10b981' },
          { label: '→', plain: true },
          { label: 'DQN', color: '#3b82f6' },
          { label: 'Dueling DQN', color: '#8b5cf6' },
          { label: '→', plain: true },
          { label: 'A2C', color: '#f43f5e' },
          { label: 'PPO', color: '#06b6d4' },
        ].map((item, i) =>
          (item as any).plain ? (
            <span key={i} className="text-slate-600 text-lg">→</span>
          ) : (
            <span key={i} className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ backgroundColor: item.color + '20', color: item.color, border: `1px solid ${item.color}40` }}>
              {item.label}
            </span>
          )
        )}
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-3 gap-4 mb-14">
        {FEATURES.map((f) => (
          <div key={f.en} className="bg-card border border-border rounded-xl p-4">
            <span className="text-2xl">{f.icon}</span>
            <p className="text-sm font-semibold text-white mt-2">{lang === 'zh' ? f.zh : f.en}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{lang === 'zh' ? f.desc_zh : f.desc_en}</p>
          </div>
        ))}
      </div>

      {/* Chapters */}
      <div className="space-y-10">
        {CHAPTERS.map((ch) => {
          const Icon = ch.icon
          return (
            <div key={ch.num}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ch.color + '20' }}>
                  <Icon size={16} style={{ color: ch.color }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: ch.color + 'aa' }}>
                    {lang === 'zh' ? `第${ch.num}章` : `Chapter ${ch.num}`}
                  </p>
                  <h2 className="text-base font-bold text-white">{ch.title}</h2>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-4 max-w-xl">{ch.desc}</p>
              <div className="grid grid-cols-2 gap-4">
                {ch.algos.map((algo) => (
                  <Link key={algo.to} to={algo.to}
                    className="group block bg-card border border-border rounded-xl p-5 hover:border-white/20 transition-all hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: algo.color + '20', color: algo.color }}>
                          {algo.tag}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-2">{algo.name}</h3>
                      </div>
                      <ArrowRight size={16} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-14 p-5 rounded-xl border border-border bg-card/50 text-center">
        <p className="text-sm text-slate-400">{t('home.footer')}</p>
      </div>
    </div>
  )
}
