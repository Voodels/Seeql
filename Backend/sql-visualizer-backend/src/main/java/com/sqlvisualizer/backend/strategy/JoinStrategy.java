package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.statement.select.FromItem;
import net.sf.jsqlparser.statement.select.Join;
import net.sf.jsqlparser.statement.select.LateralSubSelect;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class JoinStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        List<Join> joins = ctx.getJoins();
        if (joins == null || joins.isEmpty()) return;

        boolean hasSimpleJoins = joins.stream().anyMatch(Join::isSimple);
        boolean hasExplicitJoins = joins.stream().anyMatch(j -> !j.isSimple());

        if (!ctx.hasCTE() && ctx.getFromItem() != null) {
            ctx.addStep(new StepResult("FROM", "SELECT * FROM " + ctx.getFromItem(),
                ctx.execute("SELECT * FROM " + ctx.getFromItem())));
        }

        for (int j = 0; j < joins.size(); j++) {
            Join join = joins.get(j);
            boolean isSimple = join.isSimple();
            FromItem rightItem = join.getRightItem();
            boolean isLateral = rightItem instanceof LateralSubSelect;

            String rightTable = rightItem.toString();
            String unaliasedRight = rightTable.replaceAll("\\s+AS\\s+\\w+$", "")
                .replaceAll("\\s+\\w+$", "");

            if (isSimple) {
                ctx.getProgressiveFrom().append(", ").append(rightTable);
            } else {
                ctx.getProgressiveFrom().append(" ").append(join);
            }

            String onCondition = "";
            try {
                onCondition = join.getOnExpression() != null ? join.getOnExpression().toString() : "";
            } catch (Exception ignored) {}

            // For LATERAL, try to execute the inner subquery independently
            TableData rightData = null;
            if (isLateral) {
                LateralSubSelect lat = (LateralSubSelect) rightItem;
                if (lat.getPlainSelect() != null) {
                    try {
                        String innerSql = lat.getPlainSelect().toString();
                        rightData = ctx.execute(innerSql);
                    } catch (Exception e) {
                        rightData = new TableData(List.of("info"),
                            List.of(Map.of("info", "LATERAL subquery may reference outer columns; showing structure only")));
                    }
                }
                if (rightData == null) {
                    rightData = new TableData(List.of("info"),
                        List.of(Map.of("info", "LATERAL subquery")));
                }
            } else {
                try {
                    rightData = ctx.execute(ctx.getCtePrefix() + "SELECT * FROM " + unaliasedRight);
                } catch (Exception e) {
                    rightData = new TableData(List.of("info"),
                        List.of(Map.of("info", "Could not load right table independently")));
                }
            }

            String joinSql = ctx.getCtePrefix() + "SELECT * FROM " + ctx.getProgressiveFrom();
            TableData joinData = ctx.execute(joinSql);

            Map<String, Object> extras = new HashMap<>();
            extras.put("rightTableData", rightData);
            extras.put("onCondition", onCondition);
            extras.put("rightTable", rightTable);
            String leftTable;
            if (j == 0) {
                leftTable = ctx.getFromItem();
            } else {
                leftTable = joins.get(j - 1).getRightItem().toString();
            }
            extras.put("leftTable", leftTable);

            String joinType;
            if (isSimple) {
                joinType = "CROSS";
            } else if (isLateral) {
                joinType = "LATERAL";
            } else {
                joinType = join.isLeft() ? "LEFT" : join.isRight() ? "RIGHT"
                    : join.isFull() ? "FULL" : join.isCross() ? "CROSS" : "INNER";
            }
            extras.put("joinType", joinType);

            String clauseLabel = isLateral ? "LATERAL JOIN " + rightTable
                : isSimple ? "CROSS JOIN " + rightTable
                : "JOIN " + rightTable;
            ctx.addStep(new StepResult(clauseLabel, joinSql, joinData, null, extras));
        }
    }
}
