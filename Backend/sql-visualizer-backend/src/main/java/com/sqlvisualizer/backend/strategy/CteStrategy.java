package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import net.sf.jsqlparser.statement.select.*;

public class CteStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        if (!ctx.hasCTE() || ctx.getWithItems() == null) return;

        WithItem<?> firstCTE = ctx.getWithItems().get(0);
        ParenthesedSelect pSelect = firstCTE.getSelect();
        if (pSelect != null) {
            PlainSelect ctePlain = pSelect.getPlainSelect();
            if (ctePlain != null && ctePlain.getFromItem() != null) {
                String baseTable = ctePlain.getFromItem().toString();
                ctx.addStep(new StepResult("FROM", "SELECT * FROM " + baseTable,
                    ctx.execute("SELECT * FROM " + baseTable)));
            }
        }
        for (WithItem<?> withItem : ctx.getWithItems()) {
            String cteName = withItem.getAliasName();
            if (cteName == null) continue;
            String cteSql = ctx.getCtePrefix() + "SELECT * FROM " + cteName;
            ctx.addStep(new StepResult("WITH " + cteName, cteSql, ctx.execute(cteSql)));
        }
    }
}
