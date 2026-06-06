"use client"

import { useMemo } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowUpFromLine } from "lucide-react"
import { usePhaseStepper } from "@/hooks/use-phase-stepper"
import { rowKey } from "@/lib/animation-utils"
import type { TableData, StepResult } from "@/lib/types"
import { PhaseBar } from "./PhaseBar"
import { RowCard } from "./RowCard"
import { SideBySide } from "./SideBySide"

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
      <PhaseBar phases={PHASES} phaseIdx={stepper.phaseIdx} isPlaying={stepper.isPlaying} isFirst={stepper.isFirst} isLast={stepper.isLast} onGoPrev={stepper.goPrev} onGoNext={stepper.goNext} onGoTo={(i) => stepper.goTo(i)} onTogglePlay={stepper.handleTogglePlay} />

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
                    <div key={rowKey(row, i)} className="relative">
                      <RowCard row={row} columns={previousData.columns} index={i} totalRows={previousData.totalRows}
                        variant={stepper.phase.key === "cutoff" ? (isRemoved ? "cut" : "kept") : "default"}
                        badge={stepper.phase.key === "cutoff" ? (isRemoved ? "Cut" : "Keep") : undefined}
                        badgeColor={stepper.phase.key === "cutoff" ? (isRemoved ? "text-red-400" : "text-green-500") : undefined}
                      />
                      {stepper.phase.key === "cutoff" && i === keptCount - 1 && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4 }}
                          className="absolute -bottom-0 left-0 right-0 h-[2px] bg-orange-500 origin-left"
                          style={{ transform: "translateY(8px)" }}
                        />
                      )}
                    </div>
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
                  <RowCard key={rowKey(row, i)} row={row} columns={previousData.columns} index={i} totalRows={previousData.totalRows} staggerBase={0.03}
                    variant="kept"
                    badge="Kept"
                    badgeColor="text-green-500"
                  />
                ))}
                {previousData.rows.slice(keptCount).map((row, i) => (
                  <RowCard key={`removed-${keptCount + i}`} row={row} columns={previousData.columns} index={keptCount + i} totalRows={previousData.totalRows} staggerBase={0.05}
                    variant="removed"
                    badge="Removed"
                    badgeColor="text-red-400"
                  />
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
            <SideBySide leftData={previousData} rightData={resultData} leftLabel={`Before (${previousData.totalRows} rows)`} rightLabel={`After — limited (${resultData.totalRows} rows)`} leftColor="bg-slate-400" rightColor="bg-orange-400" />
            <div className="mt-4 flex justify-center">
              <Button size="sm" variant="default" onClick={onComplete}>Continue to next step &rarr;</Button>
            </div>
          </motion.div>
        )}
      </LayoutGroup>
    </div>
  )
}
