"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square, Eye, EyeOff, Plus } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"

const PHASES = [
  { key: "all", label: "All Columns", desc: "All columns before projection" },
  { key: "marking", label: "Mark", desc: "Columns marked as kept or dropped" },
  { key: "buckets", label: "Keep / Drop", desc: "Columns split into kept and dropped buckets" },
  { key: "result", label: "Result", desc: "Final projected result vs original" },
]

interface SelectAnimationProps {
  previousData: TableData
  step: StepResult
  onComplete: () => void
}

export function SelectAnimation({ previousData, step, onComplete }: SelectAnimationProps) {
  const resultData = step.data
  const stepper = usePhaseStepper({ phases: PHASES, autoAdvanceMs: 2000, onComplete })

  const keptColumns = useMemo(
    () => previousData.columns.filter((c) => resultData.columns.includes(c)),
    [previousData, resultData]
  )

  const droppedColumns = useMemo(
    () => previousData.columns.filter((c) => !resultData.columns.includes(c)),
    [previousData, resultData]
  )

  const newColumns = useMemo(
    () => resultData.columns.filter((c) => !previousData.columns.includes(c)),
    [previousData, resultData]
  )

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
                  ? "bg-indigo-600 text-white"
                  : i < stepper.phaseIdx
                    ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
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
          {(stepper.phase.key === "all" || stepper.phase.key === "marking") && (
            <motion.div
              key="full-table"
              layout
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl"
            >
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                {stepper.phase.key === "all"
                  ? "All columns from previous step"
                  : "Columns marked for keep (green) or drop (red)"
                }
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-1.5 bg-background text-left w-6">#</th>
                      {previousData.columns.map((col) => {
                        const isKept = keptColumns.includes(col)
                        const isDropped = droppedColumns.includes(col)
                        return (
                          <th
                            key={col}
                            className={`px-3 py-1.5 bg-background text-left transition-all duration-500 ${
                              stepper.phase.key === "marking"
                                ? isKept
                                  ? "text-indigo-600 dark:text-indigo-400"
                                  : "text-red-400 dark:text-red-400"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {stepper.phase.key === "marking" && isKept && <Eye className="size-3 text-indigo-500" />}
                              {stepper.phase.key === "marking" && isDropped && <EyeOff className="size-3 text-red-400" />}
                              <span className={stepper.phase.key === "marking" && isDropped ? "line-through" : ""}>
                                {col}
                              </span>
                            </div>
                            {stepper.phase.key === "marking" && (
                              <div className={`text-[8px] font-normal mt-0.5 ${isKept ? "text-indigo-400" : "text-red-400"}`}>
                                {isKept ? "KEPT" : "DROPPED"}
                              </div>
                            )}
                          </th>
                        )
                      })}
                      {stepper.phase.key === "marking" && newColumns.map((col) => (
                        <th key={col} className="px-3 py-1.5 bg-background text-left text-emerald-500">
                          <div className="flex items-center gap-1.5">
                            <Plus className="size-3" />
                            {col}
                          </div>
                          <div className="text-[8px] font-normal text-emerald-400 mt-0.5">NEW</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previousData.rows.map((row, i) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        {previousData.columns.map((col) => {
                          const isKept = keptColumns.includes(col)
                          const isDropped = droppedColumns.includes(col)
                          return (
                            <td
                              key={col}
                              className={`px-3 py-1.5 truncate max-w-[100px] transition-all duration-500 ${
                                stepper.phase.key === "marking"
                                  ? isKept
                                    ? "font-semibold"
                                    : "text-red-300 line-through"
                                  : ""
                              }`}
                            >
                              {String(row[col] ?? "")}
                            </td>
                          )
                        })}
                        {stepper.phase.key === "marking" && newColumns.map((col) => {
                          const val = resultData.rows[i]?.[col]
                          return (
                            <td key={col} className="px-3 py-1.5">
                              <motion.span
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.04 }}
                                className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold"
                              >
                                {String(val ?? "")}
                              </motion.span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stepper.phase.key === "marking" && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground justify-center">
                  <span className="inline-flex items-center gap-1 text-indigo-500">
                    <Eye className="size-3" /> {keptColumns.length} kept
                  </span>
                  {droppedColumns.length > 0 && (
                    <>
                      <span className="text-muted-foreground/30">|</span>
                      <span className="inline-flex items-center gap-1 text-red-400">
                        <EyeOff className="size-3" /> {droppedColumns.length} dropped
                      </span>
                    </>
                  )}
                  {newColumns.length > 0 && (
                    <>
                      <span className="text-muted-foreground/30">|</span>
                      <span className="inline-flex items-center gap-1 text-emerald-500">
                        <Plus className="size-3" /> {newColumns.length} new
                      </span>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stepper.phase.key === "buckets" && (
            <motion.div
              key="column-buckets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-5xl"
            >
              <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">
                Columns organized by projection decision
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-lg border-2 border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800 p-3"
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Eye className="size-3" />
                    KEPT ({keptColumns.length} columns)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keptColumns.map((col, i) => (
                      <motion.div
                        key={col}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-background rounded px-2.5 py-1.5 text-[10px] font-mono border border-indigo-200 dark:border-indigo-800"
                      >
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{col}</span>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {previousData.columns.includes(col)
                            ? `${previousData.totalRows} values`
                            : `${resultData.totalRows} values`}
                        </div>
                      </motion.div>
                    ))}
                    {keptColumns.length === 0 && (
                      <div className="text-[10px] text-muted-foreground italic p-2">No columns kept</div>
                    )}
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
                    <EyeOff className="size-3" />
                    DROPPED ({droppedColumns.length} columns)
                    <span className="text-[9px] font-normal opacity-60 ml-auto">will be removed</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {droppedColumns.map((col, i) => (
                      <motion.div
                        key={col}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-background/60 rounded px-2.5 py-1.5 text-[10px] font-mono border border-red-200 dark:border-red-800"
                      >
                        <span className="line-through text-red-400">{col}</span>
                      </motion.div>
                    ))}
                    {droppedColumns.length === 0 && (
                      <div className="text-[10px] text-muted-foreground italic p-2">No columns dropped</div>
                    )}
                  </div>
                  {droppedColumns.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="mt-2 pt-2 border-t border-red-200 dark:border-red-800"
                    >
                      <div className="text-[10px] font-mono text-red-400 text-center">Dropping columns...</div>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {newColumns.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 rounded-lg border-2 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 text-center"
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-1 text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                    <Plus className="size-3" />
                    NEW COLUMNS ({newColumns.length})
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {newColumns.map((col) => (
                      <span key={col} className="bg-background rounded px-2 py-1 text-[10px] font-mono font-semibold border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                        {col}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {stepper.phase.key === "result" && (
          <motion.div key="select-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
            <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
              SELECT complete &mdash; {resultData.columns.length} columns, {resultData.totalRows} rows
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-400 shrink-0" />
                  Before ({previousData.columns.length} cols)
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-[10px] font-mono">
                    <thead className="bg-muted/50 text-[9px] font-semibold uppercase tracking-wider">
                      <tr>
                        {previousData.columns.map((col) => (
                          <th key={col} className={`px-2.5 py-1.5 bg-background text-left ${droppedColumns.includes(col) ? "text-red-400 line-through" : ""}`}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previousData.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border/30">
                          {previousData.columns.map((col) => (
                            <td key={col} className={`px-2.5 py-1.5 truncate max-w-[80px] ${droppedColumns.includes(col) ? "text-red-300 line-through" : ""}`}>
                              {String(row[col] ?? "")}
                            </td>
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
                  <span className="size-2 rounded-full bg-indigo-400 shrink-0" />
                  After &mdash; projected ({resultData.columns.length} cols)
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-[10px] font-mono">
                    <thead className="bg-muted/50 text-[9px] font-semibold uppercase tracking-wider">
                      <tr>
                        {resultData.columns.map((col) => (
                          <th key={col} className={`px-2.5 py-1.5 bg-background text-left ${newColumns.includes(col) ? "text-emerald-600" : "text-indigo-600"}`}>
                            {col}
                          </th>
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
                            <td key={col} className="px-2.5 py-1.5 truncate max-w-[80px] font-semibold">
                              {String(row[col] ?? "")}
                            </td>
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
