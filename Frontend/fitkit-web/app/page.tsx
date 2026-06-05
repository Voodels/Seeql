"use client"

import { useState, useCallback } from "react"
import { SqlEditor } from "@/components/sql-editor/SqlEditor"
import { TableCanvas } from "@/components/table-canvas/TableCanvas"
import { DataPanel } from "@/components/data-panel/DataPanel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { executeQuery, setupDataset } from "@/lib/api"
import { PROBLEMS } from "@/lib/problems"
import type { StepResult, TableData } from "@/lib/types"

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

  const currentProblemId = PROBLEMS.find((p) => p.solution === sql)?.id || "custom"

  const handleExecute = useCallback(async (sqlOverride?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await executeQuery(sqlOverride ?? sql, true)
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
    const problem = PROBLEMS.find((p) => p.id === problemId)
    if (!problem) return

    setDdl(problem.ddl)
    setDml(problem.dml)
    setSql(problem.solution)
    setDbReady(false)
    setSteps([])
    setFinalResult(null)
    setActiveClause("")
    setError(null)

    // Auto-setup + execute
    setIsLoading(true)
    try {
      await setupDataset(problem.ddl)
      await setupDataset(problem.dml)
      setDbReady(true)
      const res = await executeQuery(problem.solution, true)
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
        <div className="w-[420px] min-w-[320px] border-r flex flex-col">
          {/* Problem selector */}
          <div className="px-3 pt-3 pb-2 border-b">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Problem Statement
            </label>
            <Select value={currentProblemId} onValueChange={handleProblemSelect}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select a problem..." />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-b">
                  LeetCode Problems ({PROBLEMS.length})
                </div>
                {PROBLEMS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id}. {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentProblemId !== "custom" && (
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                {PROBLEMS.find((p) => p.id === currentProblemId)?.description}
              </p>
            )}
          </div>

          <Tabs defaultValue="editor" className="flex flex-col flex-1">
            <TabsList variant="line" className="px-3 pt-2">
              <TabsTrigger value="editor">Query</TabsTrigger>
              <TabsTrigger value="dataset">Dataset</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="flex flex-col flex-1 overflow-hidden p-0">
              <SqlEditor
                value={sql}
                onChange={setSql}
                onExecute={() => handleExecute()}
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
