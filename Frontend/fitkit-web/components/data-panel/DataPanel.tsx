"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Database, Play } from "lucide-react"

interface DataPanelProps {
  onSetup: (ddl: string, dml: string) => Promise<void>
  ddl?: string
  dml?: string
  onDdlChange?: (ddl: string) => void
  onDmlChange?: (dml: string) => void
}

export function DataPanel({ onSetup, ddl: controlledDdl, dml: controlledDml, onDdlChange, onDmlChange }: DataPanelProps) {
  const [localDdl, setLocalDdl] = useState(
    "CREATE TABLE Logs (\n  id INT PRIMARY KEY,\n  num INT\n)"
  )
  const [localDml, setLocalDml] = useState(
    "INSERT INTO Logs VALUES\n  (1, 1),\n  (2, 1),\n  (3, 1),\n  (4, 2),\n  (5, 1),\n  (6, 2),\n  (7, 2)"
  )
  const ddl = controlledDdl ?? localDdl
  const dml = controlledDml ?? localDml

  const handleDdlChange = (val: string) => {
    setLocalDdl(val)
    onDdlChange?.(val)
  }
  const handleDmlChange = (val: string) => {
    setLocalDml(val)
    onDmlChange?.(val)
  }
  const [isLoading, setIsLoading] = useState(false)

  const handleSetup = async () => {
    setIsLoading(true)
    try {
      await onSetup(ddl, dml)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Database className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dataset
          </span>
        </div>
        <Button size="xs" onClick={handleSetup} disabled={isLoading}>
          {isLoading ? (
            <span className="size-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="size-3" />
          )}
          Setup
        </Button>
      </div>
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-semibold text-muted-foreground">CREATE TABLE</span>
        </div>
        <textarea
          value={ddl}
          onChange={(e) => handleDdlChange(e.target.value)}
          className="flex-1 min-h-[100px] resize-none border-0 bg-transparent px-3 font-mono text-xs outline-none"
          spellCheck={false}
        />
        <div className="px-3 pt-2 pb-1 border-t">
          <span className="text-[10px] font-semibold text-muted-foreground">INSERT DATA</span>
        </div>
        <textarea
          value={dml}
          onChange={(e) => handleDmlChange(e.target.value)}
          className="flex-1 min-h-[100px] resize-none border-0 bg-transparent px-3 font-mono text-xs outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
