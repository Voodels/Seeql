"use client"

import { motion } from "framer-motion"
import { staggerDelay } from "@/lib/animation-utils"
import { VirtualTable } from "./VirtualTable"
import type { TableData } from "@/lib/types"

const VIRTUAL_THRESHOLD = 100

interface SideBySideProps {
  leftData: TableData
  rightData: TableData
  leftLabel?: string
  rightLabel?: string
  leftColor?: string
  rightColor?: string
}

export function SideBySide({ leftData, rightData, leftLabel, rightLabel, leftColor = "bg-slate-400", rightColor = "bg-indigo-400" }: SideBySideProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-4xl">
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <span className={`size-2 rounded-full shrink-0 ${leftColor}`} />
          {leftLabel || `Before (${leftData.totalRows} rows)`}
        </div>
        {leftData.totalRows > VIRTUAL_THRESHOLD ? (
          <VirtualTable data={leftData} maxHeight={300} />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider">
                <tr>
                  {leftData.columns.map((col) => (
                    <th key={col} className="px-2.5 py-1.5 bg-background text-left">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leftData.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-border/30">
                    {leftData.columns.map((col) => (
                      <td key={col} className="px-2.5 py-1.5 truncate max-w-[80px]">{String(row[col] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {leftData.rows.length > 5 && (
              <div className="text-[10px] text-muted-foreground px-2.5 py-1 border-t border-border/30">
                ... and {leftData.rows.length - 5} more
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <span className={`size-2 rounded-full shrink-0 ${rightColor}`} />
          {rightLabel || `After (${rightData.columns.length} cols, ${rightData.totalRows} rows)`}
        </div>
        {rightData.totalRows > VIRTUAL_THRESHOLD ? (
          <VirtualTable data={rightData} maxHeight={400} />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider">
                <tr>
                  {rightData.columns.map((col) => (
                    <th key={col} className="px-2.5 py-1.5 bg-background text-left">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rightData.rows.slice(0, 10).map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: staggerDelay(i, rightData.totalRows, 0.03) }}
                    className="border-t border-border/30"
                  >
                    {rightData.columns.map((col) => (
                      <td key={col} className="px-2.5 py-1.5 truncate max-w-[80px]">{String(row[col] ?? "")}</td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {rightData.rows.length > 10 && (
              <div className="text-[10px] text-muted-foreground px-2.5 py-1 border-t border-border/30">
                ... and {rightData.rows.length - 10} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
