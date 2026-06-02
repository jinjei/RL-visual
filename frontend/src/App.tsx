import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './i18n'
import Layout from './components/Layout'
import Home from './pages/Home'
import QLearningPage from './pages/QLearningPage'
import SARSAPage from './pages/SARSAPage'
import DQNPage from './pages/DQNPage'
import DuelingDQNPage from './pages/DuelingDQNPage'
import A2CPage from './pages/A2CPage'
import PPOPage from './pages/PPOPage'
import GridEditorPage from './pages/GridEditorPage'

export default function App() {
  return (
    <LanguageProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="q-learning" element={<QLearningPage />} />
          <Route path="sarsa" element={<SARSAPage />} />
          <Route path="dqn" element={<DQNPage />} />
          <Route path="dueling-dqn" element={<DuelingDQNPage />} />
          <Route path="a2c" element={<A2CPage />} />
          <Route path="ppo" element={<PPOPage />} />
          <Route path="playground" element={<GridEditorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </LanguageProvider>
  )
}
