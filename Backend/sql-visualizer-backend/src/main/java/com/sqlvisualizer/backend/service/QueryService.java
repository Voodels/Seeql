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

            // Build CTE prefix if present
            List<WithItem<?>> withItems = select.getWithItemsList();
            boolean hasCTE = withItems != null && !withItems.isEmpty();
            String ctePrefix = buildCtePrefix(withItems);

            PlainSelect plainSelect = select.getPlainSelect();
            if (plainSelect == null) {
                return executeSimple(sql);
            }

            List<StepResult> steps = new ArrayList<>();
            String fromItem = plainSelect.getFromItem().toString();
            List<Join> joins = plainSelect.getJoins();
            boolean hasJoins = joins != null && !joins.isEmpty();

            // --- 1. CTE steps (if any) ---
            if (hasCTE && withItems != null) {
                WithItem<?> firstCTE = withItems.get(0);
                ParenthesedSelect pSelect = firstCTE.getSelect();
                if (pSelect != null) {
                    PlainSelect ctePlain = pSelect.getPlainSelect();
                    if (ctePlain != null && ctePlain.getFromItem() != null) {
                        String baseTable = ctePlain.getFromItem().toString();
                        steps.add(new StepResult("FROM", "SELECT * FROM " + baseTable, executeQuery("SELECT * FROM " + baseTable)));
                    }
                }
                for (WithItem<?> withItem : withItems) {
                    String cteName = withItem.getAliasName();
                    if (cteName == null) continue;
                    String cteSql = ctePrefix + "SELECT * FROM " + cteName;
                    steps.add(new StepResult("WITH " + cteName, cteSql, executeQuery(cteSql)));
                }
            }

            // --- 2. FROM / JOIN steps for the main query ---
            StringBuilder progressiveFrom = new StringBuilder(fromItem);

            if (hasJoins) {
                // Show left table (skip if already shown as CTE base)
                if (!hasCTE) {
                    steps.add(new StepResult("FROM", "SELECT * FROM " + fromItem, executeQuery("SELECT * FROM " + fromItem)));
                }
                // Show each JOIN progressively: JOIN1, JOIN1+JOIN2, ...
                for (int j = 0; j < joins.size(); j++) {
                    Join join = joins.get(j);
                    progressiveFrom.append(" ").append(join);

                    String rightTable = join.getRightItem().toString();
                    String onCondition = join.getOnExpression() != null ? join.getOnExpression().toString() : "";
                    TableData rightData = executeQuery(ctePrefix + "SELECT * FROM " + rightTable);
                    String joinSql = ctePrefix + "SELECT * FROM " + progressiveFrom;
                    TableData joinData = executeQuery(joinSql);
                    Map<String, Object> extras = new HashMap<>();
                    extras.put("rightTableData", rightData);
                    extras.put("onCondition", onCondition);
                    extras.put("rightTable", rightTable);
                    extras.put("leftTable", j == 0 ? fromItem : joins.get(j - 1).getRightItem().toString());
                    String joinType = join.isLeft() ? "LEFT" : join.isRight() ? "RIGHT" : join.isFull() ? "FULL" : join.isCross() ? "CROSS" : "INNER";
                    extras.put("joinType", joinType);
                    steps.add(new StepResult("JOIN " + rightTable, joinSql, joinData, null, extras));
                }
            } else if (!hasCTE) {
                steps.add(new StepResult("FROM", "SELECT * FROM " + fromItem, executeQuery("SELECT * FROM " + fromItem)));
            }

            // --- 3. Build intermediate-query helpers ---
            String sqlPrefix = ctePrefix;
            String fromClause = progressiveFrom.toString();

            // WHERE
            if (plainSelect.getWhere() != null) {
                String whereSql = sqlPrefix + "SELECT * FROM " + fromClause + " WHERE " + plainSelect.getWhere();
                steps.add(new StepResult("WHERE", whereSql, executeQuery(whereSql)));
            }

            // GROUP BY
            if (plainSelect.getGroupBy() != null) {
                String groupSql = sqlPrefix + buildGroupBySql(plainSelect, fromClause);
                List<String> groupCols = new ArrayList<>();
                ExpressionList groupExprList = plainSelect.getGroupBy().getGroupByExpressionList();
                if (groupExprList != null) {
                    for (Object expr : groupExprList.getExpressions()) {
                        groupCols.add(expr.toString().toUpperCase());
                    }
                }
                steps.add(new StepResult("GROUP BY", groupSql, executeQuery(groupSql), groupCols));
            }

            // HAVING
            if (plainSelect.getHaving() != null) {
                String havingSql = sqlPrefix + buildHavingSql(plainSelect, fromClause);
                steps.add(new StepResult("HAVING", havingSql, executeQuery(havingSql)));
            }

            // Final SELECT (with optional DISTINCT decomposition)
            TableData finalResult;
            if (plainSelect.getDistinct() != null) {
                String sqlSelect = sql.replaceFirst("(?i)\\bSELECT\\s+DISTINCT\\b", "SELECT");
                steps.add(new StepResult("SELECT", sqlSelect, executeQuery(sqlSelect)));
                finalResult = executeQuery(sql);
                steps.add(new StepResult("DISTINCT", sql, finalResult));
            } else {
                finalResult = executeQuery(sql);
                steps.add(new StepResult("SELECT", sql, finalResult));
            }

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

    private String buildCtePrefix(List<WithItem<?>> withItems) {
        if (withItems == null || withItems.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("WITH ");
        for (int i = 0; i < withItems.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(withItems.get(i).toString());
        }
        return sb.toString() + " ";
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
