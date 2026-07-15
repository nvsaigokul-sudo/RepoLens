package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.HealthScoreResponse;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.service.analysis.HealthScoreService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Health Score", description = "Calculate repository health metrics")
public class HealthScoreController {

    private final RepositorySearchService repositorySearchService;
    private final HealthScoreService healthScoreService;

    @GetMapping("/{owner}/{repo}/health-score")
    @Operation(summary = "Get repository health score (recalculated live)")
    public ResponseEntity<ApiEnvelope<HealthScoreResponse>> getHealthScore(
            @PathVariable String owner, @PathVariable String repo) {

        RepositoryDetailResponse detail = repositorySearchService.getDetail(owner, repo);
        HealthScoreResponse response = healthScoreService.calculateHealthScore(
                owner,
                repo,
                detail.readmePreview(),
                detail.openIssues(),
                detail.stars(),
                detail.forks(),
                detail.repoCreatedAt()
        );

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
