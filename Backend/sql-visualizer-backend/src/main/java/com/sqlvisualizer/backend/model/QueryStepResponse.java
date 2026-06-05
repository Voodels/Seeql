package com.sqlvisualizer.backend.model;

import java.util.List;

public class QueryStepResponse {
    private List<StepResult> steps;
    private TableData finalResult;

    public QueryStepResponse(List<StepResult> steps, TableData finalResult) {
        this.steps = steps;
        this.finalResult = finalResult;
    }

    public List<StepResult> getSteps() { return steps; }
    public TableData getFinalResult() { return finalResult; }

    public static class StepResult {
        private String clause;
        private String sql;
        private TableData data;

        public StepResult(String clause, String sql, TableData data) {
            this.clause = clause;
            this.sql = sql;
            this.data = data;
        }

        public String getClause() { return clause; }
        public String getSql() { return sql; }
        public TableData getData() { return data; }
    }
}
