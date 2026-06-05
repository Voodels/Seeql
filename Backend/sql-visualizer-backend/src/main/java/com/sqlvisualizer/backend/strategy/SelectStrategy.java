package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.expression.AnalyticExpression;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.WindowDefinition;
import net.sf.jsqlparser.expression.WindowElement;
import net.sf.jsqlparser.statement.select.PlainSelect;
import net.sf.jsqlparser.statement.select.SelectItem;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SelectStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        PlainSelect ps = ctx.getPlainSelect();
        boolean hasDistinct = ps.getDistinct() != null;

        String selectSql = ctx.rebuildSelectSql(false, false);

        // Detect window functions in SELECT items
        Map<String, Object> extras = detectWindowFunctions(ps);

        if (hasDistinct) {
            String sqlNoDistinct = ps.getDistinct() != null
                ? selectSql.replaceFirst("(?i)\\bSELECT\\s+DISTINCT\\b", "SELECT")
                : selectSql;
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
                    info.put("expression", analytic.getExpression() != null ? analytic.getExpression().toString() : null);
                    info.put("partitionBy", analytic.getPartitionExpressionList() != null
                        ? analytic.getPartitionExpressionList().toString() : null);
                    info.put("orderBy", analytic.getOrderByElements() != null
                        ? analytic.getOrderByElements().toString() : null);

                    WindowDefinition wd = analytic.getWindowDefinition();
                    if (wd != null) {
                        Map<String, Object> frameInfo = new HashMap<>();
                        frameInfo.put("name", wd.getWindowName());
                        frameInfo.put("ref", wd.getWindowName() != null ? wd.getWindowName() : null);
                        extras.put("windowDefinition", wd.toString());
                    }

                    WindowElement we = analytic.getWindowElement();
                    if (we != null) {
                        Map<String, Object> frameInfo = new HashMap<>();
                        frameInfo.put("type", we.getType() != null ? we.getType().toString() : null);
                        frameInfo.put("offset", we.getOffset() != null ? we.getOffset().toString() : null);
                        frameInfo.put("range", we.getRange() != null ? we.getRange().toString() : null);
                        info.put("windowFrame", frameInfo);
                    }

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
