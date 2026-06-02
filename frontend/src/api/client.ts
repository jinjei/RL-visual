import type { AlgorithmMeta, DemoResponse, TrainingData, Snapshot, LiveTrainResponse } from '../types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json()
}

export interface GridTrainBody {
  algo: string
  rows: number
  cols: number
  start: [number, number]
  goal: [number, number]
  walls: [number, number][]
  alpha: number
  gamma: number
  epsilon: number
  episodes: number
}

export const api = {
  algorithms: () => get<AlgorithmMeta[]>('/algorithms'),
  demo: (algo: string, env: string) => get<DemoResponse>(`/demo/${algo}/${env}`),
  training: (algo: string, env: string) => get<TrainingData>(`/training/${algo}/${env}`),
  snapshots: (algo: string, env: string) => get<Snapshot[]>(`/snapshots/${algo}/${env}`),
  gridTrain: (body: GridTrainBody) =>
    post<DemoResponse & { reached_goal: boolean }>('/gridworld/train', body),
  gridTrainLive: (body: GridTrainBody) =>
    post<LiveTrainResponse>('/gridworld/train_live', body),
}
