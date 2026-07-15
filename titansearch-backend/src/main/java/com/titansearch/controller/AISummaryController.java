package com.titansearch.controller;

import com.titansearch.dto.response.AISummaryPojo;
import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.service.ai.AISummaryService;
import com.titansearch.service.search.RepositorySearchService;
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

    private final RepositorySearchService repositorySearchService;
    private final AISummaryService aiSummaryService;

    @GetMapping("/repositories/{owner}/{repo}/ai-summary")
    @Operation(summary = "Get AI summary (returns 202 PENDING if generation is in progress)")
    public ResponseEntity<ApiEnvelope<?>> getSummary(
            @PathVariable String owner, @PathVariable String repo) {

        RepositoryDetailResponse repository = repositorySearchService.getDetail(owner, repo);
        Optional<AISummaryPojo> summaryOpt = aiSummaryService.getSummary(repository);

        if (summaryOpt.isPresent()) {
            AISummaryPojo summary = summaryOpt.get();
            Map<String, Object> data = Map.of(
                    "id", summary.id(),
                    "overview", summary.overview(),
                    "mainPurpose", summary.mainPurpose(),
                    "architectureSummary", summary.architectureSummary(),
                    "keyTechnologies", summary.keyTechnologies(),
                    "learningValue", summary.learningValue(),
                    "modelVersion", summary.modelVersion(),
                    "generatedAt", summary.generatedAt()
            );
            return ResponseEntity.ok(ApiEnvelope.ok(data));
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new ApiEnvelope<>(
                        null, 
                        new ApiEnvelope.ApiMeta(false, 3L),
                        new ApiEnvelope.ApiError("PENDING", "AI Summary generation is in progress. Please poll again shortly.")
                ));
    }

    @PostMapping("/ai-summary/regenerate")
    @Operation(summary = "Force regeneration of AI summary")
    public ResponseEntity<ApiEnvelope<?>> regenerateSummary(
            @RequestParam String owner, @RequestParam String repo) {

        RepositoryDetailResponse repository = repositorySearchService.getDetail(owner, repo);
        aiSummaryService.forceRegenerate(repository);

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new ApiEnvelope<>(
                        null,
                        new ApiEnvelope.ApiMeta(false, 3L),
                        new ApiEnvelope.ApiError("PENDING", "Regeneration started. Please poll detail endpoints shortly.")
                ));
    }
}
