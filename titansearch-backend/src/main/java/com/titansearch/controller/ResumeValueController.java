package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.ResumeAnalysisPojo;
import com.titansearch.service.ai.ResumeValueService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Resume Value", description = "Evaluate repository portfolio value for developer resumes")
public class ResumeValueController {

    private final RepositorySearchService repositorySearchService;
    private final ResumeValueService resumeValueService;

    @PostMapping("/{owner}/{repo}/resume-analysis")
    @Operation(summary = "Get or trigger AI resume analysis (returns 202 PENDING if in progress)")
    public ResponseEntity<ApiEnvelope<?>> getResumeAnalysis(
            @PathVariable String owner, 
            @PathVariable String repo,
            @RequestHeader(value = "X-GitHub-Token", required = false) String gitToken,
            @RequestHeader(value = "X-Gemini-Key", required = false) String geminiKey) {

        RepositoryDetailResponse repository = repositorySearchService.getDetail(owner, repo);
        
        String jobError = resumeValueService.getJobError(repository.fullName());
        if (jobError != null) {
            resumeValueService.clearJobState(repository.fullName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiEnvelope.failed(new ApiEnvelope.ApiError("ANALYSIS_FAILED", jobError)));
        }

        Optional<ResumeAnalysisPojo> analysisOpt = resumeValueService.getResumeAnalysis(repository, gitToken, geminiKey);

        if (analysisOpt.isPresent()) {
            ResumeAnalysisPojo analysis = analysisOpt.get();
            Map<String, Object> data = Map.ofEntries(
                    Map.entry("id", System.currentTimeMillis()),
                    Map.entry("resumeScore", analysis.resumeScore()),
                    Map.entry("strengths", analysis.strengths()),
                    Map.entry("weaknesses", analysis.weaknesses()),
                    Map.entry("industryRelevance", analysis.industryRelevance()),
                    Map.entry("suggestedImprovements", analysis.suggestedImprovements()),
                    Map.entry("generatedAt", analysis.generatedAt()),
                    Map.entry("portfolioScore", analysis.portfolioScore() != null ? analysis.portfolioScore() : BigDecimal.ZERO),
                    Map.entry("portfolioReasoning", analysis.portfolioReasoning() != null ? analysis.portfolioReasoning() : ""),
                    Map.entry("portfolioContributors", analysis.portfolioContributors() != null ? analysis.portfolioContributors() : List.of()),
                    Map.entry("maintainabilityScore", analysis.maintainabilityScore() != null ? analysis.maintainabilityScore() : 0),
                    Map.entry("maintainabilityReasoning", analysis.maintainabilityReasoning() != null ? analysis.maintainabilityReasoning() : ""),
                    Map.entry("maintainabilityContributors", analysis.maintainabilityContributors() != null ? analysis.maintainabilityContributors() : List.of()),
                    Map.entry("codeQualityScore", analysis.codeQualityScore() != null ? analysis.codeQualityScore() : 0),
                    Map.entry("codeQualityReasoning", analysis.codeQualityReasoning() != null ? analysis.codeQualityReasoning() : ""),
                    Map.entry("codeQualityContributors", analysis.codeQualityContributors() != null ? analysis.codeQualityContributors() : List.of()),
                    Map.entry("overallHealthScore", analysis.overallHealthScore() != null ? analysis.overallHealthScore() : 0),
                    Map.entry("overallHealthReasoning", analysis.overallHealthReasoning() != null ? analysis.overallHealthReasoning() : ""),
                    Map.entry("overallHealthContributors", analysis.overallHealthContributors() != null ? analysis.overallHealthContributors() : List.of()),
                    Map.entry("confidenceScore", analysis.confidenceScore() != null ? analysis.confidenceScore() : 0)
            );
            return ResponseEntity.ok(ApiEnvelope.ok(data));
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new ApiEnvelope<>(
                        null,
                        new ApiEnvelope.ApiMeta(false, 3L),
                        new ApiEnvelope.ApiError("PENDING", "AI Resume evaluation is in progress. Please poll again shortly.")
                ));
    }
}
