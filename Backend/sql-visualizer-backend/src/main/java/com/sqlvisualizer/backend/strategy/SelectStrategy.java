package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.expression.AnalyticExpression;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.statement.select.OrderByElement;
import net.sf.jsqlparser.expression.WindowDefinition;
import net.sf.jsqlparser.expression.WindowElement;
import net.sf.jsqlparser.expression.WindowRange;
import net.sf.jsqlparser.statement.select.PlainSelect;
import net.sf.jsqlparser.statement.select.SelectItem;

import java.util.*;

public class SelectStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        PlainSelect ps = ctx.getPlainSelect();
        boolean hasDistinct = ps.getDistinct() != null;

        String selectSql = ctx.rebuildSelectSql(false, false);

        Map<String, Object> extras = detectWindowFunctions(ps);

        if (hasDistinct) {
            String sqlNoDistinct = selectSql.replaceFirst("(?i)\\bSELECT\\s+DISTINCT\\b", "SELECT");
            ctx.addStep(new StepResult("SELECT", sqlNoDistinct, ctx.execute(sqlNoDistinct), null, extras));
            ctx.addStep(new StepResult("DISTINCT", selectSql, ctx.execute(selectSql)));
        } else {
            ctx.addStep(new StepResult("SELECT", selectSql, ctx.execute(selectSql), null, extras));
        }
    }

    private Map<String, Object> detectWindowFunctions(PlainSelect ps) {
        Map<String, Object> extras = new HashMap<>();
        List<Map<String, Object>> windowFns = new ArrayList<>();
        if (ps.getSelectItems() != null) {
            for (SelectItem<?> item : ps.getSelectItems()) {
                Expression expr = item.getExpression();
                if (expr instanceof AnalyticExpression analytic) {
                    Map<String, Object> info = new HashMap<>();
                    info.put("name", analytic.getName());
                    info.put("alias", item.getAlias() != null ? item.getAlias() : null);
                    info.put("expression", analytic.getExpression() != null ? analytic.getExpression().toString() : null);

                    // Partition by
                    if (analytic.getPartitionExpressionList() != null) {
                        List<String> partitions = new ArrayList<>();
                        for (Expression e : analytic.getPartitionExpressionList().getExpressions()) {
                            partitions.add(e.toString());
                        }
                        info.put("partitionBy", partitions);
                        info.put("partitionByRaw", analytic.getPartitionExpressionList().toString());
                    } else {
                        info.put("partitionBy", List.of());
                    }

                    // Order by
                    if (analytic.getOrderByElements() != null) {
                        List<Map<String, Object>> orderItems = new ArrayList<>();
                        for (OrderByElement obe : analytic.getOrderByElements()) {
                            Map<String, Object> obInfo = new HashMap<>();
                            obInfo.put("expression", obe.getExpression().toString());
                            obInfo.put("direction", obe.isAsc() ? "ASC" : "DESC");
                            if (obe.getNullOrdering() != null) {
                                obInfo.put("nulls", obe.getNullOrdering().toString());
                            }
                            orderItems.add(obInfo);
                        }
                        info.put("orderBy", orderItems);
                        info.put("orderByRaw", analytic.getOrderByElements().toString());
                    } else {
                        info.put("orderBy", List.of());
                    }

                    // Window frame (ROWS/RANGE BETWEEN)
                    WindowDefinition wd = analytic.getWindowDefinition();
                    if (wd != null) {
                        Map<String, Object> wdInfo = new HashMap<>();
                        wdInfo.put("name", wd.getWindowName());
                        info.put("windowDefinition", wd.toString());
                        extras.put("windowDefinition", wd.toString());
                    }

                    WindowElement we = analytic.getWindowElement();
                    if (we != null) {
                        Map<String, Object> frameInfo = new HashMap<>();
                        frameInfo.put("type", we.getType() != null ? we.getType().toString() : null);
                        frameInfo.put("offset", we.getOffset() != null ? we.getOffset().toString() : null);
                        if (we.getRange() != null) {
                            WindowRange range = we.getRange();
                            frameInfo.put("range", range.toString());
                            if (range.getStart() != null) {
                                Map<String, Object> start = new HashMap<>();
                                start.put("type", range.getStart().getType() != null ? range.getStart().getType().toString() : null);
                                start.put("offset", range.getStart().getExpression() != null ? range.getStart().getExpression().toString() : null);
                                frameInfo.put("start", start);
                            }
                            if (range.getEnd() != null) {
                                Map<String, Object> end = new HashMap<>();
                                end.put("type", range.getEnd().getType() != null ? range.getEnd().getType().toString() : null);
                                end.put("offset", range.getEnd().getExpression() != null ? range.getEnd().getExpression().toString() : null);
                                frameInfo.put("end", end);
                            }
                        }
                        info.put("windowFrame", frameInfo);
                    }

                    info.put("overall", analytic.toString());
                    windowFns.add(info);
                }
            }
        }
        if (!windowFns.isEmpty()) {
            extras.put("windowFunctions", windowFns);
        }
        return extras;
    }
}
