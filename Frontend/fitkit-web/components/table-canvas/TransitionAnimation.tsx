"use client"

import { useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square, Database } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey, getClauseBadgeColor } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"

const PHASES = [
  { key: "before", label: "Before", desc: "State before this operation" },
  { key: "appearing", label: "Transition", desc: "Rows appearing one by one" },
  { key: "result", label: "Result", desc: "Final result with summary" },
]

interface TransitionAnimationProps {
  previousData?: TableData
  step: StepResult
  onComplete: () => void
}

export function TransitionAnimation({ previousData, step, onComplete }: TransitionAnimationProps) {
  const resultData = step.data
  const stepper = usePhaseStepper({ phases: PHASES, autoAdvanceMs: 1800, onComplete })

  const hasPrevious = previousData && previousData.rows.length > 0

  const addedRows = useMemo(() => {
    if (!hasPrevious) return resultData.rows.map((r, i) => ({ row: r, idx: i, isNew: true }))
    const prevKeys = new Set(previousData.rows.map((r) => JSON.stringify(r)))
    return resultData.rows
      .map((r, i) => ({ row: r, idx: i, isNew: !prevKeys.has(JSON.stringify(r)) }))
  }, [resultData, previousData, hasPrevious])

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
                  ? "bg-slate-600 text-white"
                  : i < stepper.phaseIdx
                    ? "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400"
                    : "bg-muted text-muted-foreground/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{PHASES[stepper.phaseIdx].desc}</span>
      </div>

      <div className="flex items-center gap-2 w-full max-w-4xl">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getClauseBadgeColor(step.clause)}`}>
          {step.clause}
        </span>
        <code className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded flex-1 truncate font-mono">
          {step.sql}
        </code>
      </div>

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
                  <motion.div
                    key={rowKey(row, i)}
                    initial={{ opacity: 0, y: -5 }}
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
                <motion.div
                  key={rowKey(row, idx)}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.03, duration: 0.3 }}
                  className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: isNew === false ? "#22c55e" : "transparent",
                    backgroundColor: isNew === false ? "rgba(34,197,94,0.04)" : "",
                  }}
                >
                  <span className="text-muted-foreground w-5 shrink-0">{idx + 1}</span>
                  {resultData.columns.map((col) => (
                    <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                  ))}
                  {isNew === false && (
                    <span className="text-[10px] text-green-500 font-bold shrink-0">kept</span>
                  )}
                </motion.div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {hasPrevious && (
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-slate-400 shrink-0" />
                    Before ({previousData.totalRows} rows)
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
                    {previousData.rows.length > 5 && (
                      <div className="text-[9px] text-muted-foreground px-2.5 py-1 border-t border-border/30">
                        ... and {previousData.rows.length - 5} more rows
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className={hasPrevious ? "" : "col-span-full"}>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className={`size-2 rounded-full shrink-0 ${hasPrevious ? "bg-indigo-400" : "bg-slate-400"}`} />
                  {hasPrevious ? "After" : "Result"} ({resultData.columns.length} cols, {resultData.totalRows} rows)
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
                      {resultData.rows.slice(0, 10).map((row, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-t border-border/30"
                        >
                          {resultData.columns.map((col) => (
                            <td key={col} className="px-2.5 py-1.5 truncate max-w-[80px]">{String(row[col] ?? "")}</td>
                          ))}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {resultData.rows.length > 10 && (
                    <div className="text-[9px] text-muted-foreground px-2.5 py-1 border-t border-border/30">
                      ... and {resultData.rows.length - 10} more rows
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="default" onClick={onComplete}>Continue to next step &rarr;</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
