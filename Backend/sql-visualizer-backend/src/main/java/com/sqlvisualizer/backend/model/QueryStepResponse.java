package com.sqlvisualizer.backend.model;

import java.util.List;
import java.util.Map;

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
        private List<String> groupColumns;
        private Map<String, Object> extras;
        private String error;
        private String errorType;

        public StepResult(String clause, String sql, TableData data) {
            this(clause, sql, data, null, null, null, null);
        }

        public StepResult(String clause, String sql, TableData data, List<String> groupColumns) {
            this(clause, sql, data, groupColumns, null, null, null);
        }

        public StepResult(String clause, String sql, TableData data, List<String> groupColumns, Map<String, Object> extras) {
            this(clause, sql, data, groupColumns, extras, null, null);
        }

        public StepResult(String clause, String sql, TableData data, List<String> groupColumns, Map<String, Object> extras, String error, String errorType) {
            this.clause = clause;
            this.sql = sql;
            this.data = data;
            this.groupColumns = groupColumns;
            this.extras = extras;
            this.error = error;
            this.errorType = errorType;
        }

        public static StepResult errorStep(String clause, String sql, String error, String errorType) {
            return new StepResult(clause, sql, new TableData(List.of(), List.of()), null, null, error, errorType);
        }

        public String getClause() { return clause; }
        public String getSql() { return sql; }
        public TableData getData() { return data; }
        public List<String> getGroupColumns() { return groupColumns; }
        public Map<String, Object> getExtras() { return extras; }
        public String getError() { return error; }
        public String getErrorType() { return errorType; }
    }
}
