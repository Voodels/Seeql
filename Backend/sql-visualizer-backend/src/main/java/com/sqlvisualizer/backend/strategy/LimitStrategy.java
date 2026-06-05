package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.statement.select.PlainSelect;

import java.util.HashMap;
import java.util.Map;

public class LimitStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        PlainSelect ps = ctx.getPlainSelect();
        boolean hasLimit = ps.getLimit() != null;
        boolean hasOffset = ps.getOffset() != null;
        if (!hasLimit && !hasOffset) return;

        String limitSql = ctx.rebuildSelectSql(true, true);
        TableData before = ctx.getPreviousStepData();
        TableData limited = ctx.execute(limitSql);

        Map<String, Object> extras = new HashMap<>();
        extras.put("limit", hasLimit ? ps.getLimit().toString() : null);
        extras.put("offset", hasOffset ? ps.getOffset().toString() : null);
        extras.put("beforeData", before);

        String clause = hasLimit ? "LIMIT" : "OFFSET";

        ctx.addStep(new StepResult(clause, limitSql, limited, null, extras));
        ctx.setFinalResult(limited);
    }
}
