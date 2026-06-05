"use client"

import { useState, useCallback, useEffect, useRef } from "react"

export interface PhaseConfig {
  key: string
  label: string
  desc: string
}

interface PhaseStepperOptions {
  phases: PhaseConfig[]
  autoAdvanceMs?: number
  onComplete?: () => void
}

export function usePhaseStepper({ phases, autoAdvanceMs = 1800, onComplete }: PhaseStepperOptions) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Clamp to safe range in the CURRENT render (handles phases.length changes)
  const safeIdx = Math.min(phaseIdx, Math.max(0, phases.length - 1))
  if (phaseIdx !== safeIdx) setPhaseIdx(safeIdx)

  const phase = phases[safeIdx]

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < phases.length) setPhaseIdx(idx)
  }, [phases.length])

  const goNext = useCallback(() => goTo(safeIdx + 1), [goTo, safeIdx])
  const goPrev = useCallback(() => goTo(safeIdx - 1), [goTo, safeIdx])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      if (safeIdx >= phases.length - 1) setPhaseIdx(0)
      setIsPlaying(true)
    }
  }, [isPlaying, safeIdx, phases.length])

  useEffect(() => {
    if (isPlaying) {
      if (safeIdx >= phases.length - 1) {
        setIsPlaying(false)
        onComplete?.()
        return
      }
      const t = setTimeout(() => goNext(), autoAdvanceMs)
      return () => clearTimeout(t)
    }
  }, [isPlaying, safeIdx, phases.length, autoAdvanceMs, goNext, onComplete])

  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [safeIdx])

  return {
    phase,
    phaseIdx: safeIdx,
    phases,
    isPlaying,
    isFirst: safeIdx === 0,
    isLast: safeIdx >= phases.length - 1,
    goTo,
    goNext,
    goPrev,
    handleTogglePlay,
    containerRef,
  }
}
