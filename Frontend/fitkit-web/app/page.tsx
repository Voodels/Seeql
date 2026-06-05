"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { SqlEditor } from "@/components/sql-editor/SqlEditor"
import { TableCanvas } from "@/components/table-canvas/TableCanvas"
import { DataPanel } from "@/components/data-panel/DataPanel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { executeQuery, setupDataset } from "@/lib/api"
import { PROBLEMS } from "@/lib/problems"
import type { StepResult, TableData } from "@/lib/types"

const difficultyStyles: Record<string, string> = {
  Easy: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  Medium: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  Hard: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
}

export default function Home() {
  const [sql, setSql] = useState(PROBLEMS[9].solution)
  const [steps, setSteps] = useState<StepResult[]>([])
  const [finalResult, setFinalResult] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbReady, setDbReady] = useState(false)
  const [activeClause, setActiveClause] = useState<string>("")
  const [ddl, setDdl] = useState(PROBLEMS[9].ddl)
  const [dml, setDml] = useState(PROBLEMS[9].dml)

  const problem = PROBLEMS.find((p) => p.solution === sql)

  const handleExecute = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await executeQuery(sql, true)
      setSteps(res.steps)
      setFinalResult(res.finalResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed")
    } finally {
      setIsLoading(false)
    }
  }, [sql])

  const handleSetup = useCallback(async (ddlSql: string, dmlSql: string) => {
    setError(null)
    try {
      await setupDataset(ddlSql)
      await setupDataset(dmlSql)
      setDbReady(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed")
    }
  }, [])

  const handleProblemSelect = useCallback(async (problemId: string) => {
    const p = PROBLEMS.find((x) => x.id === problemId)
    if (!p) return

    setDdl(p.ddl)
    setDml(p.dml)
    setSql(p.solution)
    setDbReady(false)
    setSteps([])
    setFinalResult(null)
    setActiveClause("")
    setError(null)

    setIsLoading(true)
    try {
      await setupDataset(p.ddl)
      await setupDataset(p.dml)
      setDbReady(true)
      const res = await executeQuery(p.solution, true)
      setSteps(res.steps)
      setFinalResult(res.finalResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed")
    } finally {
      setIsLoading(false)
    }
  }, [])

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
        {dbReady && (
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium dark:text-emerald-400 dark:bg-emerald-950/50">
            DB Ready
          </span>
        )}
      </header>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-medium">
          {error}
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
          {steps.length > 0 && finalResult ? (
            <TableCanvas
              steps={steps}
              finalResult={finalResult}
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
