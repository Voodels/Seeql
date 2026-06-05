const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"

function log(method: string, url: string, status: number, durationMs: number, body?: unknown) {
  const prefix = status >= 200 && status < 300 ? "✓" : "✗"
  console.log(
    `[API] ${prefix} ${method} ${url} → ${status} (${durationMs}ms)`,
    body ? body : ""
  )
}

function logError(method: string, url: string, err: unknown, durationMs: number) {
  console.error(
    `[API] ✗ ${method} ${url} → FAILED (${durationMs}ms):`,
    err instanceof Error ? err.message : err
  )
  if (err instanceof Error && err.stack) {
    console.debug(`[API] Stack: ${err.stack}`)
  }
}

export async function fetchSchema(): Promise<{
  TABLE_NAME: string
  TABLE_TYPE: string
  columns: { COLUMN_NAME: string; DATA_TYPE: string }[]
}[]> {
  const start = Date.now()
  const url = `${API_BASE}/api/schema`
  try {
    const res = await fetch(url)
    const duration = Date.now() - start
    if (!res.ok) {
      log("GET", url, res.status, duration)
      return []
    }
    const data = await res.json()
    log("GET", url, res.status, duration, `(${data.length} tables)`)
    return data
  } catch (err) {
    logError("GET", url, err, Date.now() - start)
    return []
  }
}

export async function executeQuery(
  sql: string,
  stepMode = true
): Promise<import("./types").QueryStepResponse> {
  const start = Date.now()
  const url = `${API_BASE}/api/query/execute`
  const body = JSON.stringify({ sql, stepMode })
  console.group(`[API] POST /api/query/execute`)
  console.log(`[API]   Body: ${body.substring(0, 500)}${body.length > 500 ? "..." : ""}`)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    const duration = Date.now() - start
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }))
      log("POST", url, res.status, duration, errBody)
      console.groupEnd()
      throw new Error(errBody.error || `HTTP ${res.status}: ${res.statusText}`)
    }
    const data: import("./types").QueryStepResponse = await res.json()
    log("POST", url, res.status, duration, `${data.steps?.length || 0} steps, ${data.finalResult?.rows?.length || 0} final rows`)
    console.groupEnd()
    return data
  } catch (err) {
    logError("POST", url, err, Date.now() - start)
    console.groupEnd()
    throw err
  }
}

export async function setupDataset(sql: string): Promise<void> {
  const start = Date.now()
  const url = `${API_BASE}/api/dataset/setup`
  const body = JSON.stringify({ sql })
  console.log(`[API] POST /api/dataset/setup - ${sql.substring(0, 200)}${sql.length > 200 ? "..." : ""}`)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    const duration = Date.now() - start
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: res.statusText }))
      log("POST", url, res.status, duration, errBody)
      throw new Error(errBody.error || `HTTP ${res.status}: ${res.statusText}`)
    }
    log("POST", url, res.status, duration)
  } catch (err) {
    logError("POST", url, err, Date.now() - start)
    throw err
  }
}
