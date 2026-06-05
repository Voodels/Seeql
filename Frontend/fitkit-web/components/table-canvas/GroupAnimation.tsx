"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { StepForward, StepBack, Play, Square } from "lucide-react"
import type { TableData, StepResult } from "@/lib/types"

const GROUP_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-700", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-300 dark:border-rose-700", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/30", border: "border-violet-300 dark:border-violet-700", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-300 dark:border-teal-700", text: "text-teal-700 dark:text-teal-300" },
]

interface GroupAnimationProps {
  previousData: TableData
  step: StepResult
  onComplete: () => void
}

type Phase = "rows" | "flying" | "buckets" | "collapsing" | "result"

const PHASES: { key: Phase; label: string; desc: string }[] = [
  { key: "rows", label: "Original Rows", desc: "Rows before GROUP BY" },
  { key: "flying", label: "Assign to Groups", desc: "Rows color-coded by group" },
  { key: "buckets", label: "Group Buckets", desc: "Rows organized into group containers" },
  { key: "collapsing", label: "Collapse into Aggregates", desc: "Each group collapses to one row" },
  { key: "result", label: "Final Result", desc: "Grouped result vs original — side by side" },
]

function rowKey(row: Record<string, unknown>, index: number): string {
  if (row.id != null) return String(row.id)
  if (row.ID != null) return String(row.ID)
  return `row-${index}`
}

export function GroupAnimation({ previousData, step, onComplete }: GroupAnimationProps) {
  const [phase, setPhase] = useState<Phase>("rows")
  const [isPlaying, setIsPlaying] = useState(false)
  const groupColumns = step.groupColumns || []
  const resultData = step.data

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
      color: GROUP_COLORS[i % GROUP_COLORS.length],
    }))
  }, [previousData, groupColumns])

  const currentIdx = PHASES.findIndex((p) => p.key === phase)

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < PHASES.length) {
      setPhase(PHASES[idx].key)
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (phase === "result") {
      setPhase("rows")
      setIsPlaying(true)
      return
    }
    setIsPlaying((prev) => !prev)
  }, [phase])

  const [playTimeout, setPlayTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const clearPlayTimer = useCallback(() => {
    if (playTimeout) {
      clearTimeout(playTimeout)
      setPlayTimeout(null)
    }
  }, [playTimeout])

  // Handle auto-play
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      clearPlayTimer()
      setIsPlaying(false)
    } else {
      if (phase === "result") {
        setPhase("rows")
      }
      setIsPlaying(true)
    }
  }, [isPlaying, phase, clearPlayTimer])

  useEffect(() => {
    if (isPlaying) {
      const t = setTimeout(() => {
        if (currentIdx < PHASES.length - 1) {
          goTo(currentIdx + 1)
        } else {
          setIsPlaying(false)
        }
      }, 1800)
      setPlayTimeout(t)
      return () => clearTimeout(t)
    }
  }, [isPlaying, currentIdx])

  // Scroll into view when phase changes
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [phase])

  const phaseInfo = PHASES[currentIdx]

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 p-6 min-h-[450px]">
      {/* Sub-step controls */}
      <div className="flex items-center gap-3 w-full max-w-4xl">
        <div className="flex items-center gap-1">
          <Button size="icon-xs" variant="ghost" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}>
            <StepBack className="size-3" />
          </Button>
          <Button size="icon-xs" variant={isPlaying ? "destructive" : "default"} onClick={handleTogglePlay}>
            {isPlaying ? <Square className="size-3" /> : <Play className="size-3" />}
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx >= PHASES.length - 1}>
            <StepForward className="size-3" />
          </Button>
        </div>

        {/* Phase breadcrumb */}
        <div className="flex items-center gap-1.5 flex-1">
          {PHASES.map((p, i) => (
            <button
              key={p.key}
              onClick={() => goTo(i)}
              className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded transition-all whitespace-nowrap ${
                i === currentIdx
                  ? "bg-purple-600 text-white"
                  : i < currentIdx
                    ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-muted text-muted-foreground/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {phaseInfo.desc}
        </span>
      </div>

      <LayoutGroup>
        {/* ======== PHASE: rows + flying ======== */}
        <AnimatePresence mode="popLayout">
          {(phase === "rows" || phase === "flying") && (
            <motion.div
              key="original-rows"
              layout
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-3xl"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {phase === "rows" ? "📋 Step 1: All rows before GROUP BY" : "🎨 Step 2: Rows color-coded by group"}
              </div>
              <div className="grid gap-1">
                {previousData.rows.map((row, i) => {
                  const groupKey = groupColumns.map((c) => String(row[c] ?? "")).join(" | ")
                  const gIdx = groups.findIndex((g) => g.key === groupKey)
                  const color = GROUP_COLORS[gIdx % GROUP_COLORS.length] || GROUP_COLORS[0]
                  return (
                    <motion.div
                      key={rowKey(row, i)}
                      layoutId={`row-${rowKey(row, i)}`}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        backgroundColor: phase === "flying" ? color.bg : "transparent",
                        borderLeftColor: phase === "flying" ? color.border.replace("border-", "") : "transparent",
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4, delay: phase === "flying" ? i * 0.04 : 0 }}
                      className="flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono"
                      style={{ borderLeftWidth: 3 }}
                    >
                      <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      {previousData.columns.map((col) => (
                        <span key={col} className="flex-1 truncate min-w-0">
                          {String(row[col] ?? "")}
                        </span>
                      ))}
                      {phase === "flying" && (
                        <span className={`text-[9px] font-bold uppercase shrink-0 ${color.text}`}>
                          → {groupKey}
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======== PHASE: buckets + collapsing ======== */}
        <AnimatePresence>
          {(phase === "buckets" || phase === "collapsing") && (
            <motion.div
              key="group-buckets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-5xl"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {phase === "buckets" ? "📦 Step 3: Rows inside group buckets" : "🗜️ Step 4: Each group collapses into one aggregate row"}
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
                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${group.color.text}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-current" />
                        {group.key}
                        <span className="text-[10px] opacity-60 font-normal">({group.rows.length} rows)</span>
                      </span>
                    </div>

                    {/* Bucket rows */}
                    <div className="space-y-1 min-h-[60px]">
                      {group.rows.map((row, i) => (
                        <motion.div
                          key={rowKey(row, i)}
                          layoutId={`row-${rowKey(row, i)}`}
                          layout
                          animate={{
                            opacity: phase === "collapsing" ? 0 : 1,
                            height: phase === "collapsing" ? 0 : "auto",
                            scale: phase === "collapsing" ? 0.5 : 1,
                            marginBottom: phase === "collapsing" ? -24 : 4,
                          }}
                          transition={{ duration: 0.5, delay: phase === "collapsing" ? i * 0.08 : 0 }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/70 dark:bg-black/30 text-[11px] font-mono border border-white/50 overflow-hidden"
                        >
                          {previousData.columns.map((col) => (
                            <span key={col} className="flex-1 truncate">{String(row[col] ?? "")}</span>
                          ))}
                        </motion.div>
                      ))}
                    </div>

                    {/* Collapsing: show the aggregate row emerging */}
                    {phase === "collapsing" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-3 pt-2 border-t border-white/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">
                            ↓ Aggregate
                          </span>
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.6, type: "spring" }}
                            className="text-emerald-500 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded"
                          >
                            ✓ Collapsed
                          </motion.span>
                        </div>
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="flex items-center gap-2 mt-1 px-3 py-2 rounded bg-white dark:bg-black/40 text-[11px] font-mono font-semibold border"
                        >
                          {(() => {
                            const groupKeyParts = group.key.split(" | ")
                            const resultRow = resultData.rows.find((r) =>
                              groupColumns.every((gc, gi) => String(r[gc]) === groupKeyParts[gi])
                            )
                            return resultData.columns.map((col) => (
                              <span key={col} className="flex-1 truncate">
                                {resultRow ? String(resultRow[col] ?? "") : "—"}
                              </span>
                            ))
                          })()}
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======== PHASE: result (side by side) ======== */}
        <AnimatePresence>
          {phase === "result" && (
            <motion.div
              key="result-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-5xl"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                ✅ Step 5: Original vs Grouped — side by side
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT: Original rows */}
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-400" />
                    Before GROUP BY ({previousData.totalRows} rows)
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="max-h-[320px] overflow-auto">
                      <table className="w-full text-[10px] font-mono">
                        <thead className="bg-muted/50 text-[9px] font-semibold uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 bg-background text-left w-6">#</th>
                            {previousData.columns.map((col) => (
                              <th key={col} className="px-2 py-1.5 bg-background text-left">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previousData.rows.map((row, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                              {previousData.columns.map((col) => (
                                <td key={col} className="px-2 py-1.5 truncate max-w-[120px]">
                                  {String(row[col] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Grouped result */}
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-purple-400" />
                    After GROUP BY ({resultData.totalRows} rows)
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="max-h-[320px] overflow-auto">
                      <table className="w-full text-[10px] font-mono">
                        <thead className="bg-muted/50 text-[9px] font-semibold uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 bg-background text-left w-6">#</th>
                            {resultData.columns.map((col) => (
                              <th key={col} className="px-2 py-1.5 bg-background text-left">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultData.rows.map((row, i) => {
                            const gIdx = groups.findIndex((g) => {
                              const parts = g.key.split(" | ")
                              return groupColumns.every((gc, gi) => String(row[gc]) === parts[gi])
                            })
                            const color = GROUP_COLORS[Math.max(0, gIdx) % GROUP_COLORS.length]
                            const groupBg = color.bg.replace("dark:", "")
                            return (
                              <motion.tr
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.12 }}
                                className={`border-t border-border/50 ${groupBg}`}
                              >
                                <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                                {resultData.columns.map((col) => (
                                  <td key={col} className="px-2 py-1.5 truncate max-w-[120px] font-semibold">
                                    {String(row[col] ?? "")}
                                  </td>
                                ))}
                              </motion.tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Arrow connecting the two */}
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.5 }}
                    className="hidden lg:flex items-center justify-center mt-3 text-[10px] text-muted-foreground gap-2"
                  >
                    <span className="text-blue-400 font-semibold">{previousData.totalRows} rows</span>
                    <span>→</span>
                    <span className="text-purple-400 font-semibold">{resultData.totalRows} grouped rows</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Done button */}
      {phase === "result" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <Button size="sm" variant="default" onClick={onComplete}>
            Continue to next step →
          </Button>
        </motion.div>
      )}
    </div>
  )
}
