const CLAUSE_REGEX = /\b(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|INNER\s+JOIN)\b/i

export interface ClauseLocation {
  keyword: string
  start: number
  end: number
}

export function findClauses(sql: string): ClauseLocation[] {
  const clauses: ClauseLocation[] = []
  const re = /\b(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(sql)) !== null) {
    clauses.push({
      keyword: match[0].toUpperCase(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return clauses.sort((a, b) => a.start - b.start)
}

export function findClauseSpans(
  sql: string,
  activeClause: string
): { text: string; highlight: boolean }[] {
  if (!sql) return [{ text: "", highlight: false }]

  const clauses = findClauses(sql)
  if (clauses.length === 0) return [{ text: sql, highlight: false }]

  const spans: { text: string; highlight: boolean }[] = []
  let cursor = 0

  // Determine the "range" of the active clause: from its keyword to the next clause
  // Map clause name to regex pattern
  const clauseMap: Record<string, string[]> = {
    SELECT: ["SELECT"],
    FROM: ["FROM"],
    WHERE: ["WHERE"],
    "GROUP BY": ["GROUP BY"],
    HAVING: ["HAVING"],
    "ORDER BY": ["ORDER BY"],
  }

  const activeKeywords = clauseMap[activeClause] || [activeClause]
  const upperSql = sql.toUpperCase()

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i]
    if (clause.start > cursor) {
      spans.push({ text: sql.slice(cursor, clause.start), highlight: false })
    }

    // Determine if this clause is the active one
    const isActive = activeKeywords.some((kw) => clause.keyword.startsWith(kw))

    // Find the end of this clause's span (until next clause keyword)
    const nextClause = clauses[i + 1]
    const clauseEnd = nextClause ? nextClause.start : sql.length
    const clauseText = sql.slice(clause.start, clauseEnd)

    spans.push({ text: clauseText, highlight: isActive })
    cursor = clauseEnd
  }

  if (cursor < sql.length) {
    spans.push({ text: sql.slice(cursor), highlight: false })
  }

  return spans
}
