import type { TableData } from "./types"

export function rowKey(row: Record<string, unknown>, index: number): string {
  if (row.id != null) return String(row.id)
  if (row.ID != null) return String(row.ID)
  return `row-${index}`
}

export const GROUP_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-700", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-rose-100 dark:bg-rose-900/30", border: "border-rose-300 dark:border-rose-700", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/30", border: "border-violet-300 dark:border-violet-700", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-teal-100 dark:bg-teal-900/30", border: "border-teal-300 dark:border-teal-700", text: "text-teal-700 dark:text-teal-300" },
]

export function getGroupColor(idx: number) {
  return GROUP_COLORS[Math.abs(idx) % GROUP_COLORS.length]
}

export const CLAUSE_BADGE_COLORS: Record<string, string> = {
  FROM: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  WHERE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  "GROUP BY": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  HAVING: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  "ORDER BY": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  SELECT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  DISTINCT: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  JOIN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  LIMIT: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800",
}

export function getClauseBadgeColor(clause: string): string {
  if (clause.startsWith("CTE.")) return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800"
  if (clause.startsWith("WITH ") || clause.startsWith("CTE ")) return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800"
  if (clause.includes("JOIN ")) return CLAUSE_BADGE_COLORS["JOIN"]
  if (clause.startsWith("BEFORE")) return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800"
  if (clause === "UPDATE" || clause === "DELETE") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
  if (clause.startsWith("#")) return "bg-muted text-foreground border-border/50"
  return CLAUSE_BADGE_COLORS[clause] || "bg-muted text-muted-foreground border-border"
}

/** Assign a deterministic group color based on row values */
export function getGroupColorForRow(row: Record<string, unknown>, groupColumns: string[]): string {
  const key = groupColumns.map((c) => String(row[c] ?? "")).join("|")
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length].bg
}

/** Detect GROUP BY step: row structure changed vs previous */
export function isGroupStep(prev: TableData | undefined, curr: TableData): boolean {
  if (!prev || prev.columns.length === 0 || curr.columns.length === 0) return false
  return prev.columns.length > curr.columns.length && (
    curr.columns.some((c) => /^(COUNT|SUM|AVG|MIN|MAX)\(/i.test(c))
  )
}
