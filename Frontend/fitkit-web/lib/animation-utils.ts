import type { StepResult, TableData } from "./types"

export type AnimationType = "group" | "cte" | "distinct" | "join" | "where" | "select" | "orderby" | "limit" | "error" | "transition"

export function getAnimationType(step: StepResult | undefined): AnimationType {
  if (!step) return "transition"
  const c = step.clause
  if (c === "GROUP BY" && step.groupColumns?.length) return "group"
  if (c.startsWith("WITH ") || c.startsWith("CTE.WINDOW")) return "cte"
  if (c === "DISTINCT") return "distinct"
  if (c.includes("JOIN ") || (c.startsWith("CTE.") && !c.startsWith("CTE.BODY") && !c.startsWith("CTE.WHERE") && !c.startsWith("CTE.WINDOW") && step.sql?.includes(" JOIN "))) return "join"
  if (c === "WHERE" || c === "CTE.WHERE" || c === "HAVING") return "where"
  if (c === "SELECT" || c === "CTE.BODY") return "select"
  if (c === "ORDER BY" || c.startsWith("ORDER BY")) return "orderby"
  if (c === "LIMIT") return "limit"
  if (step.error || step.extras?.error) return "error"
  return "transition"
}

export const MAX_STAGGER_SECONDS = 1.5

export function staggerDelay(i: number, totalRows: number, baseDelay: number = 0.04): number {
  if (totalRows <= 1) return baseDelay * i
  return Math.min(baseDelay, MAX_STAGGER_SECONDS / Math.max(totalRows, 1)) * i
}

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
export function getTransitionDescription(clause: string): string {
  if (clause.startsWith("CTE.")) return `Loading ${clause.replace("CTE.", "")} for CTE scope`
  if (clause.startsWith("WITH ")) return `Creating CTE: ${clause.replace("WITH ", "")}`
  if (clause.startsWith("BEFORE")) return "Capturing state before modification"
  if (clause === "UPDATE") return "Applying updates to matched rows"
  if (clause === "DELETE") return "Removing rows matching WHERE"
  if (clause === "INSERT") return "Inserting new rows into table"
  if (clause === "VALUES") return "Computing values to insert"
  if (clause.startsWith("SUBQUERY")) return "Executing subquery"
  if (clause.startsWith("CTE ANCHOR")) return "Building anchor set for recursive CTE"
  if (clause.startsWith("CTE ITER")) return "Iterating recursive CTE"
  if (clause === "CREATE") return "Creating table structure"
  if (clause === "EXPLAIN") return "Showing query execution plan"
  if (clause === "INTO") return "Writing results to target table"
  if (clause.startsWith("#") || clause.startsWith("CTE ")) return "Executing compound / misc step"
  if (clause.startsWith("EXECUTE")) return "Executing query directly"
  if (clause === "FROM" || clause.startsWith("FROM")) return "Loading base table"
  return "Processing step"
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
