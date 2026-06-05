"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { SqlEditor } from "@/components/sql-editor/SqlEditor"
import { TableCanvas } from "@/components/table-canvas/TableCanvas"
import { DataPanel } from "@/components/data-panel/DataPanel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { executeQuery, setupDataset } from "@/lib/api"
import { PROBLEMS } from "@/lib/problems"
import type { StepResult, TableData } from "@/lib/types"
import { useTheme } from "@/hooks/use-theme"
import { Play, History, Sun, Moon } from "lucide-react"

const difficultyStyles: Record<string, string> = {
  Easy: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  Medium: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  Hard: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
}

const STORAGE_KEY = "sql-history"
const MAX_HISTORY = 50

export default function Home() {
  const { dark, toggle: toggleTheme } = useTheme()
  const [sql, setSql] = useState("")
  const [steps, setSteps] = useState<StepResult[]>([])
  const [finalResult, setFinalResult] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbReady, setDbReady] = useState(false)
  const [activeClause, setActiveClause] = useState<string>("")
  const [ddl, setDdl] = useState("")
  const [dml, setDml] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const initialized = useRef(false)

  // Load from URL params + history
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setHistory(JSON.parse(stored)) } catch {}
    }

    const params = new URLSearchParams(window.location.search)
    const queryParam = params.get("sql")
    const problemParam = params.get("problem")

    if (problemParam) {
      const p = PROBLEMS.find((x) => x.id === problemParam)
      if (p) loadProblem(p)
      return
    }

    if (queryParam) {
      setSql(queryParam)
      return
    }

    // Default: first problem
    loadProblem(PROBLEMS[0])
  }, [])

  const addToHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const next = [query, ...prev.filter((s) => s !== query)].slice(0, MAX_HISTORY)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateUrl = useCallback((newSql: string, problemId?: string) => {
    const params = new URLSearchParams()
    if (problemId) {
      params.set("problem", problemId)
    } else if (newSql) {
      params.set("sql", newSql)
    }
    const url = params.toString() ? `?${params.toString()}` : "/"
    window.history.replaceState({}, "", url)
  }, [])

  const execute = useCallback(async (query: string) => {
    setIsLoading(true)
    setError(null)
    addToHistory(query)
    try {
      const res = await executeQuery(query, true)
      setSteps(res.steps)
      setFinalResult(res.finalResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed")
    } finally {
      setIsLoading(false)
    }
  }, [addToHistory])

  const handleExecute = useCallback(async () => {
    console.log("[Page] handleExecute:", sql)
    await execute(sql)
    updateUrl(sql)
  }, [sql, execute, updateUrl])

  const handleSetup = useCallback(async (ddlSql: string, dmlSql: string) => {
    setError(null)
    try {
      console.log("[Page] Manual dataset setup: DDL then DML")
      await setupDataset(ddlSql)
      await setupDataset(dmlSql)
      setDbReady(true)
      console.log("[Page] Dataset setup complete")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Setup failed"
      console.error("[Page] Dataset setup error:", msg, err)
      setError(msg)
    }
  }, [])

  const loadProblem = useCallback(async (p: typeof PROBLEMS[0]) => {
    setDdl(p.ddl)
    setDml(p.dml)
    setSql(p.solution)
    setDbReady(false)
    setSteps([])
    setFinalResult(null)
    setActiveClause("")
    setError(null)

    setIsLoading(true)
    console.log("[Page] Loading problem:", p.id, p.title)
    try {
      console.log("[Page] Running DDL...")
      await setupDataset(p.ddl)
      console.log("[Page] DDL complete, running DML...")
      await setupDataset(p.dml)
      console.log("[Page] DML complete, executing query...")
      setDbReady(true)
      const res = await executeQuery(p.solution, true)
      console.log("[Page] Query complete:", res.steps?.length, "steps")
      setSteps(res.steps)
      setFinalResult(res.finalResult)
      addToHistory(p.solution)
      updateUrl(p.solution, p.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Setup failed"
      console.error("[Page] Error:", msg, err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [addToHistory, updateUrl])

  const handleProblemSelect = useCallback(async (problemId: string) => {
    const p = PROBLEMS.find((x) => x.id === problemId)
    if (p) await loadProblem(p)
  }, [loadProblem])

  const handleHistorySelect = useCallback(async (query: string) => {
    setSql(query)
    setShowHistory(false)
    await execute(query)
    updateUrl(query)
  }, [execute, updateUrl])

  const problem = (() => {
    if (typeof window === "undefined") return undefined
    return PROBLEMS.find((p) => p.solution === sql || p.id === new URLSearchParams(window.location.search).get("problem"))
  })()

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight">SQL Visual Debugger</h1>
          {activeClause && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-foreground/10 text-foreground">
              Executing: {activeClause}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dbReady && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium dark:text-emerald-400 dark:bg-emerald-950/50">
              DB Ready
            </span>
          )}
          <Button size="icon-xs" variant="ghost" onClick={() => setShowHistory(!showHistory)} title="History">
            <History className="size-3.5" />
          </Button>
          <Button size="icon-xs" variant="ghost" onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"}>
            {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </Button>
        </div>
      </header>

      {/* History panel */}
      {showHistory && history.length > 0 && (
        <div className="absolute top-10 right-4 z-50 w-80 bg-popover border rounded-lg shadow-xl p-2 max-h-60 overflow-auto">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
            Recent Queries
          </div>
          {history.map((q, i) => (
            <button
              key={i}
              onClick={() => handleHistorySelect(q)}
              className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent truncate font-mono"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-destructive/10 border-b border-destructive/20">
          <div className="flex-1 min-w-0">
            <p className="text-destructive text-xs font-medium">{error}</p>
            {(error.includes("Failed to fetch") || error.includes("NetworkError") || error.includes("CORS")) && (
              <p className="text-[10px] text-destructive/70 mt-1 leading-relaxed">
                Check that the backend is running on port 8081 (<code className="bg-destructive/10 px-1 rounded">cd Backend/sql-visualizer-backend && mvn spring-boot:run</code>).
                Also verify CORS config allows <code className="bg-destructive/10 px-1 rounded">http://localhost:3000</code>.
              </p>
            )}
          </div>
          <button onClick={() => setError(null)} className="text-destructive/60 hover:text-destructive text-xs shrink-0">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-[420px] min-w-[320px] border-r flex flex-col">
          <Tabs defaultValue="editor" className="flex flex-col flex-1">
            <TabsList variant="line" className="px-3 pt-2">
              <TabsTrigger value="editor">Query</TabsTrigger>
              <TabsTrigger value="dataset">Dataset</TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="flex flex-col flex-1 overflow-hidden p-0">
              {/* Problem selector inside the Query tab */}
              <div className="px-3 pt-3 pb-2 border-b space-y-2">
                <Select value={problem?.id || "custom"} onValueChange={handleProblemSelect}>
                  <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Select a problem..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-b">
                      LeetCode SQL Problems
                    </div>
                    {PROBLEMS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.id}. {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {problem && (
                  <div className="text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{problem.title}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${difficultyStyles[problem.difficulty]}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {problem.description}
                    </p>
                  </div>
                )}
              </div>

              <SqlEditor
                value={sql}
                onChange={setSql}
                onExecute={handleExecute}
                isLoading={isLoading}
                activeClause={activeClause}
              />
            </TabsContent>

            <TabsContent value="dataset" className="flex flex-col flex-1 overflow-hidden p-0">
              <DataPanel
                onSetup={handleSetup}
                ddl={ddl}
                dml={dml}
                onDdlChange={setDdl}
                onDmlChange={setDml}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {steps.length > 0 ? (
            <TableCanvas
              steps={steps}
              finalResult={finalResult || steps[steps.length - 1].data}
              onActiveClauseChange={setActiveClause}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center space-y-2">
                <p>Select a problem from the dropdown above</p>
                <p className="text-xs text-muted-foreground/60">
                  The DDL, data, and solution will auto-load
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
