package com.sqlvisualizer.backend.controller;

import com.sqlvisualizer.backend.model.QueryRequest;
import com.sqlvisualizer.backend.model.QueryStepResponse;
import com.sqlvisualizer.backend.model.TableData;
import com.sqlvisualizer.backend.service.QueryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class QueryController {

    private static final Logger log = LoggerFactory.getLogger(QueryController.class);
    private final QueryService queryService;

    public QueryController(QueryService queryService) {
        this.queryService = queryService;
        log.info("QueryController initialized");
    }

    @PostMapping("/query/execute")
    public ResponseEntity<?> executeQuery(@RequestBody QueryRequest request) {
        log.info("POST /api/query/execute - stepMode={}, sql={}", request.isStepMode(), request.getSql());
        long start = System.currentTimeMillis();
        try {
            if (request.isStepMode()) {
                QueryStepResponse response = queryService.executeStepwise(request.getSql());
                log.info("POST /api/query/execute OK [{}ms] - {} steps, finalResult={} rows",
                        System.currentTimeMillis() - start,
                        response.getSteps().size(),
                        response.getFinalResult() != null ? response.getFinalResult().getRows().size() : 0);
                return ResponseEntity.ok(response);
            }
            TableData result = queryService.executeQuery(request.getSql());
            log.info("POST /api/query/execute OK [{}ms] - {} rows",
                    System.currentTimeMillis() - start,
                    result.getRows().size());
            return ResponseEntity.ok(Map.of("finalResult", result));
        } catch (Exception e) {
            log.error("POST /api/query/execute FAILED [{}ms] - {}: {}", System.currentTimeMillis() - start, e.getClass().getSimpleName(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/schema")
    public ResponseEntity<?> getSchema() {
        log.info("GET /api/schema");
        try {
            var schema = queryService.getSchema();
            log.info("GET /api/schema OK - {} tables", schema.size());
            return ResponseEntity.ok(schema);
        } catch (Exception e) {
            log.error("GET /api/schema FAILED: {}: {}", e.getClass().getSimpleName(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/dataset/setup")
    public ResponseEntity<?> setupDataset(@RequestBody Map<String, String> body) {
        String sql = body != null ? body.get("sql") : null;
        log.info("POST /api/dataset/setup - sql={}", sql != null ? sql.substring(0, Math.min(sql.length(), 200)) : null);
        long start = System.currentTimeMillis();
        try {
            queryService.executeDdl(sql);
            log.info("POST /api/dataset/setup OK [{}ms]", System.currentTimeMillis() - start);
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            log.error("POST /api/dataset/setup FAILED [{}ms] - {}: {}", System.currentTimeMillis() - start, e.getClass().getSimpleName(), e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
