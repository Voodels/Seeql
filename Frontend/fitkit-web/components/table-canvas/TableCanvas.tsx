"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { StepTimeline } from "./StepTimeline"
import { AlertCircle, Gauge } from "lucide-react"
import { getAnimationType } from "@/lib/animation-utils"
import { useSpeed, getSpeedOptions } from "@/hooks/use-speed"
import { StepBadge } from "./StepBadge"
import type { StepResult, TableData } from "@/lib/types"

const GroupAnimation = dynamic(() => import("./GroupAnimation").then((m) => ({ default: m.GroupAnimation })), { ssr: false })
const CteAnimation = dynamic(() => import("./CteAnimation").then((m) => ({ default: m.CteAnimation })), { ssr: false })
const DistinctAnimation = dynamic(() => import("./DistinctAnimation").then((m) => ({ default: m.DistinctAnimation })), { ssr: false })
const JoinAnimation = dynamic(() => import("./JoinAnimation").then((m) => ({ default: m.JoinAnimation })), { ssr: false })
const WhereAnimation = dynamic(() => import("./WhereAnimation").then((m) => ({ default: m.WhereAnimation })), { ssr: false })
const SelectAnimation = dynamic(() => import("./SelectAnimation").then((m) => ({ default: m.SelectAnimation })), { ssr: false })
const OrderByAnimation = dynamic(() => import("./OrderByAnimation").then((m) => ({ default: m.OrderByAnimation })), { ssr: false })
const LimitAnimation = dynamic(() => import("./LimitAnimation").then((m) => ({ default: m.LimitAnimation })), { ssr: false })
const TransitionAnimation = dynamic(() => import("./TransitionAnimation").then((m) => ({ default: m.TransitionAnimation })), { ssr: false })

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

  const animType = getAnimationType(step)
  const hasAnimation = animType !== "error"
  const { speed, setSpeed } = useSpeed()

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
    }, 1200 / speed)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [isPlaying, currentStep, steps.length, hasAnimation, animComplete, speed])

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
          <div className="px-4 pt-3 pb-1 flex items-center gap-4">
            <StepBadge clause={step.clause} sql={step.sql} totalRows={step.data.totalRows} previousRows={previousData?.totalRows} />
            <div className="flex items-center gap-1 shrink-0">
              <Gauge className="size-3 text-muted-foreground/40" />
              {getSpeedOptions().map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded transition-all ${
                    speed === s
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground/30 hover:text-muted-foreground"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}

        {animType === "group" && previousData ? (
          <GroupAnimation key={step.clause} previousData={previousData} step={step} onComplete={handleAnimComplete} />
        ) : animType === "cte" && previousData ? (
          <CteAnimation key={step.clause} previousData={previousData} currentData={data} cteName={step.clause.replace("WITH ", "")} cteSql={step.sql} onComplete={handleAnimComplete} />
        ) : animType === "distinct" && previousData ? (
          <DistinctAnimation key={step.clause} previousData={previousData} currentData={data} onComplete={handleAnimComplete} />
        ) : animType === "join" && previousData ? (
          <JoinAnimation key={step.clause} previousData={previousData} step={step} onComplete={handleAnimComplete} />
        ) : animType === "where" && previousData ? (
          <WhereAnimation key={step.clause} previousData={previousData} step={step} onComplete={handleAnimComplete} />
        ) : animType === "select" && previousData ? (
          <SelectAnimation key={step.clause} previousData={previousData} step={step} onComplete={handleAnimComplete} />
        ) : animType === "orderby" && previousData ? (
          <OrderByAnimation key={step.clause} previousData={previousData} step={step} onComplete={handleAnimComplete} />
        ) : animType === "limit" && previousData ? (
          <LimitAnimation key={step.clause} previousData={previousData} step={step} onComplete={handleAnimComplete} />
        ) : animType === "error" && (step?.error || step?.extras?.error) ? (
          <div className="p-4">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {step.errorType ? `${step.errorType} Error` : "Error"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{step.error || step.extras?.error}</p>
                <code className="text-[10px] block mt-2 font-mono bg-muted p-2 rounded text-muted-foreground">{step.sql}</code>
              </div>
            </div>
          </div>
        ) : (
          <TransitionAnimation key={step.clause} previousData={previousData} step={step} onComplete={handleAnimComplete} />
        )}
      </div>
    </div>
  )
}
