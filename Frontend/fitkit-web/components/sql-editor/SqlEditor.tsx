"use client"

import { useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"
import { findClauseSpans } from "@/lib/clause-highlighter"

interface SqlEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute: () => void
  isLoading: boolean
  activeClause?: string
}

const clauseColors: Record<string, string> = {
  SELECT: "bg-blue-200/50 dark:bg-blue-800/30",
  FROM: "bg-green-200/50 dark:bg-green-800/30",
  WHERE: "bg-orange-200/60 dark:bg-orange-800/30",
  "GROUP BY": "bg-purple-200/60 dark:bg-purple-800/30",
  HAVING: "bg-red-200/60 dark:bg-red-800/30",
  "ORDER BY": "bg-cyan-200/60 dark:bg-cyan-800/30",
  DISTINCT: "bg-rose-200/60 dark:bg-rose-800/30",
}

function getClauseColor(clause: string): string {
  if (clause.startsWith("WITH ") || clause.startsWith("CTE.")) return "bg-cyan-200/60 dark:bg-cyan-800/30"
  return clauseColors[clause] || "bg-yellow-200/40 dark:bg-yellow-800/30"
}

export function SqlEditor({ value, onChange, onExecute, isLoading, activeClause }: SqlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const spans = useMemo(() => findClauseSpans(value, activeClause || ""), [value, activeClause])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onExecute()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          SQL Editor
        </span>
        <div className="flex items-center gap-1.5">
          {activeClause && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${getClauseColor(activeClause)}`}>
              {activeClause}
            </span>
          )}
          <Button
            size="xs"
            variant="default"
            onClick={onExecute}
            disabled={isLoading || !value.trim()}
          >
            {isLoading ? (
              <span className="size-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="size-3" />
            )}
            Execute
          </Button>
        </div>
      </div>

      <div className="relative flex-1">
        {/* Highlight overlay */}
        <pre
          className="absolute inset-0 p-4 font-mono text-sm pointer-events-none whitespace-pre-wrap break-all leading-[1.5]"
          aria-hidden
        >
          {spans.map((span, i) => (
            <span
              key={i}
              className={
                span.highlight
                  ? getClauseColor(activeClause || "")
                  : ""
              }
            >
              {span.text}
            </span>
          ))}
          {/* Ensure same height as textarea */}
          {"\n".repeat((value.match(/\n/g) || []).length + 1)}
        </pre>
        {/* Transparent textarea on top */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="relative w-full h-full resize-none border-0 bg-transparent p-4 font-mono text-sm outline-none text-transparent caret-foreground placeholder:text-muted-foreground/40"
          placeholder={`SELECT ...\nFROM ...\nWHERE ...\nGROUP BY ...`}
          spellCheck={false}
        />
      </div>

      <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground/50">
        {activeClause
          ? `Executing: ${activeClause} clause — rows are being filtered`
          : "Ctrl+Enter to execute"}
      </div>
    </div>
  )
}
