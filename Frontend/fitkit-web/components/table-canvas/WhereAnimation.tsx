"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square, Check, X } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"

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
                  ? "bg-amber-600 text-white"
                  : i < stepper.phaseIdx
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-muted text-muted-foreground/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{PHASES[stepper.phaseIdx].desc}</span>
      </div>

      <div className="w-full max-w-4xl text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-2 border text-center font-mono truncate">
        {step.sql}
      </div>

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
                    <motion.div
                      key={rowKey(row, i)}
                      layoutId={`where-row-${rowKey(row, i)}`}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        backgroundColor: stepper.phase.key === "evaluating"
                          ? isPass ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"
                          : "transparent",
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4, delay: stepper.phase.key === "evaluating" ? i * 0.05 : 0 }}
                      className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: stepper.phase.key === "evaluating"
                          ? isPass ? "#22c55e" : "#ef4444"
                          : "transparent",
                      }}
                    >
                      <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      {previousData.columns.map((col) => (
                        <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                      ))}
                      {stepper.phase.key === "evaluating" && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, delay: i * 0.05 + 0.3 }}
                          className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPass
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {isPass ? <Check className="size-3" /> : <X className="size-3" />}
                          {isPass ? "PASS" : "FAIL"}
                        </motion.span>
                      )}
                    </motion.div>
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
                        transition={{ delay: idx * 0.03 }}
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
                        transition={{ delay: idx * 0.03 }}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-400 shrink-0" />
                  Before ({previousData.columns.length} cols, {previousData.totalRows} rows)
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
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-400 shrink-0" />
                  After &mdash; filtered ({resultData.totalRows} rows)
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
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
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
