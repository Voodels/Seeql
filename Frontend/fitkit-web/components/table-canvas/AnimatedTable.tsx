"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import type { TableData } from "@/lib/types"
import { useMemo } from "react"

const GROUP_COLORS = [
  "bg-blue-100 dark:bg-blue-900/30",
  "bg-emerald-100 dark:bg-emerald-900/30",
  "bg-amber-100 dark:bg-amber-900/30",
  "bg-rose-100 dark:bg-rose-900/30",
  "bg-violet-100 dark:bg-violet-900/30",
  "bg-teal-100 dark:bg-teal-900/30",
  "bg-orange-100 dark:bg-orange-900/30",
  "bg-pink-100 dark:bg-pink-900/30",
]

interface AnimatedTableProps {
  data: TableData
  previousData?: TableData
  clause?: string
}

function rowKey(row: Record<string, unknown>, index: number): string {
  if (row.id != null) return String(row.id)
  if (row.ID != null) return String(row.ID)
  return `row-${index}`
}

/** Assign a deterministic group color based on row values */
function getGroupColor(row: Record<string, unknown>, groupColumns: string[]): string {
  const key = groupColumns.map((c) => String(row[c] ?? "")).join("|")
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length]
}

/** Detect GROUP BY step: row structure changed vs previous */
function isGroupStep(prev: TableData | undefined, curr: TableData): boolean {
  if (!prev || prev.columns.length === 0 || curr.columns.length === 0) return false
  // If columns changed significantly, it's likely a group step
  return prev.columns.length > curr.columns.length && (
    curr.columns.some((c) => c.toUpperCase().includes("COUNT") || c.toUpperCase().includes("SUM") || c.toUpperCase().includes("AVG"))
  )
}

export function AnimatedTable({ data, previousData, clause }: AnimatedTableProps) {
  const isGrouping = isGroupStep(previousData, data)
  const isFiltering = clause === "WHERE" || clause === "HAVING"

  // For filter steps, compute which rows passed/failed
  const diffRows = useMemo(() => {
    if (!isFiltering || !previousData) return null

    const prevKeys = new Set(previousData.rows.map((r, i) => rowKey(r, i)))
    const currKeys = new Set(data.rows.map((r, i) => rowKey(r, i)))

    // Rows that were removed (in prev but not in curr)
    const removed = previousData.rows
      .map((r, i) => ({ row: r, key: rowKey(r, i), status: currKeys.has(rowKey(r, i)) ? "kept" as const : "removed" as const }))
      .sort((a, b) => (a.status === "removed" ? -1 : 1) - (b.status === "removed" ? -1 : 1))

    return removed
  }, [isFiltering, previousData, data])

  if (!data.columns.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No results
      </div>
    )
  }

  // Identify group columns for coloring (all non-aggregate columns)
  const groupColumns = useMemo(() => {
    if (!isGrouping) return []
    const aggPattern = /^(COUNT|SUM|AVG|MIN|MAX)\(/i
    return data.columns.filter((c) => !aggPattern.test(c))
  }, [isGrouping, data.columns])

  return (
    <div className="overflow-auto rounded border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 text-center">#</TableHead>
            {diffRows && previousData ? (
              previousData.columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))
            ) : (
              data.columns.map((col) => (
                <TableHead key={col}>
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {isGrouping && groupColumns.includes(col) && (
                      <span className="text-[8px] text-muted-foreground/50 font-normal">(group)</span>
                    )}
                  </span>
                </TableHead>
              ))
            )}
            <TableHead className="w-24 text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {/* DIFF MODE: show kept + removed rows */}
            {diffRows && previousData ? (
              diffRows.map(({ row, key, status }, index) => {
                const isActive = status === "kept"
                return (
                  <motion.tr
                    key={`diff-${key}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      backgroundColor: isActive
                        ? "rgba(34, 197, 94, 0.08)"
                        : "rgba(239, 68, 68, 0.08)",
                    }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="border-b"
                  >
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {index + 1}
                    </TableCell>
                    {previousData.columns.map((col) => (
                      <TableCell key={col}>
                        {String(row[col] ?? "")}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          ✓ Kept
                        </span>
                      ) : (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50 px-1.5 py-0.5 rounded"
                        >
                          ✕ Removed
                        </motion.span>
                      )}
                    </TableCell>
                  </motion.tr>
                )
              })
            ) : (
              /* NORMAL or GROUP mode */
              data.rows.map((row, index) => {
                const key = rowKey(row, index)
                const groupColor = isGrouping ? getGroupColor(row, groupColumns) : undefined
                return (
                  <motion.tr
                    key={key}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor: groupColor || "transparent",
                    }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="border-b"
                  >
                    <TableCell className="text-center text-muted-foreground text-xs">
                      {index + 1}
                    </TableCell>
                    {data.columns.map((col) => (
                      <TableCell key={col}>
                        {String(row[col] ?? "")}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {isGrouping ? (
                        <span className="text-[10px] text-muted-foreground">Group</span>
                      ) : (
                        <span className="text-[10px] text-emerald-600">✓</span>
                      )}
                    </TableCell>
                  </motion.tr>
                )
              })
            )}
          </AnimatePresence>

          {/* Summary row for diff mode */}
          {diffRows && (
            <motion.tr
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-t-2 border-border bg-muted/20"
            >
              <TableCell colSpan={previousData ? previousData.columns.length + 2 : 3}>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Kept: {diffRows.filter((r) => r.status === "kept").length} rows
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-red-500" />
                    Removed: {diffRows.filter((r) => r.status === "removed").length} rows
                  </span>
                </div>
              </TableCell>
            </motion.tr>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
