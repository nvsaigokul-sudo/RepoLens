package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.entity.AISummary;
import com.titansearch.entity.Repository;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.service.ai.AISummaryService;
import com.titansearch.service.github.GitHubSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "AI Summary", description = "Retrieve and regenerate AI-powered repository summaries")
public class AISummaryController {

    private final RepositoryRepository repositoryRepository;
    private final GitHubSyncService gitHubSyncService;
    private final AISummaryService aiSummaryService;

    @GetMapping("/repositories/{owner}/{repo}/ai-summary")
    @Operation(summary = "Get AI summary (returns 202 PENDING if generation is in progress)")
    public ResponseEntity<ApiEnvelope<?>> getSummary(
            @PathVariable String owner, @PathVariable String repo) {

        String fullName = owner + "/" + repo;
        Repository repository = repositoryRepository.findByFullNameIgnoreCase(fullName)
                .orElseGet(() -> gitHubSyncService.syncByOwnerAndName(owner, repo));

        Optional<AISummary> summaryOpt = aiSummaryService.getSummary(repository);

        if (summaryOpt.isPresent()) {
            AISummary summary = summaryOpt.get();
            Map<String, Object> data = Map.of(
                    "id", summary.getId(),
                    "overview", summary.getOverview(),
                    "mainPurpose", summary.getMainPurpose(),
                    "architectureSummary", summary.getArchitectureSummary(),
                    "keyTechnologies", summary.getKeyTechnologies(),
                    "learningValue", summary.getLearningValue(),
                    "modelVersion", summary.getModelVersion(),
                    "generatedAt", summary.getGeneratedAt()
            );
            return ResponseEntity.ok(ApiEnvelope.ok(data, new ApiEnvelope.ApiMeta(true, 2592000L))); // Cached true, 30 days
        }

        // Return 202 PENDING
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new ApiEnvelope<>(
                        null, 
                        new ApiEnvelope.ApiMeta(false, 3L), // Poll in 3 seconds
                        new ApiEnvelope.ApiError("PENDING", "AI Summary generation is in progress. Please poll again shortly.")
                ));
    }

    @PostMapping("/ai-summary/regenerate")
    @Operation(summary = "Force regeneration of AI summary (rate-limited to 5/hour)")
    public ResponseEntity<ApiEnvelope<?>> regenerateSummary(
            @RequestParam String owner, @RequestParam String repo) {

        String fullName = owner + "/" + repo;
        Repository repository = repositoryRepository.findByFullNameIgnoreCase(fullName)
                .orElseGet(() -> gitHubSyncService.syncByOwnerAndName(owner, repo));

        aiSummaryService.forceRegenerate(repository);

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new ApiEnvelope<>(
                        null,
                        new ApiEnvelope.ApiMeta(false, 3L),
                        new ApiEnvelope.ApiError("PENDING", "Regeneration started. Please poll detail endpoints shortly.")
                ));
    }
}
