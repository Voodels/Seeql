package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.statement.select.Join;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class JoinStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        List<Join> joins = ctx.getJoins();
        if (joins == null || joins.isEmpty()) return;

        if (!ctx.hasCTE()) {
            ctx.addStep(new StepResult("FROM", "SELECT * FROM " + ctx.getFromItem(),
                ctx.execute("SELECT * FROM " + ctx.getFromItem())));
        }

        for (int j = 0; j < joins.size(); j++) {
            Join join = joins.get(j);
            ctx.getProgressiveFrom().append(" ").append(join);

            String rightTable = join.getRightItem().toString();
            String onCondition = join.getOnExpression() != null ? join.getOnExpression().toString() : "";
            TableData rightData = ctx.execute(ctx.getCtePrefix() + "SELECT * FROM " + rightTable);
            String joinSql = ctx.getCtePrefix() + "SELECT * FROM " + ctx.getProgressiveFrom();
            TableData joinData = ctx.execute(joinSql);

            Map<String, Object> extras = new HashMap<>();
            extras.put("rightTableData", rightData);
            extras.put("onCondition", onCondition);
            extras.put("rightTable", rightTable);
            extras.put("leftTable", j == 0 ? ctx.getFromItem() : joins.get(j - 1).getRightItem().toString());
            String joinType = join.isLeft() ? "LEFT" : join.isRight() ? "RIGHT"
                : join.isFull() ? "FULL" : join.isCross() ? "CROSS" : "INNER";
            extras.put("joinType", joinType);

            ctx.addStep(new StepResult("JOIN " + rightTable, joinSql, joinData, null, extras));
        }
    }
}
