"use client"

import { motion } from "framer-motion"
import { staggerDelay } from "@/lib/animation-utils"

type RowVariant = "default" | "pass" | "fail" | "kept" | "removed" | "moved" | "new" | "cut"

interface RowCardProps {
  row: Record<string, unknown>
  columns: string[]
  index: number
  totalRows: number
  staggerBase?: number
  variant?: RowVariant
  badge?: string
  badgeColor?: string
  leftBorderColor?: string
  className?: string
}

const variantStyles: Record<RowVariant, { borderColor: string; bg: string }> = {
  default: { borderColor: "transparent", bg: "" },
  pass: { borderColor: "#22c55e", bg: "rgba(34,197,94,0.04)" },
  fail: { borderColor: "#ef4444", bg: "rgba(239,68,68,0.04)" },
  kept: { borderColor: "#6366f1", bg: "rgba(99,102,241,0.04)" },
  removed: { borderColor: "#ef4444", bg: "rgba(239,68,68,0.04)" },
  moved: { borderColor: "#3b82f6", bg: "rgba(59,130,246,0.06)" },
  new: { borderColor: "#22c55e", bg: "rgba(34,197,94,0.04)" },
  cut: { borderColor: "#f97316", bg: "rgba(249,115,22,0.04)" },
}

export function RowCard({ row, columns, index, totalRows, staggerBase = 0.03, variant = "default", badge, badgeColor, leftBorderColor, className = "" }: RowCardProps) {
  const vs = variantStyles[variant]
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: staggerDelay(index, totalRows, staggerBase), duration: 0.35 }}
      className={`flex items-center gap-3 px-4 py-2 rounded border bg-card text-xs font-mono ${className}`}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: leftBorderColor || vs.borderColor,
        backgroundColor: vs.bg || undefined,
      }}
    >
      <span className="text-muted-foreground w-5 shrink-0 text-right">{index + 1}</span>
      {columns.map((col) => (
        <span key={col} className="flex-1 truncate min-w-0">{String(row[col] ?? "")}</span>
      ))}
      {badge && (
        <span className={`text-[10px] font-bold shrink-0 ${badgeColor || "text-foreground/60"}`}>{badge}</span>
      )}
    </motion.div>
  )
}
