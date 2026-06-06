"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface SpeedContextType {
  speed: number
  setSpeed: (s: number) => void
  multiplier: number
}

const SpeedContext = createContext<SpeedContextType>({ speed: 0, setSpeed: () => {}, multiplier: 1 })

const SPEEDS = [0.5, 1, 2, 5]

export function SpeedProvider({ children }: { children: ReactNode }) {
  const [speedIdx, setSpeedIdx] = useState(1)
  const setSpeed = useCallback((s: number) => {
    const idx = SPEEDS.indexOf(s)
    if (idx >= 0) setSpeedIdx(idx)
  }, [])
  return (
    <SpeedContext.Provider value={{ speed: SPEEDS[speedIdx], setSpeed, multiplier: SPEEDS[speedIdx] }}>
      {children}
    </SpeedContext.Provider>
  )
}

export function useSpeed() {
  return useContext(SpeedContext)
}

export function getSpeedOptions() {
  return SPEEDS
}
