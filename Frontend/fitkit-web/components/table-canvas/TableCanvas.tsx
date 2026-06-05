"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { StepTimeline } from "./StepTimeline"
import { AnimatedTable } from "./AnimatedTable"
import { GroupAnimation } from "./GroupAnimation"
import { CteAnimation } from "./CteAnimation"
import { DistinctAnimation } from "./DistinctAnimation"
import { JoinAnimation } from "./JoinAnimation"
import { getClauseBadgeColor } from "@/lib/animation-utils"
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
  const previousData = currentStep > 0 ? steps[currentStep - 1]?.data : undefined

  const isGroupStep = step?.clause === "GROUP BY" && !!step?.groupColumns?.length
  const isCteStep = step?.clause?.startsWith("WITH ") ?? false
  const isDistinctStep = step?.clause === "DISTINCT"
  const isJoinStep = step?.clause?.startsWith("JOIN ") ?? false

  useEffect(() => {
    if (step && onActiveClauseChange) onActiveClauseChange(step.clause)
  }, [currentStep, step, onActiveClauseChange])

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
    if ((isGroupStep || isCteStep || isDistinctStep || isJoinStep) && !groupAnimComplete) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    timerRef.current = setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
      setGroupAnimComplete(false)
    }, 1200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isPlaying, currentStep, steps.length, isGroupStep, isCteStep, groupAnimComplete])

  const togglePlay = useCallback(() => {
    if (currentStep >= steps.length - 1) setCurrentStep(0)
    setIsPlaying((prev) => !prev)
  }, [currentStep, steps.length])

  const handleGroupComplete = useCallback(() => {
    setGroupAnimComplete(true)
    // When not in auto-play, advance immediately
    if (!isPlaying && currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
      setGroupAnimComplete(false)
    }
  }, [isPlaying, currentStep, steps.length])

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
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getClauseBadgeColor(step.clause)}`}>
              {step.clause}
            </span>
            <code className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded flex-1 truncate font-mono">
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
            key={step.clause}
            previousData={previousData}
            step={step}
            onComplete={handleGroupComplete}
          />
        ) : isCteStep && previousData ? (
          <CteAnimation
            key={step.clause}
            previousData={previousData}
            currentData={data}
            cteName={step.clause.replace("WITH ", "")}
            cteSql={step.sql}
            onComplete={handleGroupComplete}
          />
        ) : isDistinctStep && previousData ? (
          <DistinctAnimation
            key={step.clause}
            previousData={previousData}
            currentData={data}
            onComplete={handleGroupComplete}
          />
        ) : isJoinStep && previousData ? (
          <JoinAnimation
            key={step.clause}
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
