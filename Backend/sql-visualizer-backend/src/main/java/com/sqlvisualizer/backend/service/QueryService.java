package com.sqlvisualizer.backend.service;

import com.sqlvisualizer.backend.model.QueryStepResponse;
import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.expression.operators.relational.ExpressionList;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.select.*;
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
            Statement statement = CCJSqlParserUtil.parse(sql);
            if (!(statement instanceof Select select)) {
                throw new IllegalArgumentException("Only SELECT queries are supported");
            }

            PlainSelect plainSelect = select.getPlainSelect();
            if (plainSelect == null) {
                return executeSimple(sql);
            }

            List<StepResult> steps = new ArrayList<>();
            String fromItem = plainSelect.getFromItem().toString();

            // Step 1: FROM (raw data)
            String fromSql = "SELECT * FROM " + fromItem;
            steps.add(new StepResult("FROM", fromSql, executeQuery(fromSql)));

            // Step 2: WHERE
            if (plainSelect.getWhere() != null) {
                String whereSql = "SELECT * FROM " + fromItem + " WHERE " + plainSelect.getWhere();
                steps.add(new StepResult("WHERE", whereSql, executeQuery(whereSql)));
            }

            // Step 3: GROUP BY
            if (plainSelect.getGroupBy() != null) {
                String groupSql = buildGroupBySql(plainSelect, fromItem);
                List<String> groupCols = new ArrayList<>();
                ExpressionList groupExprList = plainSelect.getGroupBy().getGroupByExpressionList();
                if (groupExprList != null) {
                    for (Object expr : groupExprList.getExpressions()) {
                        groupCols.add(expr.toString().toUpperCase());
                    }
                }
                steps.add(new StepResult("GROUP BY", groupSql, executeQuery(groupSql), groupCols));
            }

            // Step 4: HAVING
            if (plainSelect.getHaving() != null) {
                String havingSql = buildHavingSql(plainSelect, fromItem);
                steps.add(new StepResult("HAVING", havingSql, executeQuery(havingSql)));
            }

            // Step 5: final SELECT
            TableData finalResult = executeQuery(sql);
            steps.add(new StepResult("SELECT", sql, finalResult));

            return new QueryStepResponse(steps, finalResult);

        } catch (JSQLParserException e) {
            return executeSimple(sql);
        }
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

    private String buildGroupBySql(PlainSelect plainSelect, String fromItem) {
        StringBuilder sb = new StringBuilder("SELECT ");
        List<SelectItem<?>> selectItems = plainSelect.getSelectItems();
        boolean hasExplicitItems = selectItems != null && !selectItems.isEmpty()
                && !selectItems.getFirst().toString().equals("*");

        if (hasExplicitItems) {
            sb.append(String.join(", ", selectItems.stream().map(Object::toString).toList()));
        } else {
            sb.append(plainSelect.getGroupBy().getGroupByExpressionList())
               .append(", COUNT(*)");
        }

        sb.append(" FROM ").append(fromItem);

        if (plainSelect.getWhere() != null) {
            sb.append(" WHERE ").append(plainSelect.getWhere());
        }

        sb.append(" GROUP BY ");
        sb.append(plainSelect.getGroupBy().getGroupByExpressionList().toString());
        return sb.toString();
    }

    private String buildHavingSql(PlainSelect plainSelect, String fromItem) {
        StringBuilder sb = new StringBuilder("SELECT ");
        List<SelectItem<?>> selectItems = plainSelect.getSelectItems();
        if (selectItems != null && !selectItems.isEmpty()
                && !selectItems.getFirst().toString().equals("*")) {
            sb.append(String.join(", ", selectItems.stream().map(Object::toString).toList()));
        } else {
            sb.append("*");
        }

        sb.append(" FROM ").append(fromItem);

        if (plainSelect.getWhere() != null) {
            sb.append(" WHERE ").append(plainSelect.getWhere());
        }

        sb.append(" GROUP BY ");
        sb.append(plainSelect.getGroupBy().getGroupByExpressionList().toString());
        sb.append(" HAVING ").append(plainSelect.getHaving());
        return sb.toString();
    }

    private QueryStepResponse executeSimple(String sql) {
        TableData result = executeQuery(sql);
        List<StepResult> steps = new ArrayList<>();
        steps.add(new StepResult("EXECUTE", sql, result));
        return new QueryStepResponse(steps, result);
    }
}
