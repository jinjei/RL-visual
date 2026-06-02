import React, { createContext, useContext, useState } from 'react'

export type Lang = 'en' | 'zh'

// ------------------------------------------------------------------ //
//  Translations                                                        //
// ------------------------------------------------------------------ //

const T = {
  en: {
    common: {
      newEpisode: 'New Episode',
      play: 'Play',
      pause: 'Pause',
      reset: 'Reset',
      stepFwd: 'Step',
      speed: 'Speed',
      step: 'Step {{s}} / {{total}}',
      reward: 'Reward',
      state: 'State',
      action: 'Action',
      value: 'Value V(s)',
      logProb: 'log π(a|s)',
      trainingRewards: 'Training Rewards',
      clickToLoad: 'Click "New Episode" to load a demo',
      noWeightsHint: 'Weights not found — run python train.py in the backend directory first.',
      low: 'Low',
      high: 'High',
      episode: 'Episode',
    },
    nav: {
      home: 'Home',
      chapter1: 'Chapter 1 — Tabular RL',
      chapter2: 'Chapter 2 — Deep Value-Based',
      chapter3: 'Chapter 3 — Policy Gradient',
      chapter4: 'Playground — Build Your Own',
      footer: 'Deep RL · Interactive Demos',
    },
    home: {
      badge: 'Interactive Deep RL Demos',
      title1: 'Reinforcement Learning',
      title2: 'Algorithms Visualized',
      subtitle: 'Watch 6 classic deep RL algorithms learn in real time — from tabular Q-Learning to PPO. Each algorithm runs in an interactive environment with live visualization of Q-values, policy distributions, and value functions.',
      footer: 'All models pre-trained locally (no GPU required) · MPS (Apple Silicon) supported',
      ch1Title: 'Tabular RL',
      ch1Desc: 'Classical foundations — no neural networks. Q-values stored in a lookup table, updated step by step.',
      ch2Title: 'Deep Value-Based',
      ch2Desc: 'Replace the Q-table with a neural network. Handle large or continuous state spaces.',
      ch3Title: 'Policy Gradient',
      ch3Desc: 'Directly optimize the policy. Naturally handles continuous action spaces.',
    },
    envTabs: {
      gridworld: 'GridWorld 6×6',
      cliff: 'Cliff Walking',
      cartpole: 'CartPole-v1',
      nav2d: '2D Navigation',
    },
    // ---- Algorithm pages ------------------------------------------ //
    q_learning: {
      chapter: 'Chapter 1 · Tabular RL',
      name: 'Q-Learning',
      description: 'Off-policy temporal-difference control. Learns the optimal Q-table by always bootstrapping from the best possible next action — even if it doesn\'t take it.',
      envLabel: 'Environment',
      heatmapTitle: 'Q-Value Heatmap',
      heatmapDesc: 'Each cell shows max Q(s,a) — the value of being in that state. Arrows show the greedy policy (best action).',
      currentStep: 'Current Step',
      howTitle: 'How It Works',
      off_policy: 'Off-policy',
      off_policy_desc: 'Updates toward the best possible next action, regardless of what the agent actually does (ε-greedy).',
      update_rule: 'Q(s,a) update',
      update_rule_desc: 'Q(s,a) ← Q(s,a) + α [r + γ max Q(s\',a\') − Q(s,a)]',
      exploration: 'Exploration',
      exploration_desc: 'ε starts at 1.0 and decays to 0.01 — from fully random to mostly greedy.',
      gridworld_env: 'GridWorld',
      gridworld_env_desc: 'Agent navigates a 6×6 grid with walls to reach the goal. Q-values shown as heatmap.',
      cliff_env: 'Cliff Walking',
      cliff_env_desc: '4×12 grid. Falling off the cliff resets with −100 reward. Q-Learning takes the risky short path.',
    },
    sarsa: {
      chapter: 'Chapter 1 · Tabular RL',
      name: 'SARSA',
      description: 'On-policy temporal-difference control. Unlike Q-Learning, SARSA updates using the action it actually takes next — making it safer in environments with catastrophic penalties.',
      calloutTitle: 'SARSA vs Q-Learning on Cliff Walking',
      calloutDesc: 'Q-Learning walks the risky path along the cliff edge (optimal but dangerous). SARSA learns to walk safely away from the cliff because it accounts for its own ε-greedy mistakes.',
      updateTitle: 'Update Rule',
      sarsa_label: 'SARSA (on-policy)',
      sarsa_desc: 'a\' = action chosen by ε-greedy in s\'',
      ql_label: 'Q-Learning (off-policy)',
      ql_desc: 'Always uses the best possible next action',
      insightTitle: 'Key Insight: On-Policy vs Off-Policy',
      onpolicy_title: 'On-policy (SARSA)',
      onpolicy_points: [
        'Learns value of policy being followed',
        'ε-greedy during training affects learned Q-values',
        'More conservative — safer near dangerous states',
        'Converges to safe, near-optimal policy',
      ],
      offpolicy_title: 'Off-policy (Q-Learning)',
      offpolicy_points: [
        'Learns optimal policy regardless of behavior',
        'Can learn from demonstrations or random exploration',
        'Finds the optimal path even if risky',
        'May not account for exploratory mistakes',
      ],
    },
    dqn: {
      chapter: 'Chapter 2 · Deep Value-Based',
      name: 'DQN',
      description: 'Deep Q-Network. Replaces the Q-table with a neural network, enabling RL to scale to large state spaces. Two key innovations: experience replay and a target network.',
      archTitle: 'Network Architecture',
      innovTitle: 'Key Innovations',
      replayTitle: 'Experience Replay',
      replayDesc: 'Stores (s,a,r,s\') tuples in a buffer. Samples random mini-batches to break temporal correlations.',
      targetTitle: 'Target Network',
      targetDesc: 'A frozen copy of the network provides stable TD targets. Updated periodically (every 200 steps).',
      evolutionTitle: 'Tabular Q-Learning → DQN',
      qtable: { title: 'Q-Table', desc: 'Works only for small discrete state spaces. Size grows exponentially with state dimensionality.' },
      nnet: { title: 'Neural Network Q', desc: 'Approximates Q(s,a) for any state. Generalizes across similar states — handles continuous inputs.' },
      tricks: { title: 'Stability Tricks', desc: 'Without replay buffer + target network, training diverges due to correlations and moving targets.' },
    },
    dueling_dqn: {
      chapter: 'Chapter 2 · Deep Value-Based',
      name: 'Dueling DQN',
      description: 'Splits the Q-network into two streams: V(s) (how good is this state?) and A(s,a) (how much better is action a?). Improves data efficiency, especially when actions don\'t matter much.',
      archLine: 'Shared backbone →',
      archCombine: 'Q(s,a) = V(s) + A(s,a) − mean(A)',
      envLabel: 'Environment + Q-Value Map',
      valueLabel: 'State Value V(s)',
      valueDesc: 'V(s) captures how good each position is, independent of action chosen.',
      legendTitle: 'Heatmap Legend',
      legendQLabel: 'Q-map (top) — max Q(s,a)',
      legendVLabel: 'Value map (bottom) — V(s)',
      legendDesc: 'In states where all actions lead to similar outcomes, V(s) dominates. A(s,a) highlights where the choice of action actually matters.',
      whyTitle: 'Why Dueling?',
      whyDesc: 'In many states, the choice of action doesn\'t matter much (e.g., empty corridor). Dueling DQN naturally learns V(s) for these states and only refines A(s,a) when actions differ — more sample-efficient.',
    },
    a2c: {
      chapter: 'Chapter 3 · Policy Gradient',
      name: 'A2C — Advantage Actor-Critic',
      description: 'Two networks working together: the Actor outputs a policy π(a|s), and the Critic estimates V(s). The advantage A(s,a) = Q(s,a) − V(s) tells the actor how much better an action is compared to average.',
      structTitle: 'Actor-Critic Structure',
      envLabel_grid: 'GridWorld — Policy arrows + Value heatmap',
      envLabel_nav: '2D Navigation — Agent trajectory',
      legendTitle: 'GridWorld Legend',
      legendDesc: 'Value V(s): background color. Arrows: policy π(a|s), opacity ∝ probability.',
      advantage: 'Advantage: A(s,a) = r + γV(s\') − V(s)',
      action_nav: 'Action (ax, ay)',
    },
    ppo: {
      chapter: 'Chapter 3 · Policy Gradient',
      name: 'PPO — Proximal Policy Optimization',
      description: 'Industry-standard policy gradient algorithm. Improves on A2C by clipping the policy update ratio to prevent catastrophically large steps. More stable, more sample-efficient, and works for both discrete and continuous actions.',
      clipTitle: 'The Core Idea: Clipped Surrogate Objective',
      clipNote: 'ε = 0.2 — the policy cannot change more than 20% in one update',
      compareTitle: 'PPO vs A2C',
      updateFreq: 'Update frequency',
      stepControl: 'Step size control',
      sampleReuse: 'Sample reuse',
      stability: 'Stability',
      a2c_vals: ['After every n_steps', 'Gradient clipping only', 'Each sample used once', 'Good'],
      ppo_vals: ['Multiple epochs per rollout', 'Clipped ratio + gradient clip', 'Each rollout reused n_epochs times', 'Better — no catastrophic updates'],
      whyTitle: 'Why PPO Won',
      whyDesc: 'OpenAI used PPO for Dota 2, robotic dexterous manipulation, and ChatGPT\'s RLHF training. It\'s simple to implement, robust to hyperparameters, and handles both discrete and continuous action spaces without modification.',
      envLabel_grid: 'GridWorld — Policy + Value map',
      envLabel_nav: '2D Navigation — Continuous control',
    },
    playground: {
      chapter: 'Interactive · Build Your Own',
      name: 'GridWorld Playground',
      description: 'Design your own maze — click to place walls, the start and the goal — then train a fresh tabular agent on the spot and watch it solve your layout.',
      brushTitle: 'Edit Tool',
      brushWall: 'Wall',
      brushStart: 'Start',
      brushGoal: 'Goal',
      brushErase: 'Erase',
      clear: 'Clear walls',
      algoTitle: 'Algorithm',
      train: 'Train & Solve',
      training: 'Training…',
      reached: 'Solved! Agent reached the goal.',
      notReached: 'Agent did not reach the goal — try removing a wall or simplifying the maze.',
      hint: 'Tabular RL has no generalization: a new layout means a new Q-table. But a 6×6 grid trains in well under a second, so editing feels instant — this is genuine on-the-fly training, not pre-baked inference.',
      designLabel: 'Design / Result',
      sizeTitle: 'Grid Size',
      modeTitle: 'Mode',
      modeSolve: 'Solve',
      modeLearn: 'Watch it learn',
      paramTitle: 'Hyperparameters',
      alpha: 'Learning rate α',
      gamma: 'Discount γ',
      epsilon: 'Exploration ε',
      episodes: 'Episodes',
      watchLearn: 'Train & Watch',
      learning: 'Learning…',
      rewardCurve: 'Reward per Episode',
      episodeLabel: 'Episode',
      avgReward: 'Avg reward',
      learnHint: 'Watch the greedy policy (arrows) and value estimate (colour) emerge as training progresses. Early on ε is high so the agent explores randomly and arrows look chaotic; as ε decays the policy sharpens into a clean path. Tune α / γ / ε above to see how they change the speed and stability of convergence.',
      learnNote: 'Arrows = current greedy policy · colour = state value (max Q)',
    },
  },

  // ====================== CHINESE ================================== //
  zh: {
    common: {
      newEpisode: '运行回合',
      play: '播放',
      pause: '暂停',
      reset: '重置',
      stepFwd: '单步',
      speed: '速度',
      step: '步 {{s}} / {{total}}',
      reward: '奖励',
      state: '状态',
      action: '动作',
      value: '价值 V(s)',
      logProb: 'log π(a|s)',
      trainingRewards: '训练奖励曲线',
      clickToLoad: '点击"运行回合"加载演示',
      noWeightsHint: '未找到模型权重 — 请先在 backend 目录下运行 python train.py',
      low: '低',
      high: '高',
      episode: '回合',
    },
    nav: {
      home: '首页',
      chapter1: '第一章 — 表格型 RL',
      chapter2: '第二章 — 深度值方法',
      chapter3: '第三章 — 策略梯度',
      chapter4: '游乐场 — 自己动手',
      footer: '深度强化学习 · 交互演示',
    },
    home: {
      badge: '深度强化学习交互演示',
      title1: '强化学习',
      title2: '算法可视化',
      subtitle: '从表格型 Q-Learning 到 PPO，实时观察 6 种经典深度强化学习算法的学习过程。每种算法均配有 Q 值热力图、策略分布与价值函数的全程可视化。',
      footer: '所有模型在本地训练（无需 GPU）· 支持 Apple Silicon MPS 加速',
      ch1Title: '表格型 RL',
      ch1Desc: '经典基础 — 无需神经网络，Q 值存储在查找表中，逐步更新。',
      ch2Title: '深度值方法',
      ch2Desc: '用神经网络替代 Q 表，处理大规模或连续状态空间。',
      ch3Title: '策略梯度',
      ch3Desc: '直接优化策略，天然适合连续动作空间。',
    },
    envTabs: {
      gridworld: '网格世界 6×6',
      cliff: '悬崖行走',
      cartpole: 'CartPole-v1（倒立摆）',
      nav2d: '2D 导航',
    },
    q_learning: {
      chapter: '第一章 · 表格型强化学习',
      name: 'Q-Learning（Q 学习）',
      description: '离策略（off-policy）时序差分控制。始终以最优下一步动作作为 Bootstrap 目标更新 Q 表 — 即使智能体实际并未执行该动作。',
      envLabel: '环境',
      heatmapTitle: 'Q 值热力图',
      heatmapDesc: '每格颜色代表 max Q(s,a)——处于该状态的价值。箭头表示贪心策略（当前最优动作）。',
      currentStep: '当前步骤',
      howTitle: '算法原理',
      off_policy: '离策略',
      off_policy_desc: '不论智能体实际采取什么动作，更新目标始终使用最优下一动作的 Q 值。',
      update_rule: 'Q 值更新公式',
      update_rule_desc: 'Q(s,a) ← Q(s,a) + α [r + γ max Q(s\',a\') − Q(s,a)]',
      exploration: '探索策略',
      exploration_desc: 'ε 从 1.0 衰减到 0.01 — 从完全随机探索过渡到近乎贪心。',
      gridworld_env: '网格世界',
      gridworld_env_desc: '智能体在 6×6 带墙格子中导航，目标是到达终点，Q 值以热力图显示。',
      cliff_env: '悬崖行走',
      cliff_env_desc: '4×12 格子地图。掉入悬崖获得 −100 奖励并重置。Q-Learning 倾向走贴近悬崖的最短路径。',
    },
    sarsa: {
      chapter: '第一章 · 表格型强化学习',
      name: 'SARSA',
      description: '在策略（on-policy）时序差分控制。与 Q-Learning 不同，SARSA 使用实际选择的下一步动作进行更新 — 在有灾难性惩罚的环境中更为安全。',
      calloutTitle: 'SARSA vs Q-Learning：悬崖行走的路径差异',
      calloutDesc: 'Q-Learning 选择贴近悬崖的最短路径（最优但危险）。SARSA 学会远离悬崖的安全路径，因为它将自身的 ε-greedy 探索失误纳入了考量。',
      updateTitle: '更新公式对比',
      sarsa_label: 'SARSA（在策略）',
      sarsa_desc: 'a\' = 在 s\' 中 ε-贪心实际选择的动作',
      ql_label: 'Q-Learning（离策略）',
      ql_desc: '始终使用最优下一动作，与实际执行无关',
      insightTitle: '核心洞察：在策略 vs 离策略',
      onpolicy_title: '在策略（SARSA）',
      onpolicy_points: [
        '学习当前所执行策略的价值',
        'ε-greedy 探索影响 Q 值的收敛结果',
        '更保守 — 在危险状态附近更安全',
        '收敛到安全的近似最优策略',
      ],
      offpolicy_title: '离策略（Q-Learning）',
      offpolicy_points: [
        '独立于行为策略，学习最优策略',
        '可从演示数据或随机探索中学习',
        '即使路径危险也能找到最优解',
        '可能无法预见探索阶段的失误',
      ],
    },
    dqn: {
      chapter: '第二章 · 深度值方法',
      name: 'DQN（深度 Q 网络）',
      description: '用神经网络替代 Q 表，使强化学习能够扩展到大规模状态空间。两项核心创新：经验回放缓冲区与目标网络。',
      archTitle: '网络结构',
      innovTitle: '核心创新',
      replayTitle: '经验回放',
      replayDesc: '将 (s, a, r, s\') 元组存入回放缓冲区，随机采样小批量打破时序相关性，使训练更稳定。',
      targetTitle: '目标网络',
      targetDesc: '冻结的目标网络副本提供稳定的 TD 目标，每隔固定步数（200步）同步一次参数。',
      evolutionTitle: '表格 Q-Learning → DQN 的演进',
      qtable: { title: 'Q 表', desc: '仅适用于小型离散状态空间，状态维度增加时规模指数级膨胀。' },
      nnet: { title: '神经网络拟合 Q', desc: '对任意状态近似 Q(s,a)，在相似状态间泛化，支持连续输入。' },
      tricks: { title: '训练稳定性技巧', desc: '缺少回放缓冲区或目标网络，训练会因时序相关性和移动目标而发散。' },
    },
    dueling_dqn: {
      chapter: '第二章 · 深度值方法',
      name: 'Dueling DQN（对决 DQN）',
      description: '将 Q 网络拆分为两个分支：V(s)（该状态有多好？）和 A(s,a)（动作 a 比平均好多少？）。在动作差异不明显时提升数据效率。',
      archLine: '共享骨干网络 →',
      archCombine: 'Q(s,a) = V(s) + A(s,a) − mean(A)',
      envLabel: '环境 + Q 值热力图',
      valueLabel: '状态价值 V(s)',
      valueDesc: 'V(s) 反映处于该位置的内在价值，与所选动作无关。',
      legendTitle: '热力图图例',
      legendQLabel: 'Q 值图（上）— max Q(s,a)',
      legendVLabel: '价值图（下）— V(s)',
      legendDesc: '当所有动作结果相近时（如开阔区域），V(s) 主导。A(s,a) 突出"选择哪个动作真正重要"的状态。',
      whyTitle: '为什么需要 Dueling？',
      whyDesc: '在许多状态下（如走廊中间），选什么动作差别不大。标准 DQN 仍须为每个动作独立学习 Q 值。Dueling DQN 先学 V(s)，仅在动作有明显差异时精化 A(s,a)，样本效率更高。',
    },
    a2c: {
      chapter: '第三章 · 策略梯度',
      name: 'A2C — 优势演员-评论家',
      description: '两个网络协同工作：演员（Actor）输出策略 π(a|s)，评论家（Critic）估计 V(s)。优势函数 A(s,a) = Q(s,a) − V(s) 告诉演员某动作相比平均水平好多少。',
      structTitle: '演员-评论家结构',
      envLabel_grid: '网格世界 — 策略箭头 + 价值热力图',
      envLabel_nav: '2D 导航 — 智能体轨迹',
      legendTitle: '网格世界图例',
      legendDesc: '背景色：V(s) 状态价值；箭头：策略 π(a|s)，透明度 ∝ 动作概率。',
      advantage: '优势：A(s,a) = r + γV(s\') − V(s)',
      action_nav: '动作 (ax, ay)',
    },
    ppo: {
      chapter: '第三章 · 策略梯度',
      name: 'PPO — 近端策略优化',
      description: '工业界标准策略梯度算法。通过裁剪策略更新比率防止过大的参数更新，比 A2C 更稳定、样本效率更高，同时支持离散和连续动作空间。',
      clipTitle: '核心思想：裁剪代理目标函数',
      clipNote: 'ε = 0.2 — 每次更新策略变化不超过 20%',
      compareTitle: 'PPO vs A2C',
      updateFreq: '更新频率',
      stepControl: '步长控制',
      sampleReuse: '样本复用',
      stability: '训练稳定性',
      a2c_vals: ['每 n 步更新一次', '仅梯度裁剪', '每个样本只用一次', '良好'],
      ppo_vals: ['每次 rollout 训练多个 epoch', '裁剪比率 + 梯度裁剪', '每次 rollout 复用 n_epochs 次', '更优 — 无灾难性更新'],
      whyTitle: '为什么选 PPO？',
      whyDesc: 'OpenAI 在 Dota 2 游戏、机器人灵巧操作以及 ChatGPT 的 RLHF 训练中均使用 PPO。实现简单、对超参数鲁棒，无需修改即可用于离散或连续动作空间。',
      envLabel_grid: '网格世界 — 策略 + 价值图',
      envLabel_nav: '2D 导航 — 连续控制',
    },
    playground: {
      chapter: '交互 · 自己动手',
      name: '网格世界游乐场',
      description: '自己设计迷宫 —— 点击放置墙壁、起点和终点，然后当场训练一个全新的表格型智能体，看它解开你画的布局。',
      brushTitle: '编辑工具',
      brushWall: '墙壁',
      brushStart: '起点',
      brushGoal: '终点',
      brushErase: '擦除',
      clear: '清空墙壁',
      algoTitle: '算法',
      train: '训练并求解',
      training: '训练中…',
      reached: '求解成功！智能体到达了终点。',
      notReached: '智能体未能到达终点 —— 试试移除一面墙或简化迷宫。',
      hint: '表格型 RL 没有泛化能力：换一个布局就意味着一张全新的 Q 表。但 6×6 网格训练耗时远小于一秒，所以编辑体感是实时的 —— 这是真正的即时训练，而非预训练推理。',
      designLabel: '设计 / 结果',
      sizeTitle: '网格尺寸',
      modeTitle: '模式',
      modeSolve: '直接求解',
      modeLearn: '观看学习',
      paramTitle: '超参数',
      alpha: '学习率 α',
      gamma: '折扣因子 γ',
      epsilon: '探索率 ε',
      episodes: '训练回合数',
      watchLearn: '训练并观看',
      learning: '学习中…',
      rewardCurve: '每回合奖励',
      episodeLabel: '回合',
      avgReward: '平均奖励',
      learnHint: '观看贪婪策略（箭头）和价值估计（颜色）随训练逐渐浮现。早期 ε 很高，智能体随机探索，箭头杂乱无章；随着 ε 衰减，策略逐渐收敛成一条清晰的路径。调节上方的 α / γ / ε，观察它们如何改变收敛的速度与稳定性。',
      learnNote: '箭头 = 当前贪婪策略 · 颜色 = 状态价值（最大 Q）',
    },
  },
}

// ------------------------------------------------------------------ //
//  Context + Provider                                                  //
// ------------------------------------------------------------------ //

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
}

function deepGet(obj: Record<string, any>, path: string): string | undefined {
  const val = path.split('.').reduce((o, k) => o?.[k], obj as any)
  return typeof val === 'string' ? val : undefined
}

type TFunc = (path: string, vars?: Record<string, string | number>) => string

interface LangCtx {
  lang: Lang
  toggle: () => void
  t: TFunc
}

const LangContext = createContext<LangCtx>({
  lang: 'zh',
  toggle: () => {},
  t: (p) => p,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')

  const toggle = () => setLang((l) => (l === 'en' ? 'zh' : 'en'))

  const t: TFunc = (path, vars) => {
    const raw =
      deepGet(T[lang] as any, path) ??
      deepGet(T['en'] as any, path) ??
      path
    return interpolate(raw, vars)
  }

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LangContext)
}
