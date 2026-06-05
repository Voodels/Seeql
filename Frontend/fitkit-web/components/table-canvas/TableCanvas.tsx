"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { StepTimeline } from "./StepTimeline"
import { AnimatedTable } from "./AnimatedTable"
import { GroupAnimation } from "./GroupAnimation"
import type { StepResult, TableData } from "@/lib/types"

interface TableCanvasProps {
  steps: StepResult[]
  finalResult: TableData
  onActiveClauseChange?: (clause: string) => void
}

export function TableCanvas({ steps, finalResult, onActiveClauseChange }: TableCanvasProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [groupAnimComplete, setGroupAnimComplete] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step = steps[currentStep]
  const data = step?.data ?? finalResult

  const previousData = currentStep > 0
    ? steps[currentStep - 1]?.data
    : undefined

  const isGroupStep = step?.clause === "GROUP BY" && !!step?.groupColumns?.length

  // Notify parent about active clause
  useEffect(() => {
    if (step && onActiveClauseChange) {
      onActiveClauseChange(step.clause)
    }
  }, [currentStep, step, onActiveClauseChange])

  // Reset when steps change
  useEffect(() => {
    setCurrentStep(0)
    setIsPlaying(false)
    setGroupAnimComplete(false)
  }, [steps.length])

  const goToStep = useCallback((index: number) => {
    setGroupAnimComplete(false)
    setCurrentStep(Math.max(0, Math.min(index, steps.length - 1)))
  }, [steps.length])

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false)
      return
    }
    // For GROUP BY steps, wait for animation to complete
    if (isGroupStep && !groupAnimComplete) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    timerRef.current = setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
      setGroupAnimComplete(false)
    }, 1200)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentStep, steps.length, isGroupStep, groupAnimComplete])

  const togglePlay = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0)
    }
    setIsPlaying((prev) => !prev)
  }, [currentStep, steps.length])

  const handleGroupComplete = useCallback(() => {
    setGroupAnimComplete(true)
  }, [])

  if (!steps.length) return null

  return (
    <div className="flex flex-col h-full">
      <StepTimeline
        steps={steps}
        currentStep={currentStep}
        onStepChange={goToStep}
        isPlaying={isPlaying}
        onPlayToggle={togglePlay}
      />
      <div className="flex-1 overflow-auto">
        {step && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <span className={clsx("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded", CLAUSE_BADGE_COLORS[step.clause] || "bg-muted text-muted-foreground")}>
              {step.clause}
            </span>
            <code className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded flex-1 truncate">
              {step.sql}
            </code>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {step.data.totalRows} rows
              {previousData && (
                <span className="ml-1 text-muted-foreground/50">
                  (was {previousData.totalRows})
                </span>
              )}
            </span>
          </div>
        )}

        {isGroupStep && previousData ? (
          <GroupAnimation
            previousData={previousData}
            step={step}
            onComplete={handleGroupComplete}
          />
        ) : (
          <div className="p-4">
            <AnimatedTable
              data={data}
              previousData={previousData}
              clause={step?.clause}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const CLAUSE_BADGE_COLORS: Record<string, string> = {
  FROM: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  WHERE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "GROUP BY": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  HAVING: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "ORDER BY": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  SELECT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

function clsx(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}
