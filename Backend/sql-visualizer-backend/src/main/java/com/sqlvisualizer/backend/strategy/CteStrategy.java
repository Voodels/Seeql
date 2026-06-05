package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.expression.AnalyticExpression;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.statement.select.*;

import java.util.*;

public class CteStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        if (!ctx.hasCTE() || ctx.getWithItems() == null) return;

        for (WithItem<?> withItem : ctx.getWithItems()) {
            String cteName = withItem.getAliasName();
            if (cteName == null) continue;

            if (withItem.isRecursive()) {
                decomposeRecursiveCTE(ctx, withItem, cteName);
                continue;
            }

            decomposeNonRecursiveCTE(ctx, withItem, cteName);
        }
    }

    private void decomposeNonRecursiveCTE(StepContext ctx, WithItem<?> withItem, String cteName) {
        ParenthesedSelect pSelect = withItem.getSelect();
        if (pSelect == null) return;

        Select body = pSelect.getSelect();
        if (body instanceof PlainSelect ps) {
            decomposeCTEBody(ctx, ps, cteName);
        }

        // Final CTE result
        String cteSql = ctx.getCtePrefix() + "SELECT * FROM " + cteName;
        ctx.addStep(new StepResult("WITH " + cteName, cteSql, ctx.execute(cteSql)));
    }

    private void decomposeCTEBody(StepContext ctx, PlainSelect ps, String cteName) {
        boolean hasFrom = ps.getFromItem() != null;
        boolean hasJoins = ps.getJoins() != null && !ps.getJoins().isEmpty();
        boolean hasWhere = ps.getWhere() != null;
        boolean hasWindowFn = detectWindowFunctions(ps);

        if (!hasFrom) return;

        // Save originals
        List<SelectItem<?>> originalItems = ps.getSelectItems();
        List<Join> originalJoins = ps.getJoins();
        Expression originalWhere = ps.getWhere();

        // Step 1: FROM — SELECT * FROM fromItem (no joins, no WHERE)
        String fromSql = "SELECT * FROM " + ps.getFromItem();
        String fromLabel = "CTE." + ps.getFromItem().toString();
        ctx.addStep(new StepResult(fromLabel, fromSql, safeExecute(ctx, fixMySqlDateFunctions(fromSql))));

        // Step 2: JOINs — add progressively
        if (hasJoins) {
            for (int i = 0; i < originalJoins.size(); i++) {
                Join join = originalJoins.get(i);
                String joinSql = rebuildCteStep(ps, "SELECT *", originalJoins.subList(0, i + 1), null);
                String joinLabel = "CTE." + join.getRightItem().toString();
                ctx.addStep(new StepResult(joinLabel, joinSql, safeExecute(ctx, fixMySqlDateFunctions(joinSql))));
            }
            ps.setJoins(originalJoins);
        }

        // Step 3: WHERE — filter
        if (hasWhere) {
            String whereSql = rebuildCteStep(ps, "SELECT *", originalJoins, originalWhere);
            ctx.addStep(new StepResult("CTE.WHERE", whereSql, safeExecute(ctx, fixMySqlDateFunctions(whereSql))));
        }

        // Step 4: SELECT without window functions (body preview)
        if (hasWindowFn) {
            String bodySql = rebuildCteStep(ps, "SELECT " + selectItemsWithoutWindow(originalItems), originalJoins, originalWhere);
            ctx.addStep(new StepResult("CTE.BODY", bodySql, safeExecute(ctx, fixMySqlDateFunctions(bodySql))));
        }

        // Step 5: Window Functions step (if any)
        if (hasWindowFn) {
            String windowSql = rebuildCteStep(ps, null, originalJoins, originalWhere);
            String windowLabel = "CTE.WINDOW " + windowFnName(ps);
            ctx.addStep(new StepResult(windowLabel, windowSql, safeExecute(ctx, fixMySqlDateFunctions(windowSql))));
        }

        // Restore originals
        ps.setSelectItems(originalItems);
        ps.setJoins(originalJoins);
        ps.setWhere(originalWhere);
    }

    private String rebuildCteStep(PlainSelect ps, String selectOverride, List<Join> joinsOverride, Expression whereOverride) {
        StringBuilder sb = new StringBuilder();
        if (selectOverride != null) {
            sb.append(selectOverride);
        } else {
            sb.append(ps.getSelectItems().toString().replaceAll("^\\[|\\]$", ""));
            sb.insert(0, "SELECT ");
        }
        if (ps.getFromItem() != null) sb.append(" FROM ").append(ps.getFromItem());
        if (joinsOverride != null && !joinsOverride.isEmpty()) {
            for (Join j : joinsOverride) sb.append(" ").append(j);
        } else if (ps.getJoins() != null && joinsOverride == null) {
            for (Join j : ps.getJoins()) sb.append(" ").append(j);
        }
        if (whereOverride != null) sb.append(" WHERE ").append(whereOverride);
        else if (ps.getWhere() != null && whereOverride == null) sb.append(" WHERE ").append(ps.getWhere());
        return sb.toString();
    }

    private String selectItemsWithoutWindow(List<SelectItem<?>> items) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) sb.append(", ");
            Expression e = items.get(i).getExpression();
            if (e instanceof AnalyticExpression) {
                // Use expression inside window fn as plain column
                Expression inner = ((AnalyticExpression) e).getExpression();
                sb.append(inner != null ? inner.toString() : "1");
            } else {
                sb.append(e);
            }
        }
        return sb.toString();
    }

    private boolean detectWindowFunctions(PlainSelect ps) {
        if (ps.getSelectItems() == null) return false;
        return ps.getSelectItems().stream()
            .anyMatch(item -> item.getExpression() instanceof AnalyticExpression);
    }

    private String windowFnName(PlainSelect ps) {
        for (SelectItem<?> item : ps.getSelectItems()) {
            if (item.getExpression() instanceof AnalyticExpression analytic) {
                return analytic.getName();
            }
        }
        return "WINDOW";
    }

    private String fixMySqlDateFunctions(String sql) {
        return sql.replaceAll("(?i)DATEDIFF\\s*\\(\\s*(?!(?:'|\"|DAY|MONTH|YEAR|HOUR|MINUTE|SECOND|WEEK|QUARTER))", "DATEDIFF('DAY', ");
    }

    private TableData safeExecute(StepContext ctx, String sql) {
        try {
            return ctx.execute(sql);
        } catch (Exception e) {
            return new TableData(List.of("info"),
                List.of(Map.of("info", "Step failed: " + e.getMessage())));
        }
    }

    private void decomposeRecursiveCTE(StepContext ctx, WithItem<?> withItem, String cteName) {
        ParenthesedSelect pSelect = withItem.getSelect();
        if (pSelect == null) return;

        Select body = pSelect.getSelectBody();
        if (!(body instanceof SetOperationList setOps)) {
            String cteSql = ctx.getCtePrefix() + "SELECT * FROM " + cteName;
            ctx.addStep(new StepResult("WITH " + cteName + " (recursive)", cteSql, ctx.execute(cteSql)));
            return;
        }

        List<Select> selects = setOps.getSelects();
        List<SetOperation> ops = setOps.getOperations();

        Select anchorSelect = selects.getFirst();
        String anchorSql = anchorSelect.toString();

        String queryAnchor = "WITH RECURSIVE " + cteName + " AS (" + anchorSql + ") SELECT * FROM " + cteName;
        try {
            ctx.addStep(new StepResult("CTE ANCHOR", queryAnchor, ctx.execute(queryAnchor)));
        } catch (Exception e) {
            ctx.addStep(new StepResult("CTE ANCHOR", anchorSql,
                new TableData(List.of("info"),
                    List.of(Map.of("info", "Anchor execution failed: " + e.getMessage())))));
        }

        int iter = 0;
        int prevCount = -1;
        while (iter < 100) {
            iter++;
            String iterCte = "WITH RECURSIVE " + cteName + " AS (" + pSelect.getSelectBody().toString() + ") "
                + "SELECT * FROM " + cteName;
            try {
                TableData iterData = ctx.execute(iterCte);
                int curCount = iterData.getTotalRows();
                if (iterData.getRows().isEmpty()) {
                    ctx.addStep(new StepResult("CTE ITER " + iter, iterCte,
                        new TableData(List.of("info"),
                            List.of(Map.of("info", "No new rows (iteration complete)")))));
                    break;
                }
                if (curCount == prevCount) {
                    ctx.addStep(new StepResult("CTE ITER " + iter, iterCte, iterData));
                    break;
                }
                ctx.addStep(new StepResult("CTE ITER " + iter, iterCte, iterData));
                prevCount = curCount;
            } catch (Exception e) {
                ctx.addStep(new StepResult("CTE ITER " + iter, iterCte,
                    new TableData(List.of("info"),
                        List.of(Map.of("info", "Iteration failed: " + e.getMessage())))));
                break;
            }
        }

        String finalCte = ctx.getCtePrefix() + "SELECT * FROM " + cteName;
        ctx.addStep(new StepResult("WITH " + cteName, finalCte, ctx.execute(finalCte)));
    }
}
