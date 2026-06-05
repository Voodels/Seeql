# Seeql — SQL Visual Debugger

Step-by-step SQL execution visualizer. Parses a SQL query, decomposes it into clause-level steps (FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → JOIN), executes each against H2, and animates the transformations in the browser.

---

## Architecture

### System Context

```mermaid
graph TB
    subgraph Browser["Browser (Next.js :3000)"]
        UI["page.tsx<br/>State: sql, steps, activeClause"]
        SE["SqlEditor<br/>Clause-highlighted textarea"]
        DP["DataPanel<br/>DDL / DML setup"]
        TC["TableCanvas<br/>Animation Router"]
    end

    subgraph Backend["SpringBoot (:8081)"]
        QC["QueryController<br/>POST /api/query/execute<br/>POST /api/dataset/setup"]
        QS["QueryService<br/>Step decomposition pipeline"]
        STR["strategy/<br/>7 Strategy classes"]
        MOD["Models<br/>StepResult, TableData"]
    end

    subgraph DB["H2 (in-memory)"]
        H2["sqldebug"]
    end

    UI -->|fetch POST /execute| QC
    UI -->|fetch POST /setup| QC
    QC --> QS
    QS --> STR
    QS -->|JDBC| H2
    QC --> MOD
    QC -->|JSON response| UI
```

### Backend — Strategy Pattern

```mermaid
classDiagram
    class StepStrategy {
        <<interface>>
        +decompose(StepContext ctx)
    }

    class StepContext {
        +JdbcTemplate jdbc
        +PlainSelect plainSelect
        +String ctePrefix
        +String originalSql
        +StringBuilder progressiveFrom
        +List~StepResult~ steps
        +TableData finalResult
        +addStep(StepResult)
        +execute(sql): TableData
    }

    class CteStrategy {
        +decompose()
    }
    class FromStrategy {
        +decompose()
    }
    class JoinStrategy {
        +decompose()
    }
    class WhereStrategy {
        +decompose()
    }
    class GroupByStrategy {
        +decompose()
    }
    class HavingStrategy {
        +decompose()
    }
    class SelectStrategy {
        +decompose()
    }

    StepStrategy <|.. CteStrategy
    StepStrategy <|.. FromStrategy
    StepStrategy <|.. JoinStrategy
    StepStrategy <|.. WhereStrategy
    StepStrategy <|.. GroupByStrategy
    StepStrategy <|.. HavingStrategy
    StepStrategy <|.. SelectStrategy
    StepContext ..> StepStrategy : used by
```

### Pipeline Execution

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant C as QueryController
    participant S as QueryService
    participant P as Pipeline
    participant H as H2

    U->>F: Write SQL + click Execute
    F->>C: POST /api/query/execute { sql, stepMode: true }
    C->>S: executeStepwise(sql)
    S->>S: JSQLParser.parse(sql) → Select
    S->>S: buildCtePrefix(withItems)
    S->>S: new StepContext(jdbc, plainSelect, ctePrefix, sql, withItems)
    S->>P: pipeline.forEach(strategy → strategy.decompose(ctx))

    Note over P: CteStrategy
    P->>H: SELECT * FROM baseTable
    H-->>P: base table rows
    P->>H: WITH ... SELECT * FROM cteName
    H-->>P: CTE result rows
    P->>ctx: addStep("FROM"), addStep("WITH ...")

    Note over P: FromStrategy / JoinStrategy
    P->>H: SELECT * FROM fromItem
    H-->>P: left table rows
    P->>H: SELECT * FROM rightTable
    H-->>P: right table rows
    P->>H: SELECT * FROM left JOIN right ON ...
    H-->>P: joined result rows
    P->>ctx: addStep("FROM"), addStep("JOIN ...")

    Note over P: WhereStrategy
    P->>H: SELECT * FROM t WHERE cond
    H-->>P: filtered rows
    P->>ctx: addStep("WHERE")

    Note over P: GroupByStrategy
    P->>H: SELECT cols... GROUP BY col
    H-->>P: aggregated rows
    P->>ctx: addStep("GROUP BY")

    Note over P: HavingStrategy
    P->>H: SELECT ... HAVING cond
    H-->>P: filtered aggregated rows
    P->>ctx: addStep("HAVING")

    Note over P: SelectStrategy
    P->>H: original SQL (or without DISTINCT)
    H-->>P: final result rows
    P->>ctx: addStep("SELECT"), setFinalResult(...)

    S-->>C: new QueryStepResponse(ctx.steps, ctx.finalResult)
    C-->>F: JSON response
    F->>F: TableCanvas renders active step
    F->>U: Animated visualization
```

### Frontend Component Tree

```mermaid
graph TB
    subgraph Layout["app/page.tsx"]
        PS["Problem Selector<br/>11 LeetCode problems"]
        SE["SqlEditor<br/>- Textarea<br/>- Clause-highlighting overlay"]
        DP["DataPanel<br/>- DDL tab<br/>- DML tab"]
        TC["TableCanvas<br/>- StepTimeline breadcrumb<br/>- Play/step controls"]
    end

    subgraph Animations["components/table-canvas/"]
        ST["StepTimeline<br/>Step progression bar"]
        AT["AnimatedTable<br/>Generic table renderer<br/>+ WHERE/HAVING diff mode"]
        GA["GroupAnimation<br/>5-phase bucket flying<br/>Rows → Assign → Buckets → Collapse → Result"]
        CA["CteAnimation<br/>4-phase partition<br/>Input → Partition → Compute → Result"]
        DA["DistinctAnimation<br/>4-phase dedup<br/>Rows → Mark → Remove → Result"]
        JA["JoinAnimation<br/>4-phase join<br/>Left → Right → Matching → Result"]
    end

    subgraph Shared["lib/"]
        T["types.ts<br/>StepResult, TableData"]
        A["api.ts<br/>fetch wrappers"]
        AU["animation-utils.ts<br/>rowKey, GROUP_COLORS, CLAUSE_BADGE_COLORS"]
        CH["clause-highlighter.ts<br/>findClauses, findClauseSpans"]
        PU["use-phase-stepper.ts<br/>prev/next/play/toggle hook"]
    end

    TC --> ST
    TC --> AT
    TC --> GA
    TC --> CA
    TC --> DA
    TC --> JA
    TC --> T
    TC --> AU
    GA --> AU
    GA --> PU
    CA --> AU
    CA --> PU
    DA --> AU
    DA --> PU
    JA --> AU
    JA --> PU
    SE --> CH
```

### Animation Dispatch Logic

```mermaid
flowchart LR
    A["Step from API"] --> B{"clause?"}
    B -->|"GROUP BY + has groupColumns"| GA["GroupAnimation"]
    B -->|"starts WITH "| CA["CteAnimation"]
    B -->|"DISTINCT"| DA["DistinctAnimation"]
    B -->|"starts JOIN "| JA["JoinAnimation"]
    B -->|"else"| AT["AnimatedTable<br/>(diff mode if WHERE/HAVING)"]
```

---

## REST API

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/api/query/execute` | POST | `{ sql, stepMode }` | `{ steps: StepResult[], finalResult: TableData }` |
| `/api/dataset/setup` | POST | `{ sql }` | `{ status: "ok" }` |

### StepResult

```json
{
  "clause": "JOIN busy b",
  "sql": "WITH busy AS (...) SELECT * FROM Stadium s JOIN busy b ON s.id = b.id",
  "data": { "columns": ["ID","PEOPLE","GRP"], "rows": [...], "totalRows": 6 },
  "groupColumns": ["GRP"],
  "extras": {
    "rightTableData": { "columns": [...], "rows": [...], "totalRows": 6 },
    "onCondition": "s.id = b.id",
    "rightTable": "busy b",
    "leftTable": "Stadium s",
    "joinType": "INNER"
  }
}
```

---

## Project Structure

```
Seeql/
├── Backend/sql-visualizer-backend/
│   ├── pom.xml
│   └── src/main/java/com/sqlvisualizer/backend/
│       ├── SqlVisualizerBackendApplication.java
│       ├── config/CorsConfig.java
│       ├── controller/QueryController.java
│       ├── model/
│       │   ├── QueryRequest.java
│       │   ├── TableData.java
│       │   └── QueryStepResponse.java
│       ├── service/
│       │   └── QueryService.java
│       └── strategy/
│           ├── StepStrategy.java          # interface
│           ├── StepContext.java           # shared context
│           ├── CteStrategy.java
│           ├── FromStrategy.java
│           ├── JoinStrategy.java
│           ├── WhereStrategy.java
│           ├── GroupByStrategy.java
│           ├── HavingStrategy.java
│           └── SelectStrategy.java
│
├── Frontend/fitkit-web/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── sql-editor/SqlEditor.tsx
│   │   ├── data-panel/DataPanel.tsx
│   │   ├── table-canvas/
│   │   │   ├── TableCanvas.tsx           # animation router
│   │   │   ├── StepTimeline.tsx
│   │   │   ├── AnimatedTable.tsx
│   │   │   ├── GroupAnimation.tsx        # 5-phase
│   │   │   ├── CteAnimation.tsx          # 4-phase
│   │   │   ├── DistinctAnimation.tsx     # 4-phase
│   │   │   └── JoinAnimation.tsx         # 4-phase
│   │   └── ui/                           # shadcn components
│   ├── hooks/
│   │   └── use-phase-stepper.ts
│   └── lib/
│       ├── api.ts
│       ├── types.ts
│       ├── animation-utils.ts
│       ├── clause-highlighter.ts
│       ├── problems.ts                   # 12 LeetCode problems
│       └── utils.ts
│
└── README.md
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Framer Motion, shadcn/Radix UI |
| Backend | SpringBoot 4.0.6, Java 21, JSQLParser 5.3 |
| Database | H2 (in-memory, port 8081) |

---

## Key Design Decisions

- **Single request/response**: Backend returns ALL step results in one response. Frontend owns animation timing and pacing.
- **Strategy pattern**: Each SQL clause (FROM, WHERE, GROUP BY, HAVING, SELECT, JOIN, CTE) is a separate strategy class implementing `StepStrategy`. Adding a new clause type = adding one new class → no existing code changes.
- **Progressive JOIN building**: The Nth JOIN step includes all N joins in its FROM clause, so CTE + multi-JOIN queries work correctly.
- **CTE-body exclusion**: Clause-highlighter skips standard SQL keywords inside CTE body parentheses — only main-query clauses are highlighted.
- **Shared animation primitives**: `rowKey`, `GROUP_COLORS`, `CLAUSE_BADGE_COLORS`, `getGroupColor`, `isGroupStep` are shared across all animation components.
- **usePhaseStepper**: Custom hook provides prev/next/play/toggle with inline phaseIdx clamp (no crashes when phases array length changes).
