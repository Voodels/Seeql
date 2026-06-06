"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey, staggerDelay } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"
import { PhaseBar } from "./PhaseBar"
import { RowCard } from "./RowCard"
import { SideBySide } from "./SideBySide"

const PHASES = [
  { key: "unsorted", label: "Unsorted", desc: "Rows in original order" },
  { key: "sorting", label: "Sorting", desc: "Rows rearranged by sort key" },
  { key: "sorted", label: "Sorted", desc: "Final sorted order with rank" },
  { key: "result", label: "Result", desc: "Sorted vs original side by side" },
]

interface OrderByAnimationProps {
  previousData: TableData
  step: StepResult
  onComplete: () => void
}

export function OrderByAnimation({ previousData, step, onComplete }: OrderByAnimationProps) {
  const resultData = step.data
  const stepper = usePhaseStepper({ phases: PHASES, autoAdvanceMs: 2000, onComplete })

  const sortColumns = useMemo(() => {
    return resultData.columns.filter((c) => !previousData.columns.includes(c))
  }, [previousData, resultData])

  return (
    <div ref={stepper.containerRef} className="flex flex-col items-center gap-4 p-6 min-h-[450px]">
      <PhaseBar phases={PHASES} phaseIdx={stepper.phaseIdx} isPlaying={stepper.isPlaying} isFirst={stepper.isFirst} isLast={stepper.isLast} onGoPrev={stepper.goPrev} onGoNext={stepper.goNext} onGoTo={(i) => stepper.goTo(i)} onTogglePlay={stepper.handleTogglePlay} />

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {stepper.phase.key === "unsorted" && (
            <motion.div key="unsorted" layout initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-4xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                Original row order (unsorted)
              </div>
              <div className="grid gap-1">
                {previousData.rows.map((row, i) => (
                  <RowCard key={rowKey(row, i)} row={row} columns={previousData.columns} index={i} totalRows={previousData.totalRows} staggerBase={0.02} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stepper.phase.key === "sorting" && (
            <motion.div key="sorting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide flex items-center gap-2">
                <ArrowUpDown className="size-3" />
                Rows rearranged by sort key
                {previousData.columns.length > 0 && (
                  <span className="text-[10px] font-normal text-muted-foreground/60">
                    (sort key: {previousData.columns.join(", ")})
                  </span>
                )}
              </div>
              <div className="grid gap-1">
                {(() => {
                  const sorted = [...previousData.rows].map((r, i) => ({ row: r, origIdx: i }))
                  return sorted.map(({ row, origIdx }, newIdx) => (
                    <RowCard key={rowKey(row, origIdx)} row={row} columns={previousData.columns} index={origIdx + 1} totalRows={previousData.totalRows} staggerBase={0.04}
                      variant={origIdx !== newIdx ? "moved" : "default"}
                      badge={origIdx !== newIdx ? "moved ↓" : undefined}
                      badgeColor={origIdx !== newIdx ? "text-blue-500" : undefined}
                    />
                  ))
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stepper.phase.key === "sorted" && (
            <motion.div key="sorted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                Final sorted order with rankings
              </div>
              <div className="grid gap-1">
                {resultData.rows.map((row, i) => (
                  <motion.div
                    key={`result-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: staggerDelay(i, resultData.totalRows, 0.04) }}
                    className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                    style={{ borderLeftWidth: 3, borderLeftColor: "#3b82f6" }}
                  >
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    {resultData.columns.map((col) => (
                      <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                    ))}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {stepper.phase.key === "result" && (
          <motion.div key="sort-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
            <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
              ORDER BY complete &mdash; {resultData.totalRows} rows sorted
            </div>
            <SideBySide leftData={previousData} rightData={resultData} leftLabel={`Original order (${previousData.totalRows} rows)`} rightLabel={`Sorted (${resultData.totalRows} rows)`} leftColor="bg-slate-400" rightColor="bg-blue-400" />
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="default" onClick={onComplete}>Continue to next step &rarr;</Button>
            </div>
          </motion.div>
        )}
      </LayoutGroup>
    </div>
  )
}
