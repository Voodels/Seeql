package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.statement.select.*;

import java.util.ArrayList;
import java.util.List;

public class CteStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        if (!ctx.hasCTE() || ctx.getWithItems() == null) return;

        for (WithItem<?> withItem : ctx.getWithItems()) {
            String cteName = withItem.getAliasName();
            if (cteName == null) continue;

            // Handle recursive CTE decomposition
            if (withItem.isRecursive()) {
                decomposeRecursiveCTE(ctx, withItem, cteName);
                continue;
            }

            // Non-recursive CTE
            String cteSql = ctx.getCtePrefix() + "SELECT * FROM " + cteName;
            ctx.addStep(new StepResult("WITH " + cteName, cteSql, ctx.execute(cteSql)));
        }
    }

    private void decomposeRecursiveCTE(StepContext ctx, WithItem<?> withItem, String cteName) {
        ParenthesedSelect pSelect = withItem.getSelect();
        if (pSelect == null) return;

        Select body = pSelect.getSelectBody();
        if (!(body instanceof SetOperationList setOps)) {
            // Single SELECT recursive CTE — show as regular WITH
            String cteSql = ctx.getCtePrefix() + "SELECT * FROM " + cteName;
            ctx.addStep(new StepResult("WITH " + cteName + " (recursive)", cteSql, ctx.execute(cteSql)));
            return;
        }

        List<Select> selects = setOps.getSelects();
        List<SetOperation> ops = setOps.getOperations();

        // Extract anchor (non-recursive) SELECT — usually the first one before UNION ALL
        Select anchorSelect = selects.getFirst();
        String anchorSql = anchorSelect.toString();

        // Execute anchor and show as initial CTE step
        String anchorWith = withItem.toString().replaceFirst("(?i)\\bUNION\\s+ALL\\b.*$", "");
        try {
            // Execute anchor directly
            String queryAnchor = "WITH RECURSIVE " + cteName + " AS (" + anchorSql + ") SELECT * FROM " + cteName;
            ctx.addStep(new StepResult("CTE ANCHOR", queryAnchor, ctx.execute(queryAnchor)));
        } catch (Exception e) {
            TableData err = new TableData(List.of("info"),
                List.of(java.util.Map.of("info", "Anchor execution failed: " + e.getMessage())));
            ctx.addStep(new StepResult("CTE ANCHOR", anchorSql, err));
        }

        // Iterate recursive part until no new rows
        int iter = 0;
        int prevCount = -1;
        TableData lastData = null;
        while (iter < 100) { // safety limit
            iter++;
            String iterCte = "WITH RECURSIVE " + cteName + " AS (" + pSelect.getSelectBody().toString() + ") "
                + "SELECT * FROM " + cteName;
            try {
                TableData iterData = ctx.execute(iterCte);
                int curCount = iterData.getTotalRows();
                if (iterData.getRows().isEmpty()) {
                    ctx.addStep(new StepResult("CTE ITER " + iter, iterCte,
                        new TableData(List.of("info"),
                            List.of(java.util.Map.of("info", "No new rows (iteration complete)")))));
                    break;
                }
                if (curCount == prevCount) {
                    // No new rows added — converged
                    ctx.addStep(new StepResult("CTE ITER " + iter, iterCte, iterData));
                    break;
                }
                ctx.addStep(new StepResult("CTE ITER " + iter, iterCte, iterData));
                prevCount = curCount;
                lastData = iterData;
            } catch (Exception e) {
                ctx.addStep(new StepResult("CTE ITER " + iter, iterCte,
                    new TableData(List.of("info"),
                        List.of(java.util.Map.of("info", "Iteration failed: " + e.getMessage())))));
                break;
            }
        }

        // Final CTE step
        String finalCte = ctx.getCtePrefix() + "SELECT * FROM " + cteName;
        ctx.addStep(new StepResult("WITH " + cteName, finalCte, ctx.execute(finalCte)));
    }
}
