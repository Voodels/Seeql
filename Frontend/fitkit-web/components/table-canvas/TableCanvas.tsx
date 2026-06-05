"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { StepTimeline } from "./StepTimeline"
import { GroupAnimation } from "./GroupAnimation"
import { CteAnimation } from "./CteAnimation"
import { DistinctAnimation } from "./DistinctAnimation"
import { JoinAnimation } from "./JoinAnimation"
import { WhereAnimation } from "./WhereAnimation"
import { SelectAnimation } from "./SelectAnimation"
import { OrderByAnimation } from "./OrderByAnimation"
import { LimitAnimation } from "./LimitAnimation"
import { TransitionAnimation } from "./TransitionAnimation"
import { AlertCircle } from "lucide-react"
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
  const [animComplete, setAnimComplete] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step = steps[currentStep]
  const data = step?.data ?? finalResult
  const previousData = currentStep > 0 ? steps[currentStep - 1]?.data : undefined

  const isGroupStep = step?.clause === "GROUP BY" && !!step?.groupColumns?.length
  const isCteStep = !!(step?.clause?.startsWith("WITH ") || step?.clause?.startsWith("CTE.WINDOW"))
  const isDistinctStep = step?.clause === "DISTINCT"
  const isJoinStep = !!(step?.clause?.includes("JOIN ") || (step?.clause?.startsWith("CTE.") && !step?.clause?.startsWith("CTE.BODY") && !step?.clause?.startsWith("CTE.WHERE") && !step?.clause?.startsWith("CTE.WINDOW") && step?.sql?.includes(" JOIN ")))
  const isWhereStep = step?.clause === "WHERE" || step?.clause === "CTE.WHERE" || step?.clause === "HAVING"
  const isSelectStep = step?.clause === "SELECT" || step?.clause === "CTE.BODY"
  const isOrderByStep = step?.clause === "ORDER BY" || step?.clause?.startsWith("ORDER BY")
  const isLimitStep = step?.clause === "LIMIT"
  const hasAnimation = isGroupStep || isCteStep || isDistinctStep || isJoinStep || isWhereStep || isSelectStep || isOrderByStep || isLimitStep

  useEffect(() => {
    if (step && onActiveClauseChange) onActiveClauseChange(step.clause)
  }, [currentStep, step, onActiveClauseChange])

  useEffect(() => {
    setCurrentStep(0)
    setIsPlaying(false)
    setAnimComplete(false)
  }, [steps.length])

  const goToStep = useCallback((index: number) => {
    setAnimComplete(false)
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
    if (hasAnimation && !animComplete) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    timerRef.current = setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
      setAnimComplete(false)
    }, 1200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isPlaying, currentStep, steps.length, hasAnimation, animComplete])

  const togglePlay = useCallback(() => {
    if (currentStep >= steps.length - 1) setCurrentStep(0)
    setIsPlaying((prev) => !prev)
  }, [currentStep, steps.length])

  const handleAnimComplete = useCallback(() => {
    setAnimComplete(true)
    if (!isPlaying && currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
      setAnimComplete(false)
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
            onComplete={handleAnimComplete}
          />
        ) : isCteStep && previousData ? (
          <CteAnimation
            key={step.clause}
            previousData={previousData}
            currentData={data}
            cteName={step.clause.replace("WITH ", "")}
            cteSql={step.sql}
            onComplete={handleAnimComplete}
          />
        ) : isDistinctStep && previousData ? (
          <DistinctAnimation
            key={step.clause}
            previousData={previousData}
            currentData={data}
            onComplete={handleAnimComplete}
          />
        ) : isJoinStep && previousData ? (
          <JoinAnimation
            key={step.clause}
            previousData={previousData}
            step={step}
            onComplete={handleAnimComplete}
          />
        ) : isWhereStep && previousData ? (
          <WhereAnimation
            key={step.clause}
            previousData={previousData}
            step={step}
            onComplete={handleAnimComplete}
          />
        ) : isSelectStep && previousData ? (
          <SelectAnimation
            key={step.clause}
            previousData={previousData}
            step={step}
            onComplete={handleAnimComplete}
          />
        ) : isOrderByStep && previousData ? (
          <OrderByAnimation
            key={step.clause}
            previousData={previousData}
            step={step}
            onComplete={handleAnimComplete}
          />
        ) : isLimitStep && previousData ? (
          <LimitAnimation
            key={step.clause}
            previousData={previousData}
            step={step}
            onComplete={handleAnimComplete}
          />
        ) : step?.extras?.error ? (
          <div className="p-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Error</p>
                <p className="text-xs text-muted-foreground mt-1">{step.extras.error}</p>
                <code className="text-[10px] block mt-2 font-mono bg-muted p-2 rounded text-muted-foreground">
                  {step.sql}
                </code>
              </div>
            </div>
          </div>
        ) : (
          <TransitionAnimation
            key={step.clause}
            previousData={previousData}
            step={step}
            onComplete={handleAnimComplete}
          />
        )}
      </div>
    </div>
  )
}
