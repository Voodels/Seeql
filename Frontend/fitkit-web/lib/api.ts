const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"

export async function executeQuery(
  sql: string,
  stepMode = true
): Promise<import("./types").QueryStepResponse> {
  const res = await fetch(`${API_BASE}/api/query/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, stepMode }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || "Query failed")
  }
  return res.json()
}

export async function setupDataset(sql: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/dataset/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || "Dataset setup failed")
  }
}
