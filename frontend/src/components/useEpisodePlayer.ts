import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import type { DemoResponse, TrainingData } from '../types'

export function useEpisodePlayer(algo: string, initialEnv: string) {
  const [env, setEnv] = useState(initialEnv)
  const [demo, setDemo] = useState<DemoResponse | null>(null)
  const [training, setTraining] = useState<TrainingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(5) // steps/sec

  const fetchDemo = useCallback(async (envOverride?: string) => {
    const targetEnv = envOverride ?? env
    setLoading(true)
    setError(null)
    setPlaying(false)
    setCurrentStep(0)
    setDemo(null)
    try {
      const data = await api.demo(algo, targetEnv)
      setDemo(data)
    } catch (e: any) {
      setError(e.message ?? 'Failed to load demo. Make sure the backend is running and train.py has been executed.')
    } finally {
      setLoading(false)
    }
  }, [algo, env])

  const switchEnv = useCallback((newEnv: string) => {
    setEnv(newEnv)
    setDemo(null)
    setTraining(null)
    setCurrentStep(0)
    setPlaying(false)
    // fetch training curve for new env
    api.training(algo, newEnv).then(setTraining).catch(() => {})
  }, [algo])

  // Fetch training curve on env change
  useEffect(() => {
    api.training(algo, env).then(setTraining).catch(() => {})
  }, [algo, env])

  // Animation timer
  useEffect(() => {
    if (!playing || !demo) return
    if (currentStep >= demo.episode.length) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), 1000 / speed)
    return () => clearTimeout(timer)
  }, [playing, currentStep, demo, speed])

  const play = () => {
    if (!demo) { fetchDemo(); return }
    if (currentStep >= demo.episode.length) setCurrentStep(0)
    setPlaying(true)
  }
  const pause = () => setPlaying(false)
  const reset = () => { setCurrentStep(0); setPlaying(false) }
  const stepForward = () => {
    if (!demo) return
    setCurrentStep((s) => Math.min(s + 1, demo.episode.length - 1))
  }

  const currentStepData = demo?.episode[Math.min(currentStep, (demo?.episode.length ?? 1) - 1)]

  return {
    env, switchEnv,
    demo, training, loading, error,
    currentStep, currentStepData,
    playing, speed, setSpeed,
    play, pause, reset, stepForward, fetchDemo,
  }
}
