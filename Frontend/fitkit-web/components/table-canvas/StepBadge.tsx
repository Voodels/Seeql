"use client"

import { getClauseBadgeColor } from "@/lib/animation-utils"

interface StepBadgeProps {
  clause: string
  sql: string
  totalRows: number
  previousRows?: number
}

export function StepBadge({ clause, sql, totalRows, previousRows }: StepBadgeProps) {
  return (
    <div className="flex items-center gap-2 w-full max-w-4xl">
      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getClauseBadgeColor(clause)}`}>
        {clause}
      </span>
      <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded flex-1 truncate font-mono">
        {sql}
      </code>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {totalRows} rows
        {previousRows !== undefined && (
          <span className="ml-1 text-muted-foreground/50">
            (was {previousRows})
          </span>
        )}
      </span>
    </div>
  )
}
