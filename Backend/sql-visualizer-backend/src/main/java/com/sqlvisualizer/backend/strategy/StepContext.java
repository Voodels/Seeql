package com.sqlvisualizer.backend.strategy;

import com.sqlvisualizer.backend.model.QueryStepResponse.StepResult;
import com.sqlvisualizer.backend.model.TableData;
import net.sf.jsqlparser.statement.select.*;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class StepContext {
    private final JdbcTemplate jdbc;
    private final PlainSelect plainSelect;
    private final String ctePrefix;
    private final String originalSql;
    private final List<WithItem<?>> withItems;
    private final boolean hasCTE;
    private final String fromItem;
    private final List<Join> joins;
    private final boolean hasJoins;
    private final List<StepResult> steps = new ArrayList<>();
    private final StringBuilder progressiveFrom;
    private TableData finalResult;

    public StepContext(JdbcTemplate jdbc, PlainSelect plainSelect,
                       String ctePrefix, String originalSql, List<WithItem<?>> withItems) {
        this.jdbc = jdbc;
        this.plainSelect = plainSelect;
        this.ctePrefix = ctePrefix;
        this.originalSql = originalSql;
        this.withItems = withItems;
        this.hasCTE = withItems != null && !withItems.isEmpty();
        this.fromItem = plainSelect.getFromItem().toString();
        this.joins = plainSelect.getJoins();
        this.hasJoins = joins != null && !joins.isEmpty();
        this.progressiveFrom = new StringBuilder(fromItem);
    }

    public JdbcTemplate getJdbc() { return jdbc; }
    public PlainSelect getPlainSelect() { return plainSelect; }
    public String getCtePrefix() { return ctePrefix; }
    public String getOriginalSql() { return originalSql; }
    public List<WithItem<?>> getWithItems() { return withItems; }
    public boolean hasCTE() { return hasCTE; }
    public String getFromItem() { return fromItem; }
    public List<Join> getJoins() { return joins; }
    public boolean hasJoins() { return hasJoins; }
    public List<StepResult> getSteps() { return steps; }
    public StringBuilder getProgressiveFrom() { return progressiveFrom; }
    public String getFromClause() { return progressiveFrom.toString(); }
    public TableData getFinalResult() { return finalResult; }
    public void setFinalResult(TableData finalResult) { this.finalResult = finalResult; }

    public void addStep(StepResult step) { steps.add(step); }
    public TableData execute(String sql) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql);
        List<String> columns = new ArrayList<>();
        if (!rows.isEmpty()) columns.addAll(rows.getFirst().keySet());
        return new TableData(columns, rows);
    }
}
