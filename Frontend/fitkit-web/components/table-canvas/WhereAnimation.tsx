"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey, staggerDelay } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"
import { PhaseBar } from "./PhaseBar"
import { StepBadge } from "./StepBadge"
import { RowCard } from "./RowCard"
import { SideBySide } from "./SideBySide"

const PHASES = [
  { key: "rows", label: "All Rows", desc: "Rows before WHERE filter" },
  { key: "evaluating", label: "Evaluate", desc: "Each row checked against condition" },
  { key: "buckets", label: "Pass / Fail", desc: "Rows split into pass and fail buckets" },
  { key: "result", label: "Result", desc: "Filtered result vs original" },
]

interface WhereAnimationProps {
  previousData: TableData
  step: StepResult
  onComplete: () => void
}

export function WhereAnimation({ previousData, step, onComplete }: WhereAnimationProps) {
  const resultData = step.data
  const stepper = usePhaseStepper({ phases: PHASES, autoAdvanceMs: 2200, onComplete })

  const { passed, failed } = useMemo(() => {
    const resultKeys = new Set(resultData.rows.map((r) => JSON.stringify(r)))
    const p: { row: Record<string, unknown>; idx: number }[] = []
    const f: { row: Record<string, unknown>; idx: number }[] = []
    previousData.rows.forEach((row, i) => {
      if (resultKeys.has(JSON.stringify(row))) {
        p.push({ row, idx: i })
      } else {
        f.push({ row, idx: i })
      }
    })
    return { passed: p, failed: f }
  }, [previousData, resultData])

  return (
    <div ref={stepper.containerRef} className="flex flex-col items-center gap-4 p-6 min-h-[450px]">
      <PhaseBar phases={PHASES} phaseIdx={stepper.phaseIdx} isPlaying={stepper.isPlaying} isFirst={stepper.isFirst} isLast={stepper.isLast} onGoPrev={stepper.goPrev} onGoNext={stepper.goNext} onGoTo={(i) => stepper.goTo(i)} onTogglePlay={stepper.handleTogglePlay} />

      <StepBadge clause={step.clause} sql={step.sql} totalRows={resultData.totalRows} previousRows={previousData?.totalRows} />

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {(stepper.phase.key === "rows" || stepper.phase.key === "evaluating") && (
            <motion.div
              key="all-rows"
              layout
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl"
            >
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                {stepper.phase.key === "rows"
                  ? "All rows before WHERE filter"
                  : "Evaluating each row against condition"
                }
              </div>
              <div className="grid gap-1">
                {previousData.rows.map((row, i) => {
                  const isPass = passed.some((p) => p.idx === i)
                  return (
                    <RowCard key={rowKey(row, i)} row={row} columns={previousData.columns} index={i} totalRows={previousData.totalRows} staggerBase={0.05}
                      variant={stepper.phase.key === "evaluating" ? (isPass ? "pass" : "fail") : "default"}
                      badge={stepper.phase.key === "evaluating" ? (isPass ? "PASS" : "FAIL") : undefined}
                      badgeColor={stepper.phase.key === "evaluating" ? (isPass ? "text-green-500" : "text-red-500") : undefined}
                    />
                  )
                })}
              </div>
              {stepper.phase.key === "evaluating" && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground justify-center">
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <Check className="size-3" /> {passed.length} pass
                  </span>
                  <span className="text-muted-foreground/30">|</span>
                  <span className="inline-flex items-center gap-1 text-red-500">
                    <X className="size-3" /> {failed.length} filtered out
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stepper.phase.key === "buckets" && (
            <motion.div
              key="where-buckets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-5xl"
            >
              <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">
                Rows split by filter result
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-lg border-2 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3"
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Check className="size-3" />
                    PASS ({passed.length} rows)
                  </div>
                  <div className="space-y-1 min-h-[40px]">
                    {passed.map(({ row, idx }) => (
                      <motion.div
                        key={rowKey(row, idx)}
                        layoutId={`where-row-${rowKey(row, idx)}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: staggerDelay(idx, previousData.totalRows, 0.03) }}
                        className="bg-background/80 rounded px-2.5 py-1.5 text-[10px] font-mono border border-emerald-200 dark:border-emerald-800"
                      >
                        <div className="flex gap-2">
                          {previousData.columns.map((col) => (
                            <span key={col} className="flex-1 truncate">{String(row[col] ?? "")}</span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="rounded-lg border-2 border-red-300 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800 p-3"
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 text-red-500 dark:text-red-400 flex items-center gap-1.5">
                    <X className="size-3" />
                    FAIL ({failed.length} rows)
                    <span className="text-[9px] font-normal opacity-60 ml-auto">will be removed</span>
                  </div>
                  <div className="space-y-1 min-h-[40px]">
                    {failed.map(({ row, idx }) => (
                      <motion.div
                        key={rowKey(row, idx)}
                        layoutId={`where-row-${rowKey(row, idx)}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: staggerDelay(idx, previousData.totalRows, 0.03) }}
                        className="bg-background/80 rounded px-2.5 py-1.5 text-[10px] font-mono border border-red-200 dark:border-red-800"
                      >
                        <div className="flex gap-2">
                          {previousData.columns.map((col) => (
                            <span key={col} className="flex-1 truncate">{String(row[col] ?? "")}</span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-2 pt-2 border-t border-red-200 dark:border-red-800"
                  >
                    <div className="text-[10px] font-mono text-red-400 text-center">Removing...</div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {stepper.phase.key === "result" && (
          <motion.div key="where-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
            <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
              WHERE complete &mdash; {resultData.totalRows} rows kept out of {previousData.totalRows}
            </div>
            <SideBySide leftData={previousData} rightData={resultData} leftLabel={`Before (${previousData.columns.length} cols, ${previousData.totalRows} rows)`} rightLabel={`After — filtered (${resultData.totalRows} rows)`} leftColor="bg-blue-400" rightColor="bg-amber-400" />
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="default" onClick={onComplete}>Continue to next step &rarr;</Button>
            </div>
          </motion.div>
        )}
      </LayoutGroup>
    </div>
  )
}
