"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey, getGroupColor, staggerDelay } from "@/lib/animation-utils"
import type { TableData } from "@/lib/types"
import { PhaseBar } from "./PhaseBar"
import { SideBySide } from "./SideBySide"

const PHASES = [
  { key: "rows", label: "All Rows", desc: "All rows before DISTINCT" },
  { key: "marking", label: "Mark Duplicates", desc: "Rows color-coded by duplicate group" },
  { key: "removing", label: "Remove Duplicates", desc: "Duplicate rows are removed — keep first, drop rest" },
  { key: "result", label: "Final Result", desc: "Distinct result vs original — side by side" },
]

interface DistinctAnimationProps {
  previousData: TableData
  currentData: TableData
  onComplete: () => void
}

/** Build a composite key from all column values */
function rowValues(row: Record<string, unknown>, columns: string[]): string {
  return columns.map((c) => String(row[c] ?? "")).join("|")
}

export function DistinctAnimation({ previousData, currentData, onComplete }: DistinctAnimationProps) {
  const stepper = usePhaseStepper({ phases: PHASES, autoAdvanceMs: 1800, onComplete })
  const columns = previousData.columns.length > currentData.columns.length ? previousData.columns : currentData.columns

  // Build groups of duplicate rows (in the pre-DISTINCT data)
  const groups = useMemo(() => {
    const seen = new Map<string, { firstIdx: number; indices: number[] }>()
    previousData.rows.forEach((row, i) => {
      const key = rowValues(row, previousData.columns)
      if (seen.has(key)) {
        seen.get(key)!.indices.push(i)
      } else {
        seen.set(key, { firstIdx: i, indices: [i] })
      }
    })
    return Array.from(seen.entries()).map(([key, val], i) => ({
      key,
      firstIdx: val.firstIdx,
      indices: val.indices,
      isDuplicate: val.indices.length > 1,
      color: getGroupColor(i),
    }))
  }, [previousData])

  return (
    <div ref={stepper.containerRef} className="flex flex-col items-center gap-4 p-6 min-h-[450px]">
      <PhaseBar phases={PHASES} phaseIdx={stepper.phaseIdx} isPlaying={stepper.isPlaying} isFirst={stepper.isFirst} isLast={stepper.isLast} onGoPrev={stepper.goPrev} onGoNext={stepper.goNext} onGoTo={(i) => stepper.goTo(i)} onTogglePlay={stepper.handleTogglePlay} />

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {(stepper.phase.key === "rows" || stepper.phase.key === "marking") && (
            <motion.div key="all-rows" layout initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-3xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                {stepper.phase.key === "rows" ? "All rows before DISTINCT" : "Rows color-coded by duplicate group"}
              </div>
              <div className="grid gap-1">
                {previousData.rows.map((row, i) => {
                  const gIdx = groups.findIndex((g) => g.indices.includes(i))
                  const color = gIdx >= 0 ? getGroupColor(gIdx) : null
                  const g = groups[gIdx]
                  const isFirst = g?.firstIdx === i
                  const isDup = g?.isDuplicate && !isFirst
                  return (
                    <motion.div
                      key={rowKey(row, i)}
                      layoutId={`distinct-row-${rowKey(row, i)}`}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        backgroundColor: stepper.phase.key === "marking" && g ? (isDup ? "rgba(239,68,68,0.06)" : color?.bg || "transparent") : "transparent",
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4, delay: stepper.phase.key === "marking" ? staggerDelay(i, previousData.totalRows, 0.03) : 0 }}
                      className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                      style={{ borderLeftWidth: 3, borderLeftColor: stepper.phase.key === "marking" && g ? color?.border.replace("border-", "") : "transparent" }}
                    >
                      <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      {previousData.columns.map((col) => (
                        <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                      ))}
                      {stepper.phase.key === "marking" && g && (
                        <span className={`text-[10px] font-bold uppercase shrink-0 ${isDup ? "text-red-400" : g?.color.text || ""}`}>
                          {isFirst ? "Keep" : isDup ? "Remove" : "Unique"}
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
          {stepper.phase.key === "removing" && (
            <motion.div key="removing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-3xl">
              <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">
                Removing {groups.filter((g) => g.isDuplicate).reduce((acc, g) => acc + g.indices.length - 1, 0)} duplicate rows
              </div>
              <div className="grid gap-1">
                {groups.map((g) => {
                  // Show only one representative row with a badge
                  const firstRow = previousData.rows[g.firstIdx]
                  return (
                    <div key={g.key} className="space-y-0.5">
                      {/* Kept row */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                        style={{ borderLeftWidth: 3, borderLeftColor: g.color.border.replace("border-", "") }}
                      >
                        <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                        {previousData.columns.map((col) => (
                          <span key={col} className="flex-1 truncate min-w-0">{String(firstRow[col] ?? "")}</span>
                        ))}
                        <span className={`text-[10px] font-bold shrink-0 ${g.color.text}`}>
                          {g.isDuplicate ? "Kept" : "Unique"}
                        </span>
                      </motion.div>
                      {/* Removed duplicates */}
                      {g.indices.slice(1).map((dupIdx) => {
                        const dupRow = previousData.rows[dupIdx]
                        return (
                          <motion.div
                            key={`dup-${dupIdx}`}
                            layoutId={`distinct-row-${rowKey(dupRow, dupIdx)}`}
                            layout
                            initial={{ opacity: 1, x: 0 }}
                            animate={{ opacity: 0, x: 60, height: 0, marginBottom: -8 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="flex items-center gap-3 px-4 py-2 rounded border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-xs font-mono"
                          >
                            <span className="text-red-400 text-[10px] font-bold shrink-0">&#10007;</span>
                            {previousData.columns.map((col) => (
                              <span key={col} className="flex-1 truncate min-w-0 text-red-400 line-through">{String(dupRow[col] ?? "")}</span>
                            ))}
                            <span className="text-[10px] font-bold shrink-0 text-red-400">Removed</span>
                          </motion.div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-[10px] text-muted-foreground text-center">
                {currentData.totalRows} unique rows kept out of {previousData.totalRows} original rows
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {stepper.phase.key === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
              DISTINCT complete — {currentData.totalRows} rows, {currentData.columns.length} columns
            </div>
            <SideBySide leftData={previousData} rightData={currentData} leftLabel={`Before — all rows (${previousData.columns.length} cols)`} rightLabel={`After — distinct rows (${currentData.columns.length} cols)`} leftColor="bg-blue-400" rightColor="bg-rose-400" />
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="default" onClick={onComplete}>Continue to next step &rarr;</Button>
            </div>
          </motion.div>
        )}
      </LayoutGroup>
    </div>
  )
}
