import { Outlet, NavLink } from 'react-router-dom'
import { Brain } from 'lucide-react'
import { useLanguage } from '../i18n'

export default function Layout() {
  const { t, lang, toggle } = useLanguage()

  const NAV = [
    {
      chapter: t('nav.chapter1'),
      color: '#f59e0b',
      items: [
        { to: '/q-learning', label: 'Q-Learning', color: '#f59e0b' },
        { to: '/sarsa', label: 'SARSA', color: '#10b981' },
      ],
    },
    {
      chapter: t('nav.chapter2'),
      color: '#3b82f6',
      items: [
        { to: '/dqn', label: 'DQN', color: '#3b82f6' },
        { to: '/dueling-dqn', label: 'Dueling DQN', color: '#8b5cf6' },
      ],
    },
    {
      chapter: t('nav.chapter3'),
      color: '#f43f5e',
      items: [
        { to: '/a2c', label: 'A2C', color: '#f43f5e' },
        { to: '/ppo', label: 'PPO', color: '#06b6d4' },
      ],
    },
    {
      chapter: t('nav.chapter4'),
      color: '#22d3ee',
      items: [
        { to: '/playground', label: t('playground.name'), color: '#22d3ee' },
      ],
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <NavLink
          to="/"
          className="flex items-center gap-3 px-5 py-5 border-b border-border hover:bg-white/5 transition-colors"
        >
          <Brain size={22} className="text-blue-400" />
          <span className="font-bold text-sm tracking-wide text-white">RL Visualizer</span>
        </NavLink>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV.map((group) => (
            <div key={group.chapter} className="mb-5">
              <p
                className="px-5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: group.color + 'aa' }}
              >
                {group.chapter}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-2 text-sm transition-all ${
                      isActive
                        ? 'text-white bg-white/8 border-r-2'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) => (isActive ? { borderColor: item.color } : {})}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer: language toggle + footnote */}
        <div className="px-5 py-4 border-t border-border space-y-3">
          <button
            onClick={toggle}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 transition-colors text-xs font-semibold text-slate-300"
          >
            <span className={lang === 'zh' ? 'text-white' : 'text-slate-500'}>中文</span>
            <span className="text-slate-600 text-[10px]">/</span>
            <span className={lang === 'en' ? 'text-white' : 'text-slate-500'}>EN</span>
          </button>
          <p className="text-[10px] text-slate-600 text-center">{t('nav.footer')}</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-surface">
        <Outlet />
      </main>
    </div>
  )
}
