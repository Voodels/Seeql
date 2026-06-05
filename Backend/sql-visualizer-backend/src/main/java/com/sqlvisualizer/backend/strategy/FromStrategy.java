package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;

public class FromStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        if (ctx.hasCTE() || ctx.hasJoins()) return;
        ctx.addStep(new StepResult("FROM", "SELECT * FROM " + ctx.getFromItem(),
            ctx.execute("SELECT * FROM " + ctx.getFromItem())));
    }
}
