package com.sqlvisualizer.backend.service;

import com.sqlvisualizer.backend.model.QueryStepResponse;
import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import com.sqlvisualizer.backend.strategy.*;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.delete.Delete;
import net.sf.jsqlparser.statement.select.*;
import net.sf.jsqlparser.statement.update.Update;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class QueryService {

    private final JdbcTemplate jdbcTemplate;

    public QueryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public QueryStepResponse executeStepwise(String sql) {
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
            if (!(statement instanceof Select select)) {
                throw new IllegalArgumentException("Only SELECT/UPDATE/DELETE queries are supported");
            }

            String ctePrefix = buildCtePrefix(select.getWithItemsList());
            Select selectBody = select.getSelectBody();

            if (selectBody instanceof SetOperationList setOps) {
                return handleSetOperations(sql, setOps, ctePrefix);
            }

            if (!(selectBody instanceof PlainSelect plainSelect)) {
                return executeSimple(sql);
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

            return new QueryStepResponse(ctx.getSteps(), ctx.getFinalResult());

        } catch (JSQLParserException e) {
            return executeSimple(sql);
        }
    }

    private QueryStepResponse handleUpdate(Update update) {
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

    private QueryStepResponse handleCompoundStatements(List<Statement> statements) {
        List<StepResult> allSteps = new ArrayList<>();
        TableData lastResult = null;
        int stmtIdx = 0;
        for (Statement stmt : statements) {
            stmtIdx++;
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
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        List<String> columns = new ArrayList<>();
        if (!rows.isEmpty()) {
            columns.addAll(rows.getFirst().keySet());
        }
        return new TableData(columns, rows);
    }

    public void executeDdl(String sql) {
        jdbcTemplate.execute(sql);
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
}
