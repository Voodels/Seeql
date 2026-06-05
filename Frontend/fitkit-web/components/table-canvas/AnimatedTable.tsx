"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import type { TableData } from "@/lib/types"
import { useMemo } from "react"
import { rowKey, getGroupColorForRow, isGroupStep } from "@/lib/animation-utils"

interface AnimatedTableProps {
  data: TableData
  previousData?: TableData
  clause?: string
}

export function AnimatedTable({ data, previousData, clause }: AnimatedTableProps) {
  const isGrouping = isGroupStep(previousData, data)
  const isFiltering = clause === "WHERE" || clause === "HAVING" || clause === "LIMIT"

  const diffRows = useMemo(() => {
    if (!isFiltering || !previousData) return null
    const currKeys = new Set(data.rows.map((r, i) => rowKey(r, i)))
    return previousData.rows
      .map((r, i) => ({ row: r, key: rowKey(r, i), status: currKeys.has(rowKey(r, i)) ? "kept" as const : "removed" as const }))
      .sort((a, b) => (a.status === "removed" ? -1 : 1) - (b.status === "removed" ? -1 : 1))
  }, [isFiltering, previousData, data])

  const groupColumns = useMemo(() => {
    if (!isGrouping) return []
    return data.columns.filter((c) => !/^(COUNT|SUM|AVG|MIN|MAX)\(/i.test(c))
  }, [isGrouping, data.columns])

  if (!data.columns.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No results
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
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
            {diffRows && previousData ? (
              diffRows.map(({ row, key, status }, index) => (
                <motion.tr
                  key={`diff-${key}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    backgroundColor: status === "kept"
                      ? "rgba(34, 197, 94, 0.08)"
                      : "rgba(239, 68, 68, 0.08)",
                  }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="border-b"
                >
                  <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                  {previousData.columns.map((col) => (
                    <TableCell key={col}>{String(row[col] ?? "")}</TableCell>
                  ))}
                  <TableCell className="text-center">
                    {status === "kept" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                        &#10003; Kept
                      </span>
                    ) : (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50 px-1.5 py-0.5 rounded"
                      >
                        &#10007; Removed
                      </motion.span>
                    )}
                  </TableCell>
                </motion.tr>
              ))
            ) : (
              data.rows.map((row, index) => {
                const key = rowKey(row, index)
                const groupColor = isGrouping ? getGroupColorForRow(row, groupColumns) : undefined
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
                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                    {data.columns.map((col) => (
                      <TableCell key={col}>{String(row[col] ?? "")}</TableCell>
                    ))}
                    <TableCell className="text-center">
                      {isGrouping ? (
                        <span className="text-[10px] text-muted-foreground">Group</span>
                      ) : (
                        <span className="text-[10px] text-emerald-600">&#10003;</span>
                      )}
                    </TableCell>
                  </motion.tr>
                )
              })
            )}
          </AnimatePresence>

          {diffRows && (
            <motion.tr
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-t-2 border-border bg-muted/20"
            >
              <TableCell colSpan={previousData ? previousData.columns.length + 2 : 3}>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    Kept: {diffRows.filter((r) => r.status === "kept").length} rows
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-red-500 shrink-0" />
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
