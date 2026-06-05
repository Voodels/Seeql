package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import net.sf.jsqlparser.expression.operators.relational.ExpressionList;
import net.sf.jsqlparser.statement.select.PlainSelect;
import net.sf.jsqlparser.statement.select.SelectItem;

import java.util.ArrayList;
import java.util.List;

public class GroupByStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        PlainSelect ps = ctx.getPlainSelect();
        if (ps.getGroupBy() == null) return;

        String sql = ctx.getCtePrefix() + buildGroupBySql(ps, ctx.getFromClause());

        List<String> groupCols = new ArrayList<>();
        ExpressionList groupExprList = ps.getGroupBy().getGroupByExpressionList();
        if (groupExprList != null) {
            for (Object expr : groupExprList.getExpressions()) {
                groupCols.add(expr.toString().toUpperCase());
            }
        }
        ctx.addStep(new StepResult("GROUP BY", sql, ctx.execute(sql), groupCols));
    }

    private String buildGroupBySql(PlainSelect ps, String fromClause) {
        StringBuilder sb = new StringBuilder("SELECT ");
        List<SelectItem<?>> selectItems = ps.getSelectItems();
        boolean hasExplicitItems = selectItems != null && !selectItems.isEmpty()
                && !selectItems.getFirst().toString().equals("*");

        if (hasExplicitItems) {
            sb.append(String.join(", ", selectItems.stream().map(Object::toString).toList()));
        } else {
            sb.append(ps.getGroupBy().getGroupByExpressionList()).append(", COUNT(*)");
        }

        sb.append(" FROM ").append(fromClause);
        if (ps.getWhere() != null) sb.append(" WHERE ").append(ps.getWhere());
        sb.append(" GROUP BY ").append(ps.getGroupBy().getGroupByExpressionList());
        return sb.toString();
    }
}
