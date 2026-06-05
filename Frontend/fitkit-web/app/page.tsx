"use client"

import { useState, useCallback } from "react"
import { SqlEditor } from "@/components/sql-editor/SqlEditor"
import { TableCanvas } from "@/components/table-canvas/TableCanvas"
import { DataPanel } from "@/components/data-panel/DataPanel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { executeQuery, setupDataset } from "@/lib/api"
import type { StepResult, TableData } from "@/lib/types"

export default function Home() {
  const [sql, setSql] = useState(`SELECT category, region, SUM(amount) AS total_sales, AVG(quantity) AS avg_qty, COUNT(*) AS orders\nFROM sales\nWHERE amount > 50\nGROUP BY category, region\nHAVING SUM(amount) > 300\nORDER BY total_sales DESC`)
  const [steps, setSteps] = useState<StepResult[]>([])
  const [finalResult, setFinalResult] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbReady, setDbReady] = useState(false)
  const [activeClause, setActiveClause] = useState<string>("")

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

  const handleSetup = useCallback(async (ddl: string, dml: string) => {
    setError(null)
    try {
      await setupDataset(ddl)
      await setupDataset(dml)
      setDbReady(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed")
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
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

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-medium">
          {error}
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-[420px] min-w-[320px] border-r flex flex-col">
          <Tabs defaultValue="editor" className="flex flex-col flex-1">
            <TabsList variant="line" className="px-3 pt-2">
              <TabsTrigger value="editor">Query</TabsTrigger>
              <TabsTrigger value="dataset">Dataset</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="flex flex-col flex-1 overflow-hidden p-0">
              <SqlEditor
                value={sql}
                onChange={setSql}
                onExecute={handleExecute}
                isLoading={isLoading}
                activeClause={activeClause}
              />
            </TabsContent>
            <TabsContent value="dataset" className="flex flex-col flex-1 overflow-hidden p-0">
              <DataPanel onSetup={handleSetup} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right panel - Visual canvas */}
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
                <p>Write a query and click <strong>Execute</strong></p>
                <p className="text-xs text-muted-foreground/60">
                  1. Go to <strong>Dataset</strong> tab → click Setup
                </p>
                <p className="text-xs text-muted-foreground/60">
                  2. Go to <strong>Query</strong> tab → click Execute
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
