package com.sqlvisualizer.backend.service;

import com.sqlvisualizer.backend.model.QueryStepResponse;
import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import com.sqlvisualizer.backend.strategy.*;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.schema.Table;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.create.table.CreateTable;
import net.sf.jsqlparser.statement.alter.Alter;
import net.sf.jsqlparser.statement.alter.AlterExpression;
import net.sf.jsqlparser.statement.drop.Drop;
import net.sf.jsqlparser.statement.delete.Delete;
import net.sf.jsqlparser.statement.select.*;
import net.sf.jsqlparser.statement.update.Update;
import net.sf.jsqlparser.statement.insert.Insert;
import net.sf.jsqlparser.statement.ExplainStatement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class QueryService {

    private static final Logger log = LoggerFactory.getLogger(QueryService.class);
    private final JdbcTemplate jdbcTemplate;

    public QueryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        log.info("QueryService initialized with JdbcTemplate");
    }

    public QueryStepResponse executeStepwise(String sql) {
        log.info("executeStepwise called with SQL: {}", sql);
        sql = fixMySqlCompatibility(sql);
        try {
            List<Statement> statements = CCJSqlParserUtil.parseStatements(sql);
            if (statements.size() > 1) {
                return handleCompoundStatements(statements);
            }

            Statement statement = statements.getFirst();

            if (statement instanceof Update update) {
                return handleUpdate(update);
            }
            if (statement instanceof Delete delete) {
                return handleDelete(delete);
            }
            if (statement instanceof Insert insert) {
                return handleInsert(insert);
            }
            if (statement instanceof CreateTable ct) {
                return handleCreateTable(ct);
            }
            if (statement instanceof ExplainStatement explain) {
                return handleExplain(explain);
            }
            if (!(statement instanceof Select select)) {
                throw new IllegalArgumentException("Only SELECT/UPDATE/DELETE/INSERT/CREATE TABLE/EXPLAIN queries are supported");
            }

            String ctePrefix = buildCtePrefix(select.getWithItemsList());
            Select selectBody = select.getSelectBody();

            if (selectBody instanceof SetOperationList setOps) {
                return handleSetOperations(sql, setOps, ctePrefix);
            }

            if (!(selectBody instanceof PlainSelect plainSelect)) {
                return executeSimple(sql);
            }

            // SELECT INTO ... detection
            if (plainSelect.getIntoTables() != null && !plainSelect.getIntoTables().isEmpty()) {
                return handleSelectInto(select, plainSelect, ctePrefix, sql);
            }

            StepContext ctx = new StepContext(jdbcTemplate, plainSelect,
                ctePrefix, sql, select.getWithItemsList());

            List<StepStrategy> pipeline = Arrays.asList(
                new CteStrategy(),
                new FromStrategy(),
                new JoinStrategy(),
                new WhereStrategy(),
                new GroupByStrategy(),
                new HavingStrategy(),
                new SelectStrategy(),
                new OrderByStrategy(),
                new LimitStrategy()
            );

            for (StepStrategy strategy : pipeline) {
                strategy.decompose(ctx);
            }

            // Ensure finalResult is set (use last step data as fallback)
            if (ctx.getFinalResult() == null && !ctx.getSteps().isEmpty()) {
                ctx.setFinalResult(ctx.getSteps().getLast().getData());
            }

            return new QueryStepResponse(ctx.getSteps(), ctx.getFinalResult());

        } catch (JSQLParserException e) {
            return executeSimple(sql);
        } catch (RuntimeException e) {
            String rootMsg = getRootCauseMessage(e);
            if (rootMsg.toLowerCase().contains("not found")) {
                String table = extractTableName(rootMsg);
                throw new RuntimeException("Table '" + table + "' not found. Select a problem from the dropdown to setup the database, or run DDL in the Dataset tab first.", e);
            }
            throw e;
        }
    }

    private QueryStepResponse handleUpdate(Update update) {
        log.info("handleUpdate: {}", update);
        List<StepResult> steps = new ArrayList<>();
        String tableName = update.getTable().getName();

        TableData before = executeQuery("SELECT * FROM " + tableName);
        steps.add(new StepResult("BEFORE", "SELECT * FROM " + tableName, before));

        if (update.getWhere() != null) {
            String whereSql = "SELECT * FROM " + tableName + " WHERE " + update.getWhere();
            TableData filtered = executeQuery(whereSql);
            steps.add(new StepResult("WHERE", whereSql, filtered));
        }

        // Show the SET assignments
        StringBuilder setDesc = new StringBuilder();
        if (update.getUpdateSets() != null) {
            for (var us : update.getUpdateSets()) {
                if (setDesc.length() > 0) setDesc.append(", ");
                setDesc.append(us);
            }
        }
        String setStr = setDesc.toString();
        Map<String, Object> extras = new HashMap<>();
        extras.put("setAssignments", setStr);
        extras.put("beforeData", before);

        // Execute the UPDATE
        jdbcTemplate.update(update.toString());
        TableData after = executeQuery("SELECT * FROM " + tableName);
        steps.add(new StepResult("UPDATE", update.toString(), after, null, extras));
        return new QueryStepResponse(steps, after);
    }

    private QueryStepResponse handleDelete(Delete delete) {
        log.info("handleDelete: {}", delete);
        List<StepResult> steps = new ArrayList<>();
        String tableName = delete.getTable().getName();

        TableData before = executeQuery("SELECT * FROM " + tableName);
        steps.add(new StepResult("BEFORE", "SELECT * FROM " + tableName, before));

        if (delete.getWhere() != null) {
            String whereSql = "SELECT * FROM " + tableName + " WHERE " + delete.getWhere();
            TableData filtered = executeQuery(whereSql);
            steps.add(new StepResult("WHERE", whereSql, filtered));
        }

        Map<String, Object> extras = new HashMap<>();
        extras.put("beforeData", before);

        // Execute the DELETE
        jdbcTemplate.update(delete.toString());
        TableData after = executeQuery("SELECT * FROM " + tableName);
        steps.add(new StepResult("DELETE", delete.toString(), after, null, extras));
        return new QueryStepResponse(steps, after);
    }

    private QueryStepResponse handleInsert(Insert insert) {
        log.info("handleInsert: {}", insert);
        List<StepResult> steps = new ArrayList<>();
        String tableName = insert.getTable().getName();
        Map<String, Object> extras = new HashMap<>();
        if (insert.getColumns() != null) {
            List<String> colNames = new ArrayList<>();
            for (var col : insert.getColumns()) {
                colNames.add(col.getColumnName());
            }
            extras.put("insertColumns", colNames);
        }

        TableData before = beforeState(tableName);
        steps.add(new StepResult("BEFORE", "SELECT * FROM " + tableName, before));

        String insertSql = insert.toString();
        if (insert.getSelect() != null) {
            String selectPart = insert.getSelect().toString();
            TableData insertedData = executeQuery(selectPart);
            steps.add(new StepResult("VALUES", selectPart, insertedData));
        }

        jdbcTemplate.update(insertSql);
        TableData after = executeQuery("SELECT * FROM " + tableName);
        extras.put("beforeData", before);
        steps.add(new StepResult("INSERT", insertSql, after, null, extras));
        return new QueryStepResponse(steps, after);
    }

    private QueryStepResponse handleCreateTable(CreateTable ct) {
        log.info("handleCreateTable: {}", ct);
        List<StepResult> steps = new ArrayList<>();
        String tableName = ct.getTable().getName();
        Map<String, Object> extras = new HashMap<>();
        if (ct.getColumnDefinitions() != null) {
            List<String> colDefs = new ArrayList<>();
            for (var cd : ct.getColumnDefinitions()) {
                colDefs.add(cd.getColumnName() + " " + cd.getColDataType().toString());
            }
            extras.put("columnDefinitions", colDefs);
        }

        steps.add(new StepResult("BEFORE", "CREATE TABLE " + tableName + " (definition)", new TableData(List.of(), List.of())));

        if (ct.getSelect() != null) {
            Select select = ct.getSelect();
            String selectSql = select.toString();
            TableData selectData = executeQuery("SELECT * FROM (" + selectSql + ") WHERE 1=0");
            extras.put("selectSql", selectSql);
            steps.add(new StepResult("SELECT", selectSql, selectData));
        }

        executeDdl(ct.toString());
        TableData after = executeQuery("SELECT * FROM " + tableName);
        steps.add(new StepResult("CREATE", ct.toString(), after, null, extras));
        return new QueryStepResponse(steps, after);
    }

    private QueryStepResponse handleSelectInto(Select select, PlainSelect plainSelect, String ctePrefix, String originalSql) {
        log.info("handleSelectInto: {} INTO {}", originalSql, plainSelect.getIntoTables());
        List<StepResult> steps = new ArrayList<>();
        List<net.sf.jsqlparser.schema.Table> intoTables = plainSelect.getIntoTables();
        String intoTarget = intoTables.getFirst().getName();

        steps.add(new StepResult("BEFORE", "SELECT INTO " + intoTarget, new TableData(List.of(), List.of())));

        // Build SELECT without INTO for preview
        plainSelect.setIntoTables(null);
        String selectSql = ctePrefix + plainSelect.toString();
        plainSelect.setIntoTables(intoTables);

        // Show the FROM/WHERE/etc steps and the SELECT result
        StepContext ctx = new StepContext(jdbcTemplate, plainSelect, ctePrefix, originalSql, select.getWithItemsList());
        List<StepStrategy> pipeline = Arrays.asList(
            new CteStrategy(), new FromStrategy(), new JoinStrategy(), new WhereStrategy(),
            new GroupByStrategy(), new HavingStrategy(), new SelectStrategy(),
            new OrderByStrategy(), new LimitStrategy()
        );
        for (StepStrategy strategy : pipeline) strategy.decompose(ctx);
        steps.addAll(ctx.getSteps());

        // Execute via CREATE TABLE AS
        String createSql = "CREATE TABLE " + intoTarget + " AS " + selectSql;
        try {
            jdbcTemplate.update(createSql);
        } catch (Exception e) {
            // Fallback: just show SELECT result without actually creating table
            Map<String, Object> extras = new HashMap<>();
            extras.put("intoTable", intoTarget);
            extras.put("error", "Could not create table: " + e.getMessage());
            TableData selectData = executeQuery(selectSql);
            steps.add(new StepResult("INTO", originalSql, selectData, null, extras));
            return new QueryStepResponse(steps, selectData);
        }

        TableData after = executeQuery("SELECT * FROM " + intoTarget);
        Map<String, Object> extras = new HashMap<>();
        extras.put("intoTable", intoTarget);
        steps.add(new StepResult("INTO", originalSql, after, null, extras));
        return new QueryStepResponse(steps, after);
    }

    private QueryStepResponse handleExplain(ExplainStatement explain) {
        log.info("handleExplain: {}", explain);
        List<StepResult> steps = new ArrayList<>();
        String explainSql = explain.toString();

        TableData planData = executeQuery(explainSql);
        Map<String, Object> extras = new HashMap<>();
        extras.put("plan", true);

        steps.add(new StepResult("EXPLAIN", explainSql, planData, null, extras));
        return new QueryStepResponse(steps, planData);
    }

    private QueryStepResponse handleCompoundStatements(List<Statement> statements) {
        log.info("handleCompoundStatements: {} statements", statements.size());
        List<StepResult> allSteps = new ArrayList<>();
        TableData lastResult = null;
        int stmtIdx = 0;
        for (Statement stmt : statements) {
            stmtIdx++;
            log.debug("  Statement #{}: {} -> {}", stmtIdx, stmt.getClass().getSimpleName(), stmt);
            if (stmt instanceof Select) {
                // Recursively decompose each SELECT
                QueryStepResponse resp = executeStepwise(stmt.toString());
                // Prefix step clauses with statement index
                for (StepResult s : resp.getSteps()) {
                    allSteps.add(new StepResult("#" + stmtIdx + " " + s.getClause(),
                        s.getSql(), s.getData(), s.getGroupColumns(), s.getExtras()));
                }
                lastResult = resp.getFinalResult();
                if (lastResult == null && !resp.getSteps().isEmpty()) {
                    lastResult = resp.getSteps().getLast().getData();
                }
            } else {
                // Non-SELECT: execute directly as a single step
                String stmtSql = stmt.toString();
                TableData td = executeQuery(stmtSql);
                allSteps.add(new StepResult("#" + stmtIdx + " " + stmt.getClass().getSimpleName().toUpperCase(),
                    stmtSql, td));
                lastResult = td;
            }
        }
        return new QueryStepResponse(allSteps, lastResult);
    }

    private QueryStepResponse handleSetOperations(String sql, SetOperationList setOps, String ctePrefix) {
        List<StepResult> steps = new ArrayList<>();
        List<Select> selects = setOps.getSelects();
        List<SetOperation> ops = setOps.getOperations();

        for (int i = 0; i < selects.size(); i++) {
            Select sb = selects.get(i);
            String selectSql;
            if (sb instanceof PlainSelect ps) {
                selectSql = ctePrefix + ps.toString();
            } else {
                selectSql = sb.toString();
            }
            TableData data = executeQuery(selectSql);
            steps.add(new StepResult("SELECT " + (i + 1), selectSql, data));
        }

        // The full set operation
        String setSql = ctePrefix + sql.replaceFirst("(?is)^.*?\\bSELECT\\b", "SELECT");
        // Actually, use the original SQL directly
        try {
            setSql = sql;
        } catch (Exception e) {
            setSql = sql;
        }

        TableData finalResult = executeQuery(setSql);

        // Build descriptive clause (e.g., "UNION", "INTERSECT", "EXCEPT")
        StringBuilder clause = new StringBuilder();
        for (int i = 0; i < ops.size(); i++) {
            if (i > 0) clause.append(" ");
            clause.append(ops.get(i).toString().toUpperCase());
        }

        steps.add(new StepResult(clause.toString(), setSql, finalResult));

        return new QueryStepResponse(steps, finalResult);
    }

    public TableData executeQuery(String sql) {
        log.debug("executeQuery: {}", sql);
        long start = System.currentTimeMillis();
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
            List<String> columns = new ArrayList<>();
            if (!rows.isEmpty()) {
                columns.addAll(rows.getFirst().keySet());
            }
            long duration = System.currentTimeMillis() - start;
            log.debug("executeQuery returned {} rows in {}ms: {}", rows.size(), duration, sql);
            return new TableData(columns, rows);
        } catch (Exception e) {
            String rootMsg = getRootCauseMessage(e);
            log.error("executeQuery FAILED [{}ms]: {} - root: {}", System.currentTimeMillis() - start, sql, rootMsg);
            // Detect table-not-found and give clear instructions
            if (rootMsg.toLowerCase().contains("not found")) {
                String table = extractTableName(rootMsg);
                throw new RuntimeException("Table '" + table + "' does not exist. Select a problem from the dropdown to auto-setup, or run DDL in the Dataset tab first.", e);
            }
            throw new RuntimeException("Query failed: " + rootMsg, e);
        }
    }

    private String getRootCauseMessage(Throwable t) {
        Throwable cause = t;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        String msg = cause.getMessage();
        return msg != null ? msg : t.getMessage();
    }

    private String extractTableName(String msg) {
        // H2 says: Table "WORLD" not found
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"([^\"]+)\"").matcher(msg);
        if (m.find()) return m.group(1);
        return "unknown";
    }

    public void executeDdl(String sql) {
        log.info("executeDdl: {}", sql);
        try {
            // Auto-DROP before CREATE to handle re-runs
            maybeDropBeforeCreate(sql);
            jdbcTemplate.execute(sql);
        } catch (Exception e) {
            log.error("executeDdl FAILED: {} - {}", sql, e.getMessage());
            // If table already exists, just ignore
            if (e.getMessage() != null && e.getMessage().contains("already exists")) {
                log.warn("Table already exists, ignoring error");
                return;
            }
            throw e;
        }
    }

    private void maybeDropBeforeCreate(String sql) {
        try {
            Statement stmt = CCJSqlParserUtil.parse(sql);
            if (stmt instanceof CreateTable ct) {
                String tableName = ct.getTable().getName();
                log.info("Dropping table {} before CREATE", tableName);
                jdbcTemplate.execute("DROP TABLE IF EXISTS " + tableName);
            }
        } catch (JSQLParserException e) {
            log.warn("Could not parse DDL for pre-drop: {}", sql);
        }
    }

    private String buildCtePrefix(List<WithItem<?>> withItems) {
        if (withItems == null || withItems.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("WITH ");
        for (int i = 0; i < withItems.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(withItems.get(i).toString());
        }
        return sb.toString() + " ";
    }

    private QueryStepResponse executeSimple(String sql) {
        TableData result = executeQuery(sql);
        List<StepResult> steps = new ArrayList<>();
        steps.add(new StepResult("EXECUTE", sql, result));
        return new QueryStepResponse(steps, result);
    }

    public List<Map<String, Object>> getSchema() {
        try {
            List<Map<String, Object>> tables = executeQuery(
                "SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES " +
                "WHERE TABLE_SCHEMA = 'PUBLIC' ORDER BY TABLE_NAME"
            ).getRows();

            for (var table : tables) {
                String tableName = (String) table.get("TABLE_NAME");
                TableData cols = executeQuery(
                    "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS " +
                    "WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = '" + tableName + "' " +
                    "ORDER BY ORDINAL_POSITION"
                );
                table.put("columns", cols.getRows());
            }
            return tables;
        } catch (Exception e) {
            return List.of();
        }
    }

    private TableData beforeState(String tableName) {
        try {
            return executeQuery("SELECT * FROM " + tableName);
        } catch (Exception e) {
            return new TableData(List.of(), List.of());
        }
    }

    private String fixMySqlCompatibility(String sql) {
        String result = sql;
        // MySQL: DATEDIFF(date1, date2) → H2: DATEDIFF('DAY', date1, date2)
        result = result.replaceAll("(?i)DATEDIFF\\s*\\(\\s*(?!(?:'|\"|DAY|MONTH|YEAR|HOUR|MINUTE|SECOND|WEEK|QUARTER))", "DATEDIFF('DAY', ");
        // MySQL: DATE_FORMAT(date, fmt) → not supported in H2, but leave as-is for now
        // MySQL: IFNULL → H2: COALESCE
        result = result.replaceAll("(?i)\\bIFNULL\\s*\\(", "COALESCE(");
        if (!result.equals(sql)) {
            log.info("Fixed MySQL compatibility: {} -> {}", sql, result);
        }
        return result;
    }
}
