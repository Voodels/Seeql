package com.sqlvisualizer.backend.model;

public class QueryRequest {
    private String sql;
    private boolean stepMode;

    public String getSql() { return sql; }
    public void setSql(String sql) { this.sql = sql; }
    public boolean isStepMode() { return stepMode; }
    public void setStepMode(boolean stepMode) { this.stepMode = stepMode; }
}
