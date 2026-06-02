export interface AlgorithmMeta {
  id: string
  name: string
  chapter: number
  type: 'tabular' | 'deep_value' | 'policy_gradient'
  color: string
  envs: string[]
  tagline: string
}

export interface GridConfig {
  rows: number
  cols: number
  start: [number, number]
  goal: [number, number]
  walls: [number, number][]
  cliff_cells: [number, number][]
}

export interface EpisodeStep {
  state: number[] | [number, number]
  action: number | number[]
  reward: number
  done: boolean
  q_values?: number[]
  value?: number
  log_prob?: number
}

export interface DemoResponse {
  env_config: GridConfig | NavConfig | CartPoleConfig
  episode: EpisodeStep[]
  total_reward: number
  // tabular
  q_table?: number[][]
  policy?: number[]
  // DQN
  q_map?: number[][]
  // Dueling DQN
  value_map?: number[]
  advantage_map?: number[][]
  // Policy gradient
  policy_map?: number[][]
  // Nav2D
  trajectory?: [number, number][]
}

export interface NavConfig {
  type: 'nav2d'
  obstacles: { cx: number; cy: number; r: number }[]
  goal: { cx: number; cy: number; r: number }
  bounds: [number, number, number, number]
}

export interface CartPoleConfig {
  type: 'cartpole'
  obs_dim: number
  n_actions: number
}

export interface TrainingData {
  rewards: number[]
  smoothed: number[]
}

export interface Snapshot {
  episode: number
  q_table: number[][]
  epsilon?: number
}

export interface LiveFrame {
  episode: number
  policy: number[]
  heatmap: number[]
  epsilon?: number
  avg_reward: number
}

export interface LiveTrainResponse {
  env_config: GridConfig
  total_episodes: number
  frames: LiveFrame[]
  reward_curve: number[]
  final: {
    episode: EpisodeStep[]
    total_reward: number
    policy: number[]
    q_table: number[][]
    reached_goal: boolean
  }
}
