package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;

public class WhereStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        if (ctx.getPlainSelect().getWhere() == null) return;
        String sql = ctx.getCtePrefix() + "SELECT * FROM " + ctx.getFromClause()
            + " WHERE " + ctx.getPlainSelect().getWhere();
        ctx.addStep(new StepResult("WHERE", sql, ctx.execute(sql)));
    }
}
