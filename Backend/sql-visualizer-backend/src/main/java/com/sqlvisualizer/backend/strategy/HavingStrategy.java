package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import net.sf.jsqlparser.statement.select.PlainSelect;
import net.sf.jsqlparser.statement.select.SelectItem;

import java.util.List;

public class HavingStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        PlainSelect ps = ctx.getPlainSelect();
        if (ps.getHaving() == null) return;

        StringBuilder sb = new StringBuilder("SELECT ");
        List<SelectItem<?>> selectItems = ps.getSelectItems();
        if (selectItems != null && !selectItems.isEmpty()
                && !selectItems.getFirst().toString().equals("*")) {
            sb.append(String.join(", ", selectItems.stream().map(Object::toString).toList()));
        } else {
            sb.append("*");
        }

        sb.append(" FROM ").append(ctx.getFromClause());
        if (ps.getWhere() != null) sb.append(" WHERE ").append(ps.getWhere());
        sb.append(" GROUP BY ").append(ps.getGroupBy().getGroupByExpressionList());
        sb.append(" HAVING ").append(ps.getHaving());

        ctx.addStep(new StepResult("HAVING", sb.toString(), ctx.execute(sb.toString())));
    }
}
