package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.HealthScoreResponse;
import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.repository.HealthScoreRepository;
import com.titansearch.service.analysis.HealthScoreService;
import com.titansearch.service.cache.CacheService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Health Scoring", description = "Endpoints for computing and checking repository health metrics")
@Slf4j
public class HealthScoreController {

    private final HealthScoreService healthScoreService;
    private final HealthScoreRepository healthScoreRepository;
    private final RepositorySearchService repositorySearchService;
    private final CacheService cacheService;

    @GetMapping("/{owner}/{repo}/health-score")
    @Operation(summary = "Get repository health score (triggers computation if not run or stale, cached 6h)")
    public ResponseEntity<ApiEnvelope<HealthScoreResponse>> getHealthScore(
            @PathVariable String owner, @PathVariable String repo) {

        String cacheKey = "health-score:" + owner.toLowerCase() + ":" + repo.toLowerCase();

        // Cache-aside read
        HealthScoreResponse cached = cacheService.get(cacheKey, HealthScoreResponse.class);
        if (cached != null) {
            log.info("Cache hit for health-score {}/{}", owner, repo);
            return ResponseEntity.ok(ApiEnvelope.ok(cached));
        }

        log.info("Cache miss for health-score {}/{}", owner, repo);
        Repository repository = repositorySearchService.getOrCreateRepository(owner, repo);

        HealthScore healthScore = healthScoreRepository.findByRepositoryId(repository.getId()).orElse(null);

        // Recompute if missing or stale (older than 6 hours)
        boolean isStale = healthScore == null || 
                healthScore.getComputedAt().plus(6, ChronoUnit.HOURS).isBefore(Instant.now());

        if (isStale) {
            healthScore = healthScoreService.computeHealthScore(repository);
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

        // Cache for 6 hours (21600 seconds)
        cacheService.put(cacheKey, response, 21600);

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
