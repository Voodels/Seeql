package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.statement.select.PlainSelect;

import java.util.List;

public class SelectStrategy implements StepStrategy {
    @Override
    public void decompose(StepContext ctx) {
        PlainSelect ps = ctx.getPlainSelect();
        boolean hasDistinct = ps.getDistinct() != null;
        List<?> orderBy = ps.getOrderByElements();
        boolean hasOrderBy = orderBy != null && !orderBy.isEmpty();

        // Build SELECT SQL without ORDER BY and without DISTINCT (if applicable)
        String selectSql = ctx.rebuildSelectSql(false, false);

        if (hasDistinct) {
            String sqlNoDistinct = ps.getDistinct() != null
                ? selectSql.replaceFirst("(?i)\\bSELECT\\s+DISTINCT\\b", "SELECT")
                : selectSql;
            ctx.addStep(new StepResult("SELECT", sqlNoDistinct, ctx.execute(sqlNoDistinct)));
            // DISTINCT step — still without ORDER BY
            ctx.addStep(new StepResult("DISTINCT", selectSql, ctx.execute(selectSql)));
        } else {
            ctx.addStep(new StepResult("SELECT", selectSql, ctx.execute(selectSql)));
        }
    }
}
