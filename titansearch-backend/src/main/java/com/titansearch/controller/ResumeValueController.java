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
            @PathVariable String owner, @PathVariable String repo) {

        RepositoryDetailResponse repository = repositorySearchService.getDetail(owner, repo);
        Optional<ResumeAnalysisPojo> analysisOpt = resumeValueService.getResumeAnalysis(repository);

        if (analysisOpt.isPresent()) {
            ResumeAnalysisPojo analysis = analysisOpt.get();
            Map<String, Object> data = Map.of(
                    "id", System.currentTimeMillis(),
                    "resumeScore", analysis.resumeScore(),
                    "strengths", analysis.strengths(),
                    "weaknesses", analysis.weaknesses(),
                    "industryRelevance", analysis.industryRelevance(),
                    "suggestedImprovements", analysis.suggestedImprovements(),
                    "generatedAt", analysis.generatedAt()
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
