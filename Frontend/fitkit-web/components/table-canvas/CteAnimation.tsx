"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey, getGroupColor, staggerDelay } from "@/lib/animation-utils"
import type { TableData } from "@/lib/types"
import { PhaseBar } from "./PhaseBar"
import { SideBySide } from "./SideBySide"

const ALL_PHASES = [
  { key: "input", label: "Original", desc: "Rows before transformation" },
  { key: "partition", label: "Partition", desc: "Rows grouped by partition key (color-coded)" },
  { key: "compute", label: "Compute", desc: "New columns calculated with formula" },
  { key: "output", label: "Result", desc: "Final transformed table — before vs after" },
]

interface CteAnimationProps {
  previousData: TableData
  currentData: TableData
  cteName: string
  cteSql: string
  onComplete: () => void
}

export function CteAnimation({ previousData, currentData, cteName, cteSql, onComplete }: CteAnimationProps) {
  const newColumns = currentData.columns.filter((col) => !previousData.columns.includes(col))
  const removedColumns = previousData.columns.filter((col) => !currentData.columns.includes(col))
  const keptColumns = previousData.columns.filter((col) => currentData.columns.includes(col))

  const isWindowFn = newColumns.some((c) => /^(ROW_NUM|RN|NUM_COUNTER|RANK|DENSE_RANK|LAG|LEAD)/i.test(c))
  const isCompute = newColumns.length > 0 && !isWindowFn

  const phases = ALL_PHASES.filter((p) => p.key !== "partition" || isWindowFn)
  const stepper = usePhaseStepper({ phases, autoAdvanceMs: 2000, onComplete })
  const labelColor = isWindowFn ? "text-cyan-500" : "text-amber-500"

  const partitions = useMemo(() => {
    if (!isWindowFn || !keptColumns.length) return []
    const partitionCol = keptColumns[0]
    const map = new Map<string, { rows: Record<string, unknown>[]; indices: number[] }>()
    previousData.rows.forEach((row, i) => {
      const key = String(row[partitionCol] ?? "NULL")
      if (!map.has(key)) map.set(key, { rows: [], indices: [] })
      map.get(key)!.rows.push(row)
      map.get(key)!.indices.push(i)
    })
    return Array.from(map.entries()).map(([key, val], i) => ({
      key,
      ...val,
      color: getGroupColor(i),
    }))
  }, [isWindowFn, keptColumns, previousData])

  const computeFormulas: { col: string; formula: string }[] = useMemo(() => {
    if (!isCompute) return []
    return newColumns.map((col) => {
      const upperCol = col.toUpperCase()
      if (/STREAK|DIFF|GAP/.test(upperCol)) {
        const parts = previousData.columns.filter((c) => !keptColumns.includes(c))
        return { col, formula: `${parts.join(" - ")} = ${col}` }
      }
      return { col, formula: `${col} = (computed)` }
    })
  }, [isCompute, newColumns, previousData.columns, keptColumns])

  return (
    <div ref={stepper.containerRef} className="flex flex-col items-center gap-4 p-6 min-h-[450px]">
      <PhaseBar phases={phases} phaseIdx={stepper.phaseIdx} isPlaying={stepper.isPlaying} isFirst={stepper.isFirst} isLast={stepper.isLast} onGoPrev={stepper.goPrev} onGoNext={stepper.goNext} onGoTo={(i) => stepper.goTo(i)} onTogglePlay={stepper.handleTogglePlay} />

      <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-2 w-full max-w-5xl">
        <span className={`font-mono ${labelColor}`}>{cteName}</span>
        <span className="opacity-30">&mdash;</span>
        <code className="text-[9px] bg-muted px-1.5 py-0.5 rounded truncate">{cteSql}</code>
      </div>

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {(stepper.phase.key === "input" || stepper.phase.key === "partition") && (
            <motion.div key="input" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-4xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                {stepper.phase.key === "input" ? "Original rows before transformation" : `Rows color-coded by partition (${keptColumns[0] || "partition key"})`}
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-1.5 bg-background text-left w-6">#</th>
                      {previousData.columns.map((col) => (
                        <th key={col} className={`px-3 py-1.5 bg-background text-left ${
                          stepper.phase.key === "partition" && isWindowFn && keptColumns.includes(col)
                            ? "text-blue-600" : ""
                        }`}>
                          {col}
                          {stepper.phase.key === "partition" && isWindowFn && keptColumns.includes(col) && (
                            <span className="ml-1 text-[9px] text-blue-500 font-normal">(partition key)</span>
                          )}
                        </th>
                      ))}
                      {stepper.phase.key === "partition" && isWindowFn && newColumns.map((col) => (
                        <th key={col} className="px-3 py-1.5 bg-background text-left text-cyan-500">
                          {col} <span className="text-[9px] font-normal">(new)</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previousData.rows.map((row, i) => {
                      let rowColor = ""
                      if (stepper.phase.key === "partition" && isWindowFn && partitions.length) {
                        for (const p of partitions) {
                          if (p.indices.includes(i)) { rowColor = p.color.bg; break }
                        }
                      }
                      return (
                        <tr key={i} className={`border-t border-border/30 transition-colors ${rowColor}`}>
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          {previousData.columns.map((col) => (
                            <td key={col} className="px-3 py-1.5 truncate max-w-[100px]">
                              {String(row[col] ?? "")}
                              {stepper.phase.key === "partition" && isWindowFn && col === keptColumns[0] && partitions.length > 0 && (
                                <span className="ml-1 text-[10px] opacity-60">
                                  ({partitions.find((p) => p.indices.includes(i))?.key})
                                </span>
                              )}
                            </td>
                          ))}
                          {stepper.phase.key === "partition" && isWindowFn && newColumns.map((col) => (
                            <td key={col} className="px-3 py-1.5">
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: staggerDelay(i, previousData.totalRows, 0.04) }}
                                className="inline-block text-[10px] bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400 px-1.5 py-0.5 rounded"
                              >
                                ?
                              </motion.span>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {stepper.phase.key === "partition" && isWindowFn && partitions.length > 0 && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>Partitions by:</span>
                  {partitions.map((p) => (
                    <span key={p.key} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${p.color.bg} ${p.color.text} font-semibold`}>
                      <span className="size-2 rounded-full bg-current shrink-0" />
                      {p.key} ({p.rows.length} rows)
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {stepper.phase.key === "compute" && (
            <motion.div key="compute" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
              <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wide">
                New columns calculated with formula
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-1.5 bg-background text-left w-6">#</th>
                      {previousData.columns.map((col) => (
                        <th key={col} className={`px-3 py-1.5 bg-background text-left ${
                          removedColumns.includes(col) ? "text-red-400 line-through" : ""
                        }`}>
                          {col}
                        </th>
                      ))}
                      {newColumns.map((col) => (
                        <th key={col} className="px-3 py-1.5 bg-background text-left text-cyan-600">
                          {col}
                          {computeFormulas.length > 0 && (
                            <div className="text-[8px] font-normal opacity-60">
                              {computeFormulas.find((f) => f.col === col)?.formula || "computed"}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.rows.map((row, i) => {
                      const inputRow = previousData.rows[i]
                      return (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: staggerDelay(i, currentData.totalRows, 0.05) }}
                          className="border-t border-border/30"
                        >
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          {previousData.columns.map((col) => {
                            const val = inputRow ? String(inputRow[col] ?? "") : ""
                            return (
                              <td key={col} className={`px-3 py-1.5 truncate max-w-[80px] ${
                                removedColumns.includes(col) ? "text-red-300 line-through" : ""
                              }`}>
                                {val}
                              </td>
                            )
                          })}
                          {newColumns.map((col) => {
                            const value = String(row[col] ?? "")
                            if (isCompute && previousData.rows[i]) {
                              const parts = previousData.columns.filter((c) => !keptColumns.includes(c))
                              const vals = parts.map((c) => String(previousData.rows[i][c] ?? "?"))
                              return (
                                <td key={col} className="px-3 py-1.5">
                                  <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 font-semibold text-[10px]"
                                  >
                                    <span className="text-red-400 line-through">{vals.join(" - ")}</span>
                                    <span className="text-muted-foreground">&rarr;</span>
                                    <span>{value}</span>
                                  </motion.span>
                                </td>
                              )
                            }
                            if (isWindowFn) {
                              const partitionKey = keptColumns.length ? String(previousData.rows[i][keptColumns[0]] ?? "") : ""
                              const pIdx = partitions.findIndex((p) => p.key === partitionKey)
                              const color = pIdx >= 0 ? getGroupColor(pIdx) : null
                              return (
                                <td key={col} className="px-3 py-1.5">
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.4, delay: 0.1 + i * 0.04 }}
                                    className={`inline-block px-2 py-0.5 rounded font-semibold text-[10px] ${color?.bg || ""} ${color?.text || ""}`}
                                  >
                                    {value} / {partitions.find((p) => p.key === partitionKey)?.rows.length || "?"}
                                  </motion.span>
                                </td>
                              )
                            }
                            return (
                              <td key={col} className="px-3 py-1.5">
                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.04 }}>
                                  {value}
                                </motion.span>
                              </td>
                            )
                          })}
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {computeFormulas.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-3 border"
                >
                  {computeFormulas.map((f) => (
                    <span key={f.col} className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 px-1.5 py-0.5 rounded">
                        {f.formula}
                      </code>
                    </span>
                  ))}
                  <span className="opacity-30">|</span>
                  <span>Each row&apos;s values plugged into the formula</span>
                </motion.div>
              )}

              {isWindowFn && partitions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground bg-muted/30 rounded-lg p-3 border"
                >
                  <span>Partitioned by</span>
                  <code className="font-mono font-semibold text-blue-600">{keptColumns[0]}</code>
                  <span className="opacity-30">&rarr;</span>
                  <span>Each partition numbered sequentially</span>
                </motion.div>
              )}
            </motion.div>
          )}

          {stepper.phase.key === "output" && (
            <motion.div key="output" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
              <div className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide text-center">
                Transformation complete &mdash; <span className={labelColor}>{cteName}</span> ({currentData.totalRows} rows, {currentData.columns.length} columns)
              </div>
              <SideBySide leftData={previousData} rightData={currentData} leftLabel={`Before (${previousData.columns.length} cols)`} rightLabel={`After (${currentData.columns.length} cols)`} leftColor="bg-blue-400" rightColor="bg-cyan-400" />
              <div className="mt-4 flex justify-center">
                <Button size="sm" variant="default" onClick={onComplete}>Continue to next step &rarr;</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  )
}
