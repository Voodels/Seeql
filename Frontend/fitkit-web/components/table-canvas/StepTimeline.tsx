"use client"

import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StepResult } from "@/lib/types"

interface StepTimelineProps {
  steps: StepResult[]
  currentStep: number
  onStepChange: (step: number) => void
  isPlaying: boolean
  onPlayToggle: () => void
}

const clauseColors: Record<string, string> = {
  FROM: "border-blue-500 text-blue-600",
  WHERE: "border-orange-500 text-orange-600",
  "GROUP BY": "border-purple-500 text-purple-600",
  HAVING: "border-red-500 text-red-600",
  ORDER: "border-cyan-500 text-cyan-600",
  SELECT: "border-emerald-500 text-emerald-600",
}

export function StepTimeline({ steps, currentStep, onStepChange, isPlaying, onPlayToggle }: StepTimelineProps) {
  return (
    <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
      <div className="flex items-center gap-1">
        <Button size="icon-xs" variant="ghost" onClick={() => onStepChange(0)} disabled={currentStep === 0}>
          <StepBack className="size-3" />
        </Button>
        <Button size="icon-xs" variant={isPlaying ? "destructive" : "default"} onClick={onPlayToggle}>
          {isPlaying ? <Square className="size-3" /> : <Play className="size-3" />}
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={() => onStepChange(currentStep + 1)} disabled={currentStep >= steps.length - 1}>
          <StepForward className="size-3" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 ml-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => onStepChange(i)}
            className={cn(
              "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded border transition-all",
              i === currentStep
                ? "bg-foreground text-background border-foreground"
                : i < currentStep
                  ? "bg-muted text-muted-foreground border-border"
                  : "bg-transparent text-muted-foreground/40 border-border/50",
            )}
          >
            {step.clause}
            {step.extras?.error && (
              <AlertCircle className="size-2.5 text-destructive ml-0.5 inline" />
            )}
          </button>
        ))}
      </div>

      <div className="ml-auto text-[11px] text-muted-foreground">
        Step {currentStep + 1} / {steps.length}
        <span className="ml-2 text-[10px]">
          ({steps[currentStep].data.totalRows} rows)
        </span>
      </div>
    </div>
  )
}
