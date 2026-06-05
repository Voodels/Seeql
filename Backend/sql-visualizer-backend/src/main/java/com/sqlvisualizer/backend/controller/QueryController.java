package com.sqlvisualizer.backend.controller;

import com.sqlvisualizer.backend.model.QueryRequest;
import com.sqlvisualizer.backend.model.QueryStepResponse;
import com.sqlvisualizer.backend.model.TableData;
import com.sqlvisualizer.backend.service.QueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class QueryController {

    private final QueryService queryService;

    public QueryController(QueryService queryService) {
        this.queryService = queryService;
    }

    @PostMapping("/query/execute")
    public ResponseEntity<?> executeQuery(@RequestBody QueryRequest request) {
        try {
            if (request.isStepMode()) {
                QueryStepResponse response = queryService.executeStepwise(request.getSql());
                return ResponseEntity.ok(response);
            }
            TableData result = queryService.executeQuery(request.getSql());
            return ResponseEntity.ok(Map.of("finalResult", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/dataset/setup")
    public ResponseEntity<?> setupDataset(@RequestBody Map<String, String> body) {
        try {
            String sql = body.get("sql");
            queryService.executeDdl(sql);
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
