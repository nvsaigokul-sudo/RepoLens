package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.AISummaryResponse;
import com.titansearch.entity.AISummary;
import com.titansearch.entity.Repository;
import com.titansearch.repository.AISummaryRepository;
import com.titansearch.service.ai.AISummaryService;
import com.titansearch.service.cache.CacheService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "AI Summarization", description = "Endpoints for generating AI summaries of codebases")
@Slf4j
public class AISummaryController {

    private final AISummaryService aiSummaryService;
    private final AISummaryRepository aiSummaryRepository;
    private final RepositorySearchService repositorySearchService;
    private final CacheService cacheService;

    @GetMapping("/{owner}/{repo}/ai-summary")
    @Operation(summary = "Get AI summary (returns cached, triggers async generation if missing, returns 202 PENDING)")
    public ResponseEntity<ApiEnvelope<AISummaryResponse>> getSummary(
            @PathVariable String owner, @PathVariable String repo) {

        String cacheKey = "ai-summary:" + owner.toLowerCase() + ":" + repo.toLowerCase();

        // 1. Try Rest cache
        AISummaryResponse cached = cacheService.get(cacheKey, AISummaryResponse.class);
        if (cached != null) {
            log.info("Cache hit for AI summary {}/{}", owner, repo);
            return ResponseEntity.ok(ApiEnvelope.ok(cached));
        }

        Repository repository = repositorySearchService.getOrCreateRepository(owner, repo);
        Long repoId = repository.getId();

        // 2. Check Database
        AISummary dbSummary = aiSummaryRepository.findByRepositoryId(repoId).orElse(null);
        if (dbSummary != null) {
            AISummaryResponse response = new AISummaryResponse(
                    dbSummary.getOverview(),
                    dbSummary.getMainPurpose(),
                    dbSummary.getArchitectureSummary(),
                    dbSummary.getKeyTechnologies(),
                    dbSummary.getLearningValue(),
                    "SUCCESS",
                    dbSummary.getGeneratedAt()
            );
            cacheService.put(cacheKey, response, 86400); // Cache for 24h
            return ResponseEntity.ok(ApiEnvelope.ok(response));
        }

        // 3. Check Redis Job status
        String jobStatus = aiSummaryService.getJobStatus(repoId);
        if ("PENDING".equals(jobStatus)) {
            AISummaryResponse pendingResponse = new AISummaryResponse(
                    null, null, null, null, null, "PENDING", null
            );
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiEnvelope.ok(pendingResponse));
        }

        if ("FAILED".equals(jobStatus)) {
            // Treat as not started to allow retries
            jobStatus = "NOT_STARTED";
        }

        if ("NOT_STARTED".equals(jobStatus)) {
            aiSummaryService.generateSummaryAsync(repository);
            AISummaryResponse pendingResponse = new AISummaryResponse(
                    null, null, null, null, null, "PENDING", null
            );
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiEnvelope.ok(pendingResponse));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiEnvelope.error("INTERNAL_ERROR", "Unexpected job status encountered"));
    }

    @PostMapping("/{owner}/{repo}/ai-summary/regenerate")
    @Operation(summary = "Force regenerate AI summary (triggers fresh Gemini call, returns 202 PENDING)")
    public ResponseEntity<ApiEnvelope<AISummaryResponse>> regenerate(
            @PathVariable String owner, @PathVariable String repo) {

        Repository repository = repositorySearchService.getOrCreateRepository(owner, repo);
        aiSummaryService.generateSummaryAsync(repository);

        AISummaryResponse pendingResponse = new AISummaryResponse(
                null, null, null, null, null, "PENDING", null
        );
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiEnvelope.ok(pendingResponse));
    }
}
