export interface TableData {
  columns: string[]
  rows: Record<string, unknown>[]
  totalRows: number
}

export interface WindowFunctionInfo {
  name: string;
  alias?: string;
  expression?: string;
  partitionBy?: string[];
  partitionByRaw?: string;
  orderBy?: { expression: string; direction: string; nulls?: string }[];
  orderByRaw?: string;
  windowFrame?: {
    type?: string;
    unit?: string;
    offset?: string;
    range?: string;
    start?: { type?: string; offset?: string };
    end?: { type?: string; offset?: string };
  };
  overall?: string;
}

export interface StepResult {
  clause: string
  sql: string
  data: TableData
  groupColumns?: string[]
  extras?: {
    rightTableData?: TableData
    onCondition?: string
    rightTable?: string
    leftTable?: string
    joinType?: string
    setAssignments?: string
    beforeData?: TableData
    insertColumns?: string[]
    columnDefinitions?: string[]
    selectSql?: string
    intoTable?: string
    plan?: boolean
    error?: string
    windowFunctions?: WindowFunctionInfo[]
    windowDefinition?: string
  }
}

export interface QueryStepResponse {
  steps: StepResult[]
  finalResult: TableData
}
