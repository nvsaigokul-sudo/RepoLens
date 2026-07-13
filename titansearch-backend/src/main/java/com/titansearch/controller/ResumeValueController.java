package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.entity.Repository;
import com.titansearch.entity.ResumeAnalysis;
import com.titansearch.entity.User;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.repository.UserRepository;
import com.titansearch.service.ai.ResumeValueService;
import com.titansearch.service.github.GitHubSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Resume Value", description = "Evaluate repository portfolio value for developer resumes")
public class ResumeValueController {

    private final RepositoryRepository repositoryRepository;
    private final GitHubSyncService gitHubSyncService;
    private final ResumeValueService resumeValueService;
    private final UserRepository userRepository;

    @PostMapping("/{owner}/{repo}/resume-analysis")
    @Operation(summary = "Get or trigger AI resume analysis (returns 202 PENDING if in progress)")
    public ResponseEntity<ApiEnvelope<?>> getResumeAnalysis(
            @PathVariable String owner, @PathVariable String repo) {

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found in database"));

        String fullName = owner + "/" + repo;
        Repository repository = repositoryRepository.findByFullNameIgnoreCase(fullName)
                .orElseGet(() -> gitHubSyncService.syncByOwnerAndName(owner, repo));

        Optional<ResumeAnalysis> analysisOpt = resumeValueService.getResumeAnalysis(repository, user);

        if (analysisOpt.isPresent()) {
            ResumeAnalysis analysis = analysisOpt.get();
            Map<String, Object> data = Map.of(
                    "id", analysis.getId(),
                    "resumeScore", analysis.getResumeScore(),
                    "strengths", analysis.getStrengths(),
                    "weaknesses", analysis.getWeaknesses(),
                    "industryRelevance", analysis.getIndustryRelevance(),
                    "suggestedImprovements", analysis.getSuggestedImprovements(),
                    "generatedAt", analysis.getGeneratedAt()
            );
            return ResponseEntity.ok(ApiEnvelope.ok(data));
        }

        // Return 202 PENDING
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new ApiEnvelope<>(
                        null,
                        new ApiEnvelope.ApiMeta(false, 3L),
                        new ApiEnvelope.ApiError("PENDING", "AI Resume evaluation is in progress. Please poll again shortly.")
                ));
    }
}
