# SQL Visual Debugger

Step-by-step SQL execution visualizer. Parses a SQL query, decomposes it into clause-level steps
(FROM → WHERE → GROUP BY → HAVING → SELECT), executes each against H2, and animates the
transformations in the browser.

---

## Architecture

```
Browser (Next.js :3000)          SpringBoot (:8081)           H2 (in-memory)
 ┌─────────────────────┐          ┌─────────────────┐         ┌─────────────┐
 │                     │  POST    │                 │  JDBC   │             │
 │  page.tsx ──────────┼─────────►│ QueryController─┼────────►│  sqldebug   │
 │                     │ /execute │        │        │         │             │
 │  TableCanvas        │          │  QueryService   │         └─────────────┘
 │   ├─ StepTimeline   │          │  └─ stepwise()  │
 │   ├─ AnimatedTable  │  JSON    │  └─ execute()   │
 │   ├─ GroupAnimation │◄─────────┤  └─ executeDdl()│
 │   └─ CteAnimation   │          └─────────────────┘
 │  SqlEditor          │
 │  DataPanel          │
 └─────────────────────┘
```

**Data flow:**

1. User writes SQL + clicks Execute
2. Frontend sends `POST /api/query/execute { sql, stepMode: true }`
3. Backend parses SQL with **JSQLParser** → decomposes into clause-level sub-queries
4. Each sub-query is executed against H2 → results returned as a step array
5. Frontend **TableCanvas** receives `StepResult[]`, renders the active step's component
6. User clicks through steps (or auto-plays) → each animation component renders the transition

**Key design decisions:**
- Backend returns ALL step results in one response (no WebSocket needed)
- Frontend owns animation pacing — step data is pre-fetched
- Each clause type can have its own animation component
- The SQL editor highlights the currently-active clause span

---

## Backend (`Backend/sql-visualizer-backend/`)

### Stack
- SpringBoot 4.0.6 / Java 21
- H2 in-memory database (port 8081)
- JSQLParser 5.3 for SQL parsing
- Lombok (optional)

### Structure

```
src/main/java/com/sqlvisualizer/backend/
├── SqlVisualizerBackendApplication.java   # Entry point
├── config/
│   └── CorsConfig.java                     # CORS for localhost:3000
├── controller/
│   └── QueryController.java                # REST endpoints
├── model/
│   ├── QueryRequest.java                   # { sql, stepMode }
│   ├── TableData.java                      # { columns[], rows[], totalRows }
│   └── QueryStepResponse.java              # { steps[], finalResult }
└── service/
    └── QueryService.java                   # ALL logic (182 lines — needs refactoring)
```

### REST API

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/api/query/execute` | POST | `{ sql, stepMode }` | `{ steps: StepResult[], finalResult: TableData }` |
| `/api/dataset/setup` | POST | `{ sql }` | `{ status: "ok" }` |

**`StepResult`**:
```json
{
  "clause": "WITH NumberedLogs",
  "sql": "WITH NumberedLogs AS (...) SELECT * FROM NumberedLogs",
  "data": { "columns": [...], "rows": [...], "totalRows": 7 },
  "groupColumns": ["NUM", "STREAK_ID"]   // only for GROUP BY steps
}
```

---

## Frontend (`Frontend/fitkit-web/`)

### Stack
- Next.js 15+ (App Router)
- TypeScript
- Framer Motion (animations)
- shadcn/Radix UI components

### Component tree

```
app/
  page.tsx                    # Main layout, state (sql, steps, activeClause)
components/
  sql-editor/
    SqlEditor.tsx             # Textarea + clause-highlighting overlay
  data-panel/
    DataPanel.tsx             # DDL/DML input tabs
  table-canvas/
    TableCanvas.tsx            # Router: picks animation component by clause type
    StepTimeline.tsx           # Step navigation breadcrumb + play controls
    AnimatedTable.tsx          # Generic table with WHERE/HAVING diff mode
    GroupAnimation.tsx         # 5-phase GROUP BY bucket animation
    CteAnimation.tsx           # 4-phase CTE/window-function animation
lib/
  api.ts                      # fetch wrappers
  types.ts                    # shared interfaces
  clause-highlighter.ts       # regex-based clause span finder (+ CTE names)
  utils.ts                    # cn() utility
```

### Animation component dispatch (in `TableCanvas.tsx`)

```
clause === "GROUP BY" && has groupColumns  →  GroupAnimation
clause starts with "WITH "                 →  CteAnimation
otherwise                                   →  AnimatedTable (or diff mode for WHERE/HAVING)
```

---

## SQL Feature Matrix

### Legend
| Icon | Meaning |
|------|---------|
| ✅ | Fully implemented — backend decomposes + frontend animates |
| 🟡 | Partially — works for basic cases, missing edge cases or animation |
| 🔶 | Detected by parser but not decomposed into steps |
| ❌ | Not implemented |
| 📋 | Planned |

### SELECT clause

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| `SELECT *` | ✅ | `SELECT * FROM t` as final step | AnimatedTable | |
| `SELECT col1, col2` | ✅ | Passes through to JSQLParser | AnimatedTable | |
| `SELECT DISTINCT` | 🟡 | Backend decomposes as final SELECT step | AnimatedTable | No DISTINCT-specific animation |
| Aggregates `COUNT, SUM, AVG, MIN, MAX` | 🟡 | GROUP BY captures them | GroupAnimation shows aggregated result | Frontend detects via regex on column name |
| Column aliases `col AS alias` | 🟡 | Passes through (SQL handles it) | AnimatedTable | Aliases in SELECT not separately highlighted |
| `LIMIT` / `OFFSET` | 🔶 | JSQLParser parses it | — | No step decomposition |
| `ORDER BY` | 🔶 | JSQLParser parses it | clause-highlighter finds it | No animation |
| Scalar subqueries in SELECT | ❌ | No decomposition | — | Need subquery executor |
| `CASE WHEN ... THEN ... END` | 🟡 | Passes through to SQL | AnimatedTable shows result | No CASE-specific animation |
| `COALESCE` / `NULLIF` | 🟡 | Passes through | AnimatedTable | No special handling |
| `FOR UPDATE` / `FOR SHARE` | ❌ | — | — | |
| `UNION` / `INTERSECT` / `EXCEPT` | ❌ | JSQLParser can parse but no decomposition | — | Set operation decomposition needed |

### FROM clause

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| Single table `FROM t` | ✅ | `SELECT * FROM t` as first step | AnimatedTable | |
| Multiple tables `FROM a, b` | 🟡 | Uses first item.toString() | AnimatedTable | Cross join not decomposed |
| `INNER JOIN ... ON` | ❌ | No JOIN decomposition | — | Need join step with left/right datasets |
| `LEFT / RIGHT / FULL JOIN` | ❌ | — | — | |
| `CROSS JOIN` | ❌ | — | — | |
| `NATURAL JOIN` | ❌ | — | — | |
| `LATERAL` subquery | ❌ | — | — | |
| Subquery in FROM | ❌ | — | — | |
| `TABLESAMPLE` | ❌ | — | — | |
| `UNNEST(...)` | ❌ | — | — | |

### WHERE clause

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| Simple condition `WHERE col = val` | ✅ | `SELECT * FROM t WHERE ...` | AnimatedTable diff mode | Shows ✓ kept / ✕ removed |
| `AND` / `OR` / `NOT` | ✅ | Passes through | Diff mode | |
| `IN (val1, val2)` | ✅ | Passes through | Diff mode | |
| `BETWEEN x AND y` | ✅ | Passes through | Diff mode | |
| `LIKE` / `ILIKE` | ✅ | Passes through | Diff mode | |
| `IS NULL` / `IS NOT NULL` | ✅ | Passes through | Diff mode | |
| Subquery `WHERE col IN (SELECT ...)` | ❌ | No subquery execution | — | Need subquery evaluator |
| `EXISTS (SELECT ...)` | ❌ | — | — | |
| `ANY` / `ALL` | ❌ | — | — | |
| JSON operators `->`, `->>`, `@>` | ❌ | — | — | |
| Full-text search `@@` | ❌ | — | — | |

### GROUP BY clause

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| Single column | ✅ | `SELECT cols... GROUP BY col` | GroupAnimation (5-phase) | Bucket flying animation |
| Multiple columns | ✅ | Concatenates group key | GroupAnimation | |
| GROUP BY expression | 🟡 | Uses expression.toString() | GroupAnimation | May break for complex expressions |
| `ROLLUP` | ❌ | — | — | |
| `CUBE` | ❌ | — | — | |
| `GROUPING SETS` | ❌ | — | — | |
| `HAVING` | ✅ | Same as WHERE step | AnimatedTable diff mode | |

### Window functions

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` | 🟡 | CTE step returns result | CteAnimation (partition phase) | Partition color-coding works |
| `RANK()` / `DENSE_RANK()` | 🟡 | Passes through | CteAnimation | Same partition visualization |
| `NTILE(n)` | ❌ | — | CteAnimation would need extension | |
| `LAG()` / `LEAD()` | 🟡 | Passes through | CteAnimation compute phase | Shows as computed new column |
| `FIRST_VALUE()` / `LAST_VALUE()` | ❌ | — | — | |
| Window frame `ROWS BETWEEN` | ❌ | No frame parsing | — | |
| Named window `WINDOW w AS (...)` | ❌ | — | — | |

### CTE (Common Table Expressions)

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| Basic CTE `WITH name AS (...) SELECT` | ✅ | Decomposes as separate step | CteAnimation | 4 phases |
| Multiple CTEs | ✅ | Iterates withItems list | CteAnimation per CTE | |
| CTE with column aliases `WITH t(a,b) AS (...)` | ❌ | JSQLParser supports but not extracted | — | |
| `WITH RECURSIVE` | ❌ | No recursion detection | — | Recursive CTE visualization is complex |

### Set operations

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| `UNION` / `UNION ALL` | ❌ | No SetOperation decomposition | — | |
| `INTERSECT` / `EXCEPT` | ❌ | — | — | |

### DDL / DML

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| `CREATE TABLE` | ✅ | executeDdl() → jdbcTemplate.execute() | DataPanel textarea | |
| `INSERT` | ✅ | executeDdl() | DataPanel textarea | |
| `UPDATE` | ❌ | No step decomposition | — | |
| `DELETE` | ❌ | No step decomposition | — | |
| `MERGE` | ❌ | — | — | |
| `CREATE INDEX` | 🟡 | executeDdl() | DataPanel | |
| `ALTER TABLE` | 🟡 | executeDdl() | DataPanel | |
| `DROP TABLE` / `TRUNCATE` | ❌ | Not tested | DataPanel | |

### Subqueries

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| Scalar subquery in SELECT | ❌ | — | — | |
| Correlated subquery in WHERE | ❌ | — | — | |
| Subquery in FROM (derived table) | ❌ | — | — | |
| `LATERAL` join | ❌ | — | — | |

### Types & advanced PostgreSQL

| Feature | Status | Backend | Frontend | Notes |
|---------|--------|---------|----------|-------|
| JSON / JSONB operators | ❌ | — | — | |
| Array types & operators | ❌ | — | — | |
| Full-text search `tsvector` / `tsquery` | ❌ | — | — | |
| `EXPLAIN ANALYZE` | ❌ | No explain plan parsing | — | |
| Views / Materialized views | ❌ | — | — | |
| Stored procedures / functions | ❌ | — | — | |
| Triggers / rules | ❌ | — | — | |

---

## How step decomposition works (`QueryService.executeStepwise`)

```
Input SQL: WITH cte AS (...) SELECT a, b FROM t WHERE cond GROUP BY a HAVING COUNT(*) > 1

1. Parse with JSQLParser → Select statement
2. Extract WITH items (CTEs)
3. Build CTE prefix: "WITH cte AS (...) "
4. For each CTE:            Step "WITH cte"     ← shows CTE result
5. FROM:                     Step "FROM"         ← "SELECT * FROM t"
6. WHERE:                    Step "WHERE"        ← "WITH cte AS (...) SELECT * FROM t WHERE cond"
7. GROUP BY:                 Step "GROUP BY"     ← "WITH cte AS (...) SELECT a, COUNT(*) FROM t GROUP BY a"
8. HAVING:                   Step "HAVING"       ← "WITH cte AS (...) SELECT a, COUNT(*) FROM t GROUP BY a HAVING COUNT(*) > 1"
9. Final SELECT:             Step "SELECT"       ← original query

Each step executes its sub-query against H2 (which has the real data).
The CTE prefix ensures CTE names are in scope for all intermediate queries.
```

### Current limitations in step decomposition

| Issue | Detail |
|-------|--------|
| FROM only shows first from-item | `FROM a, b` only shows `SELECT * FROM a` |
| No JOIN decomposition | `FROM a JOIN b ON ...` not split into left/right/join steps |
| WHERE with subqueries | `WHERE x IN (SELECT ...)` — subquery not evaluated separately |
| ORDER BY | Detected by parser but no ORDER BY step exists |
| Set operations | UNION/INTERSECT not decomposed |
| Recursive CTE | Not detected or decomposed |
| Compound statements | Multiple semicolon-separated statements not handled |

---

## Roadmap (priority order)

### Phase 1 — Backend modularization
- Refactor `QueryService` → Strategy pattern: `ClauseProcessor` interface, one processor per clause
- Extract SQL building helpers (WHERE builder, GROUP BY builder, HAVING builder)
- Add `StepResult.metadata` for animation hints (diff type, partition info, etc.)

### Phase 2 — JOIN support
- Decompose `FROM a JOIN b ON cond` into three sub-steps: cartesian product, filter by ON, select columns
- Animate as new component `JoinAnimation` or extend `AnimatedTable`

### Phase 3 — ORDER BY + LIMIT
- Add ORDER BY step (shows sorted vs unsorted rows)
- Add LIMIT step (which rows were kept/dropped)

### Phase 4 — Subqueries
- Extract subqueries as separate intermediate steps
- Visualize correlated vs non-correlated execution

### Phase 5 — Set operations
- UNION/INTERSECT/EXCEPT as multi-source animation
- Show left, right, and result sets

### Phase 6 — Recursive CTE
- Show each recursive iteration as separate step
- Animate iteration expansion/termination

### Phase 7 — Frontend consolidation
- Shared `usePhaseStepper` hook for animation phase controls
- Shared color palettes and `rowKey` utility
- Consistent error/empty states across animation components
- Storybook or Playwright tests for animations

---

## File reference

```
# Backend
Backend/sql-visualizer-backend/
├── pom.xml
├── src/main/resources/application.properties
└── src/main/java/com/sqlvisualizer/backend/
    ├── SqlVisualizerBackendApplication.java
    ├── config/CorsConfig.java
    ├── controller/QueryController.java
    ├── model/
    │   ├── QueryRequest.java
    │   ├── TableData.java
    │   └── QueryStepResponse.java
    └── service/QueryService.java              ← 182 lines, ALL logic (needs splitting)

# Frontend
Frontend/fitkit-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                               ← Main orchestration (120 lines)
│   └── globals.css
├── components/
│   ├── sql-editor/SqlEditor.tsx               ← SQL textarea + highlights (110 lines)
│   ├── data-panel/DataPanel.tsx               ← DDL/DML setup (69 lines)
│   ├── table-canvas/
│   │   ├── TableCanvas.tsx                    ← Animation router (140 lines)
│   │   ├── StepTimeline.tsx                   ← Step navigation (67 lines)
│   │   ├── AnimatedTable.tsx                  ← Generic table + WHERE diff (223 lines)
│   │   ├── GroupAnimation.tsx                 ← GROUP BY bucket fly (237 lines)
│   │   └── CteAnimation.tsx                   ← CTE phase animation (487 lines)
│   └── ui/                                    ← shadcn components (8 files)
└── lib/
    ├── api.ts
    ├── types.ts
    ├── clause-highlighter.ts                  ← SQL clause span finder (127 lines)
    └── utils.ts
```
