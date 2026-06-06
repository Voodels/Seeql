"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Database } from "lucide-react"
import { usePhaseStepper, type PhaseConfig } from "@/hooks/use-phase-stepper"
import { rowKey, getTransitionDescription } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"
import { PhaseBar } from "./PhaseBar"
import { StepBadge } from "./StepBadge"
import { RowCard } from "./RowCard"
import { SideBySide } from "./SideBySide"

function getPhases(clause: string): PhaseConfig[] {
  const desc = getTransitionDescription(clause)
  return [
    { key: "before", label: "Before", desc },
    { key: "appearing", label: "Transition", desc },
    { key: "result", label: "Result", desc: `${desc} — complete` },
  ]
}

interface TransitionAnimationProps {
  previousData?: TableData
  step: StepResult
  onComplete: () => void
}

export function TransitionAnimation({ previousData, step, onComplete }: TransitionAnimationProps) {
  const resultData = step.data
  const phases = useMemo(() => getPhases(step.clause), [step.clause])
  const stepper = usePhaseStepper({ phases, autoAdvanceMs: 1800, onComplete })

  const hasPrevious = previousData && previousData.rows.length > 0

  const addedRows = useMemo(() => {
    if (!hasPrevious) return resultData.rows.map((r, i) => ({ row: r, idx: i, isNew: true }))
    const prevKeys = new Set(previousData.rows.map((r) => JSON.stringify(r)))
    return resultData.rows
      .map((r, i) => ({ row: r, idx: i, isNew: !prevKeys.has(JSON.stringify(r)) }))
  }, [resultData, previousData, hasPrevious])

  return (
    <div ref={stepper.containerRef} className="flex flex-col items-center gap-4 p-6 min-h-[450px]">
      <PhaseBar phases={phases} phaseIdx={stepper.phaseIdx} isPlaying={stepper.isPlaying} isFirst={stepper.isFirst} isLast={stepper.isLast} onGoPrev={stepper.goPrev} onGoNext={stepper.goNext} onGoTo={(i) => stepper.goTo(i)} onTogglePlay={stepper.handleTogglePlay} />

      <StepBadge clause={step.clause} sql={step.sql} totalRows={resultData.totalRows} previousRows={previousData?.totalRows} />

      <AnimatePresence mode="wait">
        {stepper.phase.key === "before" && (
          <motion.div
            key="before-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl"
          >
            <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide flex items-center gap-2">
              <Database className="size-3" />
              {hasPrevious
                ? `Previous state: ${previousData.totalRows} rows`
                : "No previous data — starting fresh"
              }
            </div>
            {hasPrevious ? (
              <div className="grid gap-1">
                {previousData.rows.map((row, i) => (
                  <RowCard key={rowKey(row, i)} row={row} columns={previousData.columns} index={i} totalRows={previousData.totalRows} staggerBase={0.02} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-border bg-muted/20">
                <span className="text-sm text-muted-foreground italic">Empty — no rows yet</span>
              </div>
            )}
          </motion.div>
        )}

        {stepper.phase.key === "appearing" && (
          <motion.div
            key="rows-appearing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl"
          >
            <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
              {resultData.totalRows} rows {hasPrevious ? "after transformation" : "loaded"}
            </div>
            <div className="grid gap-1">
              {addedRows.slice(0, 50).map(({ row, idx, isNew }) => (
                <RowCard key={rowKey(row, idx)} row={row} columns={resultData.columns} index={idx} totalRows={resultData.totalRows} staggerBase={0.03}
                  leftBorderColor={isNew === false ? "#22c55e" : undefined}
                  badge={isNew === false ? "kept" : undefined}
                  badgeColor={isNew === false ? "text-green-500" : undefined}
                />
              ))}
              {addedRows.length > 50 && (
                <div className="text-[10px] text-muted-foreground text-center py-2">
                  ... and {addedRows.length - 50} more rows
                </div>
              )}
            </div>
          </motion.div>
        )}

        {stepper.phase.key === "result" && (
          <motion.div
            key="transition-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl"
          >
            <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
              {step.clause} complete &mdash; {resultData.totalRows} rows, {resultData.columns.length} columns
            </div>
            {hasPrevious ? (
              <SideBySide leftData={previousData} rightData={resultData} leftLabel={`Before (${previousData.totalRows} rows)`} rightLabel={`After (${resultData.columns.length} cols, ${resultData.totalRows} rows)`} leftColor="bg-slate-400" rightColor="bg-indigo-400" />
            ) : (
              <SideBySide leftData={resultData} rightData={resultData} leftLabel={`Result (${resultData.columns.length} cols, ${resultData.totalRows} rows)`} rightLabel="" leftColor="bg-slate-400" rightColor="bg-slate-400" />
            )}
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="default" onClick={onComplete}>Continue to next step &rarr;</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
