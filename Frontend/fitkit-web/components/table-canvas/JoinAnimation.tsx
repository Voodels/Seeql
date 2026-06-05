"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey, getGroupColor } from "@/lib/animation-utils"
import type { StepResult } from "@/lib/types"

const PHASES = [
  { key: "left", label: "Left Table", desc: "Rows from the left table" },
  { key: "right", label: "Right Table", desc: "Rows from the right table with match indicators" },
  { key: "matching", label: "Matching", desc: "Matching color-coded pairs" },
  { key: "result", label: "Joined Result", desc: "Final joined table" },
]

interface JoinAnimationProps {
  previousData: StepResult["data"]
  step: StepResult
  onComplete: () => void
}

interface MatchInfo {
  leftIdx: number
  rightIdx: number
  colorIdx: number
}

export function JoinAnimation({ previousData, step, onComplete }: JoinAnimationProps) {
  const stepper = usePhaseStepper({ phases: PHASES, autoAdvanceMs: 1800, onComplete })
  const extras = step.extras
  const rightData = extras?.rightTableData
  const onCondition = extras?.onCondition ?? ""
  const resultData = step.data

  // Build match pairs: (leftIdx, rightIdx) for each joined row
  // Match by comparing left/right column values against the result row
  const matchPairs = useMemo(() => {
    if (!rightData) return []
    const pairs: MatchInfo[] = []
    const leftCols = previousData.columns
    const rightCols = rightData.columns

    for (const row of resultData.rows) {
      for (let li = 0; li < previousData.rows.length; li++) {
        const leftRow = previousData.rows[li]
        const leftMatch = leftCols.every((c) => String(row[c] ?? "") === String(leftRow[c] ?? ""))
        if (!leftMatch) continue
        for (let ri = 0; ri < rightData.rows.length; ri++) {
          const rightRow = rightData.rows[ri]
          const rightMatch = rightCols.every((c) => String(row[c] ?? "") === String(rightRow[c] ?? ""))
          if (rightMatch) {
            pairs.push({ leftIdx: li, rightIdx: ri, colorIdx: pairs.length })
          }
        }
      }
    }
    return pairs
  }, [resultData, previousData, rightData])

  // Which left rows have at least one match
  const matchedLeftRows = useMemo(() => {
    const s = new Set<number>()
    for (const p of matchPairs) s.add(p.leftIdx)
    return s
  }, [matchPairs])

  // Which right rows have at least one match
  const matchedRightRows = useMemo(() => {
    const s = new Set<number>()
    for (const p of matchPairs) s.add(p.rightIdx)
    return s
  }, [matchPairs])

  // For each left row, the set of matching right row indices
  const leftToRight = useMemo(() => {
    const m = new Map<number, number[]>()
    for (const p of matchPairs) {
      const arr = m.get(p.leftIdx) ?? []
      arr.push(p.rightIdx)
      m.set(p.leftIdx, arr)
    }
    return m
  }, [matchPairs])

  // For each right row, the set of matching left row indices
  const rightToLeft = useMemo(() => {
    const m = new Map<number, number[]>()
    for (const p of matchPairs) {
      const arr = m.get(p.rightIdx) ?? []
      arr.push(p.leftIdx)
      m.set(p.rightIdx, arr)
    }
    return m
  }, [matchPairs])

  return (
    <div ref={stepper.containerRef} className="flex flex-col items-center gap-4 p-6 min-h-[450px]">
      <div className="flex items-center gap-3 w-full max-w-5xl">
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

      <div className="w-full text-center text-[11px] font-mono text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border max-w-5xl">
        <span className="font-bold">ON</span> {onCondition}
      </div>

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {/* Phase 1: Left table */}
          {stepper.phase.key === "left" && (
            <motion.div key="left-table" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-3xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                Left table: {extras?.leftTable ?? "?"} ({previousData.totalRows} rows)
              </div>
              <div className="grid gap-1">
                {previousData.rows.map((row, i) => (
                  <motion.div
                    key={rowKey(row, i)}
                    layoutId={`left-row-${rowKey(row, i)}`}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.03 }}
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

          {/* Phase 2: Right table */}
          {stepper.phase.key === "right" && rightData && (
            <motion.div key="right-table" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-3xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                Right table: {extras?.rightTable ?? "?"} ({rightData.totalRows} rows)
              </div>
              <div className="grid gap-1">
                {rightData.rows.map((row, i) => {
                  const hasMatch = matchedRightRows.has(i)
                  return (
                    <motion.div
                      key={rowKey(row, i)}
                      layoutId={`right-row-${rowKey(row, i)}`}
                      layout
                      initial={{ opacity: 0, x: 30 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        backgroundColor: hasMatch ? "rgba(34,197,94,0.06)" : "transparent",
                      }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: hasMatch ? "#22c55e" : "transparent",
                      }}
                    >
                      <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      {rightData.columns.map((col) => (
                        <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                      ))}
                      {hasMatch && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">Match</span>}
                      {!hasMatch && (
                        <span className="text-[10px] font-bold text-muted-foreground/40 shrink-0">No match</span>
                      )}
                    </motion.div>
                  )
                })}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                {extras?.joinType ?? "INNER"} JOIN — {matchedRightRows.size} / {rightData.totalRows} rows matched
              </div>
            </motion.div>
          )}

          {/* Phase 3: Matching pairs */}
          {stepper.phase.key === "matching" && (
            <motion.div key="matching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl">
              <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
                {matchPairs.length} matching pair{matchPairs.length !== 1 ? "s" : ""} — each color represents a match
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left side */}
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-400 shrink-0" />
                    {extras?.leftTable ?? "Left"}
                  </div>
                  <div className="grid gap-1">
                    {previousData.rows.map((row, i) => {
                      const matches = leftToRight.get(i) ?? []
                      const color = matches.length > 0 ? getGroupColor(i) : null
                      return (
                        <motion.div
                          key={rowKey(row, i)}
                          layoutId={`left-row-${rowKey(row, i)}`}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: 1,
                            backgroundColor: matches.length > 0 ? "rgba(59,130,246,0.04)" : "transparent",
                          }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                          style={{
                            borderLeftWidth: 3,
                            borderLeftColor: matches.length > 0 ? "#3b82f6" : "transparent",
                          }}
                        >
                          <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                          {previousData.columns.map((col) => (
                            <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                          ))}
                          {matches.length > 0 && (
                            <span className="text-[10px] font-bold text-blue-500 shrink-0">
                              &times;{matches.length}
                            </span>
                          )}
                          {matches.length === 0 && (
                            <span className="text-[10px] font-bold text-muted-foreground/40 shrink-0">—</span>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
                {/* Right side */}
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
                    {extras?.rightTable ?? "Right"}
                  </div>
                  <div className="grid gap-1">
                    {rightData?.rows.map((row, i) => {
                      const matches = rightToLeft.get(i) ?? []
                      const color = matches.length > 0 ? getGroupColor(i + previousData.rows.length) : null
                      return (
                        <motion.div
                          key={rowKey(row, i)}
                          layoutId={`right-row-${rowKey(row, i)}`}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: matches.length > 0 ? 1 : 0.35,
                            backgroundColor: matches.length > 0 ? "rgba(34,197,94,0.04)" : "transparent",
                          }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                          style={{
                            borderLeftWidth: 3,
                            borderLeftColor: matches.length > 0 ? "#22c55e" : "transparent",
                          }}
                        >
                          <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                          {rightData.columns.map((col) => (
                            <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
                          ))}
                          {matches.length > 0 && (
                            <span className="text-[10px] font-bold text-emerald-500 shrink-0">
                              &times;{matches.length}
                            </span>
                          )}
                          {matches.length === 0 && (
                            <span className="text-[10px] font-bold text-muted-foreground/40 shrink-0">—</span>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Matching connection lines visualization */}
              {matchPairs.length > 0 && (
                <div className="mt-4">
                  <div className="grid gap-1">
                    {matchPairs.slice(0, 20).map((pair, i) => {
                      const color = getGroupColor(pair.colorIdx)
                      const leftRow = previousData.rows[pair.leftIdx]
                      const rightRow = rightData!.rows[pair.rightIdx]
                      return (
                        <motion.div
                          key={`pair-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded border bg-card text-[10px] font-mono"
                          style={{ borderLeftWidth: 3, borderLeftColor: color.border.replace("border-", "") }}
                        >
                          <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                          <span className="text-blue-600 dark:text-blue-400 shrink-0 font-bold">L{pair.leftIdx + 1}</span>
                          <span className="text-muted-foreground/50">&#8594;</span>
                          <span className="text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">R{pair.rightIdx + 1}</span>
                          <span className="text-muted-foreground/30 mx-1">|</span>
                          <span className="truncate text-muted-foreground">
                            {previousData.columns[0]}: {String(leftRow[previousData.columns[0]] ?? "")}
                            {rightData && rightData.columns.length > 0
                              ? ` / ${rightData.columns[0]}: ${String(rightRow[rightData.columns[0]] ?? "")}`
                              : ""}
                          </span>
                        </motion.div>
                      )
                    })}
                    {matchPairs.length > 20 && (
                      <div className="text-[9px] text-muted-foreground text-center mt-1">
                        ... and {matchPairs.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 4: Final result */}
        {stepper.phase.key === "result" && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
            <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
              {extras?.joinType ?? "INNER"} JOIN complete — {resultData.totalRows} rows, {resultData.columns.length} columns
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
                  {resultData.rows.map((row, i) => {
                    const pair = matchPairs[i]
                    const color = pair ? getGroupColor(pair.colorIdx) : null
                    return (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-t border-border/30"
                        style={color ? {
                          backgroundColor: `${color.bg.replace("bg-", "").replace(" dark:", "")}08` as string,
                        } : {}}
                      >
                        {resultData.columns.map((col) => (
                          <td key={col} className="px-2.5 py-1.5 truncate max-w-[120px]">{String(row[col] ?? "")}</td>
                        ))}
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
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
