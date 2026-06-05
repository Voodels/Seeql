export interface ClauseLocation {
  keyword: string
  start: number
  end: number
}

export function findClauses(sql: string): ClauseLocation[] {
  const clauses: ClauseLocation[] = []

  // 1. Find CTE body paren ranges to exclude clauses inside CTE definitions
  const cteBodyRanges = findCteBodyRanges(sql)
  function isInsideCteBody(pos: number): boolean {
    return cteBodyRanges.some((r) => pos >= r.start && pos < r.end)
  }

  // 2. Standard SQL clauses — skip those inside CTE bodies
  const re = /\b(SELECT|FROM|WHERE|GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|(?:LEFT|RIGHT|INNER|FULL|CROSS|NATURAL)?\s*JOIN)\b/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(sql)) !== null) {
    if (!isInsideCteBody(match.index)) {
      clauses.push({
        keyword: match[0].toUpperCase(),
        start: match.index,
        end: match.index + match[0].length,
      })
    }
  }

  // 3. CTE name clauses (always included — they are the CTE definitions themselves)
  const cteRe = /(?:\bWITH\s+|\)\s*,\s*)(\w+)\s+AS\s*\(/gi
  while ((match = cteRe.exec(sql)) !== null) {
    const cteName = match[1].toUpperCase()
    const nameStart = match.index + match[0].indexOf(match[1])
    clauses.push({
      keyword: `WITH ${cteName}`,
      start: nameStart,
      end: nameStart,
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

  const clauseMap: Record<string, string[]> = {
    SELECT: ["SELECT"],
    FROM: ["FROM"],
    WHERE: ["WHERE"],
    "GROUP BY": ["GROUP BY"],
    HAVING: ["HAVING"],
    "ORDER BY": ["ORDER BY"],
    DISTINCT: ["DISTINCT"],
    JOIN: ["JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL JOIN", "CROSS JOIN"],
  }

  const activeKeywords = clauseMap[activeClause] || (
    activeClause.toUpperCase().startsWith("WITH ")
      ? [activeClause]
      : [activeClause, activeClause.split(" ")[0]]
  )

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i]
    if (clause.start > cursor) {
      spans.push({ text: sql.slice(cursor, clause.start), highlight: false })
    }

    const isActive = activeKeywords.some((kw) => {
      const upperClause = clause.keyword.toUpperCase()
      const upperKw = kw.toUpperCase()
      return upperClause === upperKw || upperClause.startsWith(upperKw) || upperClause.endsWith(upperKw)
    })

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

function findCteBodyRanges(sql: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  const re = /(?:\bWITH\s+|\)\s*,\s*)(\w+)\s+AS\s*\(/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(sql)) !== null) {
    const parenStart = match.index + match[0].length - 1
    if (sql[parenStart] !== "(") continue
    let depth = 1
    let i = parenStart + 1
    while (i < sql.length && depth > 0) {
      if (sql[i] === "(") depth++
      else if (sql[i] === ")") depth--
      i++
    }
    if (depth === 0) {
      ranges.push({ start: parenStart, end: i })
    }
  }
  return ranges
}
