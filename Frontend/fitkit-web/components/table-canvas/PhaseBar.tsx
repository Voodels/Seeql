"use client"

import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square } from "lucide-react"

export interface Phase {
  key: string
  label: string
  desc: string
}

interface PhaseBarProps {
  phases: Phase[]
  phaseIdx: number
  isPlaying: boolean
  isFirst: boolean
  isLast: boolean
  onGoPrev: () => void
  onGoNext: () => void
  onGoTo: (idx: number) => void
  onTogglePlay: () => void
}

export function PhaseBar({ phases, phaseIdx, isPlaying, isFirst, isLast, onGoPrev, onGoNext, onGoTo, onTogglePlay }: PhaseBarProps) {
  return (
    <div className="flex items-center gap-3 w-full max-w-4xl">
      <div className="flex items-center gap-1">
        <Button size="icon-xs" variant="ghost" onClick={onGoPrev} disabled={isFirst}>
          <StepBack className="size-3" />
        </Button>
        <Button size="icon-xs" variant={isPlaying ? "destructive" : "default"} onClick={onTogglePlay}>
          {isPlaying ? <Square className="size-3" /> : <Play className="size-3" />}
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={onGoNext} disabled={isLast}>
          <StepForward className="size-3" />
        </Button>
      </div>
      <div className="flex items-center gap-1.5 flex-1">
        {phases.map((p, i) => (
          <button
            key={p.key}
            onClick={() => onGoTo(i)}
            className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded transition-all whitespace-nowrap ${
              i === phaseIdx
                ? "bg-foreground/10 text-foreground border border-foreground/20"
                : i < phaseIdx
                  ? "bg-muted text-muted-foreground"
                  : "bg-transparent text-muted-foreground/30"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap truncate max-w-[200px]">{phases[phaseIdx].desc}</span>
    </div>
  )
}
