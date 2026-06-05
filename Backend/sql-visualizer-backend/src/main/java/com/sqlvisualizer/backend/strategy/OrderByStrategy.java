package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.statement.select.PlainSelect;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class OrderByStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        PlainSelect ps = ctx.getPlainSelect();
        List<?> orderBy = ps.getOrderByElements();
        if (orderBy == null || orderBy.isEmpty()) return;

        // Rebuild SQL with ORDER BY but without LIMIT
        String orderSql = ctx.rebuildSelectSql(true, false);
        TableData before = ctx.getPreviousStepData();
        TableData ordered = ctx.execute(orderSql);

        Map<String, Object> extras = new HashMap<>();
        extras.put("orderBy", orderBy.toString());
        extras.put("beforeData", before);

        ctx.addStep(new StepResult("ORDER BY", orderSql, ordered, null, extras));
        ctx.setFinalResult(ordered);
    }
}
