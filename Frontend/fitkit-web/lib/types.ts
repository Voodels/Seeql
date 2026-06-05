export interface TableData {
  columns: string[]
  rows: Record<string, unknown>[]
  totalRows: number
}

export interface StepResult {
  clause: string
  sql: string
  data: TableData
  groupColumns?: string[]
}

export interface QueryStepResponse {
  steps: StepResult[]
  finalResult: TableData
}
