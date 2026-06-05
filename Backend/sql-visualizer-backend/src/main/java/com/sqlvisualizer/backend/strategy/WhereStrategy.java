package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.expression.ExpressionVisitorAdapter;
import net.sf.jsqlparser.statement.select.ParenthesedSelect;
import net.sf.jsqlparser.statement.select.PlainSelect;
import net.sf.jsqlparser.statement.select.Select;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class WhereStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        PlainSelect ps = ctx.getPlainSelect();
        net.sf.jsqlparser.expression.Expression where = ps.getWhere();
        if (where == null) return;

        List<Select> subqueries = new ArrayList<>();
        where.accept(new ExpressionVisitorAdapter<Void>() {
            @Override
            public <S> Void visit(Select select, S context) {
                if (select instanceof ParenthesedSelect sub) {
                    subqueries.add(sub);
                    if (sub.getPlainSelect() != null && sub.getPlainSelect().getWhere() != null) {
                        sub.getPlainSelect().getWhere().accept(this);
                    }
                }
                return null;
            }
        }, null);

        for (int i = 0; i < subqueries.size(); i++) {
            Select sub = subqueries.get(i);
            String subSql = sub.toString();
            try {
                TableData subResult = ctx.execute(subSql);
                ctx.addStep(new StepResult("SUBQUERY " + (i + 1), subSql, subResult));
            } catch (Exception e) {
                ctx.addStep(new StepResult("SUBQUERY " + (i + 1), subSql,
                    new TableData(List.of("info"),
                        List.of(Map.of("info", "Could not execute in isolation")))));
            }
        }

        String whereSql = ctx.getCtePrefix() + "SELECT * FROM " + ctx.getFromClause()
            + " WHERE " + where;
        ctx.addStep(new StepResult("WHERE", whereSql, ctx.execute(whereSql)));
    }
}
