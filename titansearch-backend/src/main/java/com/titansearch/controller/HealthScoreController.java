package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.HealthScoreResponse;
import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.repository.HealthScoreRepository;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.service.analysis.HealthScoreService;
import com.titansearch.service.github.GitHubSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Health Score", description = "Calculate repository health metrics")
public class HealthScoreController {

    private final RepositoryRepository repositoryRepository;
    private final GitHubSyncService gitHubSyncService;
    private final HealthScoreService healthScoreService;
    private final HealthScoreRepository healthScoreRepository;

    @GetMapping("/{owner}/{repo}/health-score")
    @Operation(summary = "Get repository health score (recalculated if stale > 6h)")
    public ResponseEntity<ApiEnvelope<HealthScoreResponse>> getHealthScore(
            @PathVariable String owner, @PathVariable String repo) {

        String fullName = owner + "/" + repo;
        Repository repository = repositoryRepository.findByFullNameIgnoreCase(fullName)
                .orElseGet(() -> gitHubSyncService.syncByOwnerAndName(owner, repo));

        HealthScore healthScore = healthScoreRepository.findByRepositoryId(repository.getId()).orElse(null);

        if (healthScore == null || healthScore.getComputedAt().plus(6, ChronoUnit.HOURS).isBefore(Instant.now())) {
            healthScore = healthScoreService.calculateAndSave(repository);
        }

        Map<String, Integer> breakdown = Map.of(
                "documentationScore", healthScore.getDocumentationScore(),
                "commitActivityScore", healthScore.getCommitActivityScore(),
                "issuesScore", healthScore.getIssuesScore(),
                "popularityScore", healthScore.getPopularityScore(),
                "maturityScore", healthScore.getMaturityScore()
        );

        HealthScoreResponse response = new HealthScoreResponse(
                healthScore.getOverallScore(),
                breakdown,
                healthScore.getComputedAt()
        );

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
