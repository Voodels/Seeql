"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square, ArrowUpDown } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"

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
      <div className="flex items-center gap-3 w-full max-w-4xl">
        <div className="flex items-center gap-1">
          <Button size="icon-xs" variant="ghost" onClick={stepper.goPrev} disabled={stepper.isFirst}>
            <StepBack className="size-3" />
          </Button>
          <Button size="icon-xs" variant={stepper.isPlaying ? "destructive" : "default"} onClick={stepper.handleTogglePlay}>
            {stepper.isPlaying ? <Square className="size-3" /> : <Play className="size-3" />}
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={stepper.goNext} disabled={stepper.isLast}>
            <StepForward className="size-3" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          {PHASES.map((p, i) => (
            <button
              key={p.key}
              onClick={() => stepper.goTo(i)}
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded transition-all whitespace-nowrap ${
                i === stepper.phaseIdx
                  ? "bg-blue-600 text-white"
                  : i < stepper.phaseIdx
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-muted text-muted-foreground/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{PHASES[stepper.phaseIdx].desc}</span>
      </div>

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {stepper.phase.key === "unsorted" && (
            <motion.div key="unsorted" layout initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-4xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                Original row order (unsorted)
              </div>
              <div className="grid gap-1">
                {previousData.rows.map((row, i) => (
                  <motion.div
                    key={rowKey(row, i)}
                    layoutId={`sort-row-${rowKey(row, i)}`}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                  >
                    <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                    {previousData.columns.map((col) => (
                      <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                    ))}
                  </motion.div>
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
                    <motion.div
                      key={rowKey(row, origIdx)}
                      layoutId={`sort-row-${rowKey(row, origIdx)}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        backgroundColor: origIdx !== newIdx ? "rgba(59,130,246,0.06)" : "transparent",
                      }}
                      transition={{ duration: 0.5, delay: newIdx * 0.04 }}
                      className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: origIdx !== newIdx ? "#3b82f6" : "transparent",
                      }}
                    >
                      <span className="text-muted-foreground w-5 shrink-0">{origIdx + 1}</span>
                      {previousData.columns.map((col) => (
                        <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                      ))}
                      {origIdx !== newIdx && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[10px] text-blue-500 font-bold shrink-0"
                        >
                          moved &darr;
                        </motion.span>
                      )}
                    </motion.div>
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
                    transition={{ delay: i * 0.04 }}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-400 shrink-0" />
                  Original order ({previousData.totalRows} rows)
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-[10px] font-mono">
                    <thead className="bg-muted/50 text-[9px] font-semibold uppercase tracking-wider">
                      <tr>
                        {previousData.columns.map((col) => (
                          <th key={col} className="px-2.5 py-1.5 bg-background text-left">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previousData.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border/30">
                          {previousData.columns.map((col) => (
                            <td key={col} className="px-2.5 py-1.5 truncate max-w-[80px]">{String(row[col] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-400 shrink-0" />
                  Sorted ({resultData.totalRows} rows)
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-[10px] font-mono">
                    <thead className="bg-muted/50 text-[9px] font-semibold uppercase tracking-wider">
                      <tr>
                        {resultData.columns.map((col) => (
                          <th key={col} className="px-2.5 py-1.5 bg-background text-left">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultData.rows.map((row, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-t border-border/30"
                        >
                          {resultData.columns.map((col) => (
                            <td key={col} className="px-2.5 py-1.5 truncate max-w-[80px] font-semibold">{String(row[col] ?? "")}</td>
                          ))}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="default" onClick={onComplete}>Continue to next step &rarr;</Button>
            </div>
          </motion.div>
        )}
      </LayoutGroup>
    </div>
  )
}
