package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;

public class SelectStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        String sql = ctx.getOriginalSql();
        TableData finalResult;

        if (ctx.getPlainSelect().getDistinct() != null) {
            String sqlSelect = sql.replaceFirst("(?i)\\bSELECT\\s+DISTINCT\\b", "SELECT");
            ctx.addStep(new StepResult("SELECT", sqlSelect, ctx.execute(sqlSelect)));
            finalResult = ctx.execute(sql);
            ctx.addStep(new StepResult("DISTINCT", sql, finalResult));
        } else {
            finalResult = ctx.execute(sql);
            ctx.addStep(new StepResult("SELECT", sql, finalResult));
        }

        ctx.setFinalResult(finalResult);
    }
}
