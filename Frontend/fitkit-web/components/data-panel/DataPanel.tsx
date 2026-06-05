"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Database, Play } from "lucide-react"

interface DataPanelProps {
  onSetup: (ddl: string, dml: string) => Promise<void>
}

export function DataPanel({ onSetup }: DataPanelProps) {
  const [ddl, setDdl] = useState(
    "CREATE TABLE logs (\n  id INT,\n  val INT,\n  category VARCHAR(10)\n)"
  )
  const [dml, setDml] = useState(
    "INSERT INTO logs VALUES\n  (1, 5, 'A'),\n  (2, 3, 'A'),\n  (3, 8, 'B'),\n  (4, 2, 'B'),\n  (5, 6, 'A')"
  )
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
          onChange={(e) => setDdl(e.target.value)}
          className="flex-1 min-h-[100px] resize-none border-0 bg-transparent px-3 font-mono text-xs outline-none"
          spellCheck={false}
        />
        <div className="px-3 pt-2 pb-1 border-t">
          <span className="text-[10px] font-semibold text-muted-foreground">INSERT DATA</span>
        </div>
        <textarea
          value={dml}
          onChange={(e) => setDml(e.target.value)}
          className="flex-1 min-h-[100px] resize-none border-0 bg-transparent px-3 font-mono text-xs outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
