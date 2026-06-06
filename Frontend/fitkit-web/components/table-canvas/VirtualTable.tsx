"use client"

import { useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { TableData } from "@/lib/types"

interface VirtualTableProps {
  data: TableData
  maxHeight?: number
  rowHeight?: number
  className?: string
}

export function VirtualTable({ data, maxHeight = 400, rowHeight = 36, className = "" }: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  })

  if (data.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-border bg-muted/20">
        <span className="text-sm text-muted-foreground italic">Empty — no rows</span>
      </div>
    )
  }

  return (
    <div ref={parentRef} style={{ maxHeight }} className={`overflow-auto rounded-lg border ${className}`}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
        <table className="w-full text-xs font-mono">
          <thead className="bg-muted/50 text-[10px] font-semibold uppercase tracking-wider sticky top-0 z-10">
            <tr>
              <th className="px-2.5 py-1.5 bg-background text-left w-8">#</th>
              {data.columns.map((col) => (
                <th key={col} className="px-2.5 py-1.5 bg-background text-left">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = data.rows[virtualRow.index]
              return (
                <tr
                  key={virtualRow.key}
                  style={{ height: `${rowHeight}px`, transform: `translateY(${virtualRow.start}px)` }}
                  className="absolute w-full border-t border-border/30 hover:bg-muted/20"
                >
                  <td className="px-2.5 py-1.5 text-muted-foreground truncate">{virtualRow.index + 1}</td>
                  {data.columns.map((col) => (
                    <td key={col} className="px-2.5 py-1.5 truncate max-w-[120px]">{String(row[col] ?? "")}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
