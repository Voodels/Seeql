"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey, getGroupColor } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"

const PHASES = [
  { key: "rows", label: "Original Rows", desc: "Rows before GROUP BY" },
  { key: "flying", label: "Assign to Groups", desc: "Rows color-coded by group" },
  { key: "buckets", label: "Group Buckets", desc: "Rows organized into group containers" },
  { key: "collapsing", label: "Collapse into Aggregates", desc: "Each group collapses to one row" },
  { key: "result", label: "Final Result", desc: "Grouped result vs original — side by side" },
]

interface GroupAnimationProps {
  previousData: TableData
  step: StepResult
  onComplete: () => void
}

export function GroupAnimation({ previousData, step, onComplete }: GroupAnimationProps) {
  const groupColumns = step.groupColumns || []
  const resultData = step.data

  const stepper = usePhaseStepper({ phases: PHASES, autoAdvanceMs: 1800, onComplete })

  const groups = useMemo(() => {
    const map = new Map<string, Record<string, unknown>[]>()
    for (const row of previousData.rows) {
      const key = groupColumns.map((c) => String(row[c] ?? "")).join(" | ")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return Array.from(map.entries()).map(([key, rows], i) => ({
      key,
      rows,
      color: getGroupColor(i),
    }))
  }, [previousData, groupColumns])

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
                  ? "bg-purple-600 text-white"
                  : i < stepper.phaseIdx
                    ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
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
          {(stepper.phase.key === "rows" || stepper.phase.key === "flying") && (
            <motion.div
              key="original-rows"
              layout
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-3xl"
            >
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                {stepper.phase.key === "rows" ? "All rows before GROUP BY" : "Rows color-coded by group"}
              </div>
              <div className="grid gap-1">
                {previousData.rows.map((row, i) => {
                  const groupKey = groupColumns.map((c) => String(row[c] ?? "")).join(" | ")
                  const gIdx = groups.findIndex((g) => g.key === groupKey)
                  const color = getGroupColor(gIdx)
                  return (
                    <motion.div
                      key={rowKey(row, i)}
                      layoutId={`row-${rowKey(row, i)}`}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        backgroundColor: stepper.phase.key === "flying" ? color.bg : "transparent",
                        borderLeftColor: stepper.phase.key === "flying" ? color.border.replace("border-", "") : "transparent",
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4, delay: stepper.phase.key === "flying" ? i * 0.04 : 0 }}
                      className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                      style={{ borderLeftWidth: 3 }}
                    >
                      <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      {previousData.columns.map((col) => (
                        <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                      ))}
                      {stepper.phase.key === "flying" && (
                        <span className={`text-[10px] font-bold uppercase shrink-0 ${color.text}`}>
                          &rarr; {groupKey}
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(stepper.phase.key === "buckets" || stepper.phase.key === "collapsing") && (
            <motion.div
              key="group-buckets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-5xl"
            >
              <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">
                {stepper.phase.key === "buckets" ? "Rows inside group buckets" : "Each group collapses into one aggregate row"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <motion.div
                    key={group.key}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`rounded-lg border-2 ${group.color.border} ${group.color.bg} p-3`}
                  >
                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${group.color.text} flex items-center gap-1.5`}>
                      <span className="size-2 rounded-full bg-current shrink-0" />
                      {group.key}
                      <span className="text-[10px] opacity-60 font-normal ml-auto">({group.rows.length} rows)</span>
                    </div>
                    <div className="space-y-1 min-h-[60px]">
                      {group.rows.map((row, i) => (
                        <motion.div
                          key={rowKey(row, i)}
                          layoutId={`row-${rowKey(row, i)}`}
                          layout
                          animate={{
                            opacity: stepper.phase.key === "collapsing" ? 0 : 1,
                            height: stepper.phase.key === "collapsing" ? 0 : "auto",
                            scale: stepper.phase.key === "collapsing" ? 0.5 : 1,
                            marginBottom: stepper.phase.key === "collapsing" ? -24 : 4,
                          }}
                          transition={{ duration: 0.5, delay: i * 0.06 }}
                          className="bg-background/80 rounded px-2.5 py-1.5 text-[10px] font-mono border border-border/50"
                        >
                          <div className="flex gap-2">
                            {previousData.columns.map((col) => (
                              <span key={col} className="flex-1 truncate">{String(row[col] ?? "")}</span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {stepper.phase.key === "collapsing" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-2 pt-2 border-t border-border/50"
                      >
                        <div className="text-[10px] font-mono text-muted-foreground">
                          Aggregate result will appear...
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {stepper.phase.key === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
              GROUP BY complete — {resultData.totalRows} rows, {resultData.columns.length} columns
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-400" />
                  Before ({previousData.columns.length} cols)
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
                            <td key={col} className="px-2.5 py-1.5 truncate max-w-[100px]">{String(row[col] ?? "")}</td>
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
                  <span className="size-2 rounded-full bg-purple-400" />
                  After — grouped result ({resultData.columns.length} cols)
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
                            <td key={col} className="px-2.5 py-1.5 truncate max-w-[100px] font-semibold">{String(row[col] ?? "")}</td>
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
