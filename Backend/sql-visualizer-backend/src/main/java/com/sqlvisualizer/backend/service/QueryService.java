package com.sqlvisualizer.backend.service;

import com.sqlvisualizer.backend.model.QueryStepResponse;
import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import com.sqlvisualizer.backend.strategy.*;
import net.sf.jsqlparser.JSQLParserException;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.Statement;
import net.sf.jsqlparser.statement.select.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class QueryService {

    private final JdbcTemplate jdbcTemplate;

    public QueryService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public QueryStepResponse executeStepwise(String sql) {
        try {
            Statement statement = CCJSqlParserUtil.parse(sql);
            if (!(statement instanceof Select select)) {
                throw new IllegalArgumentException("Only SELECT queries are supported");
            }

            PlainSelect plainSelect = select.getPlainSelect();
            if (plainSelect == null) return executeSimple(sql);

            String ctePrefix = buildCtePrefix(select.getWithItemsList());

            StepContext ctx = new StepContext(jdbcTemplate, plainSelect,
                ctePrefix, sql, select.getWithItemsList());

            List<StepStrategy> pipeline = Arrays.asList(
                new CteStrategy(),
                new FromStrategy(),
                new JoinStrategy(),
                new WhereStrategy(),
                new GroupByStrategy(),
                new HavingStrategy(),
                new SelectStrategy()
            );

            for (StepStrategy strategy : pipeline) {
                strategy.decompose(ctx);
            }

            return new QueryStepResponse(ctx.getSteps(), ctx.getFinalResult());

        } catch (JSQLParserException e) {
            return executeSimple(sql);
        }
    }

    public TableData executeQuery(String sql) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        List<String> columns = new ArrayList<>();
        if (!rows.isEmpty()) {
            columns.addAll(rows.getFirst().keySet());
        }
        return new TableData(columns, rows);
    }

    public void executeDdl(String sql) {
        jdbcTemplate.execute(sql);
    }

    private String buildCtePrefix(List<WithItem<?>> withItems) {
        if (withItems == null || withItems.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("WITH ");
        for (int i = 0; i < withItems.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(withItems.get(i).toString());
        }
        return sb.toString() + " ";
    }

    private QueryStepResponse executeSimple(String sql) {
        TableData result = executeQuery(sql);
        List<StepResult> steps = new ArrayList<>();
        steps.add(new StepResult("EXECUTE", sql, result));
        return new QueryStepResponse(steps, result);
    }
}
