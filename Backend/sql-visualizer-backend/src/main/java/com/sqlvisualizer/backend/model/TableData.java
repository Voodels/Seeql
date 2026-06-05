package com.sqlvisualizer.backend.model;

import java.util.List;
import java.util.Map;

public class TableData {
    private List<String> columns;
    private List<Map<String, Object>> rows;
    private int totalRows;

    public TableData(List<String> columns, List<Map<String, Object>> rows) {
        this.columns = columns;
        this.rows = rows;
        this.totalRows = rows.size();
    }

    public List<String> getColumns() { return columns; }
    public List<Map<String, Object>> getRows() { return rows; }
    public int getTotalRows() { return totalRows; }
}
