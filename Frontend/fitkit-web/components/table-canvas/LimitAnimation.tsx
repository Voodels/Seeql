"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square, ArrowUpFromLine, Check, X } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"

const PHASES = [
  { key: "all", label: "All Rows", desc: "All rows before LIMIT" },
  { key: "cutoff", label: "Cutoff", desc: "Cutoff line shown, excess rows marked" },
  { key: "removing", label: "Remove", desc: "Excess rows removed above cutoff" },
  { key: "result", label: "Result", desc: "Limited result vs original" },
]

interface LimitAnimationProps {
  previousData: TableData
  step: StepResult
  onComplete: () => void
}

export function LimitAnimation({ previousData, step, onComplete }: LimitAnimationProps) {
  const resultData = step.data
  const stepper = usePhaseStepper({ phases: PHASES, autoAdvanceMs: 2000, onComplete })

  const keptCount = resultData.totalRows
  const removedCount = previousData.totalRows - keptCount

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
                  ? "bg-orange-600 text-white"
                  : i < stepper.phaseIdx
                    ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
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
          {(stepper.phase.key === "all" || stepper.phase.key === "cutoff") && (
            <motion.div
              key="all-rows"
              layout
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl"
            >
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                {stepper.phase.key === "all"
                  ? `All ${previousData.totalRows} rows before LIMIT`
                  : `Cutoff at ${keptCount} rows — ${removedCount} will be removed`
                }
              </div>
              <div className="grid gap-1 relative">
                {previousData.rows.map((row, i) => {
                  const isRemoved = i >= keptCount
                  return (
                    <motion.div
                      key={rowKey(row, i)}
                      layoutId={`limit-row-${i}`}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        backgroundColor: stepper.phase.key === "cutoff" && isRemoved
                          ? "rgba(239,68,68,0.08)"
                          : "transparent",
                      }}
                      exit={{ opacity: 0, height: 0, marginBottom: -8 }}
                      transition={{ duration: 0.4, delay: stepper.phase.key === "cutoff" ? (i - keptCount) * 0.02 : 0 }}
                      className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono relative"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: stepper.phase.key === "cutoff" && isRemoved
                          ? "#ef4444"
                          : stepper.phase.key === "cutoff"
                            ? "#22c55e"
                            : "transparent",
                      }}
                    >
                      <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      {previousData.columns.map((col) => (
                        <span key={col} className={`flex-1 truncate min-w-0 ${stepper.phase.key === "cutoff" && isRemoved ? "text-red-400 line-through" : ""}`}>
                          {String(row[col] ?? "")}
                        </span>
                      ))}
                      {stepper.phase.key === "cutoff" && (
                        <span className={`text-[10px] font-bold shrink-0 ${isRemoved ? "text-red-400" : "text-green-500"}`}>
                          {isRemoved ? "Cut" : "Keep"}
                        </span>
                      )}
                      {stepper.phase.key === "cutoff" && i === keptCount - 1 && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4 }}
                          className="absolute -bottom-0 left-0 right-0 h-[2px] bg-orange-500 origin-left"
                          style={{ transform: "translateY(8px)" }}
                        />
                      )}
                    </motion.div>
                  )
                })}
                {stepper.phase.key === "cutoff" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 text-[10px] text-orange-500 font-bold mt-1 justify-center"
                  >
                    <ArrowUpFromLine className="size-3" />
                    LIMIT {keptCount} — rows above are cut off
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stepper.phase.key === "removing" && (
            <motion.div key="removing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl">
              <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">
                Removing {removedCount} rows beyond LIMIT {keptCount}
              </div>
              <div className="grid gap-1">
                {previousData.rows.slice(0, keptCount).map((row, i) => (
                  <motion.div
                    key={rowKey(row, i)}
                    layoutId={`limit-row-${i}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 px-4 py-2 rounded border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 bg-card text-xs font-mono"
                    style={{ borderLeftWidth: 3, borderLeftColor: "#22c55e" }}
                  >
                    <span className="text-green-500 shrink-0"><Check className="size-3" /></span>
                    {previousData.columns.map((col) => (
                      <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                    ))}
                    <span className="text-[10px] font-bold text-green-500 shrink-0">Kept</span>
                  </motion.div>
                ))}
                {previousData.rows.slice(keptCount).map((row, i) => (
                  <motion.div
                    key={`removed-${keptCount + i}`}
                    layoutId={`limit-row-${keptCount + i}`}
                    layout
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0, height: 0, marginBottom: -8, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-2 rounded border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-xs font-mono overflow-hidden"
                  >
                    <span className="text-red-400 shrink-0"><X className="size-3" /></span>
                    {previousData.columns.map((col) => (
                      <span key={col} className="flex-1 truncate min-w-0 text-red-400 line-through">{String(row[col] ?? "")}</span>
                    ))}
                    <span className="text-[10px] font-bold text-red-400 shrink-0">Removed</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {stepper.phase.key === "result" && (
          <motion.div key="limit-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
            <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
              LIMIT complete &mdash; {resultData.totalRows} rows out of {previousData.totalRows}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-orange-400 shrink-0" />
                  After &mdash; limited ({resultData.totalRows} rows)
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
