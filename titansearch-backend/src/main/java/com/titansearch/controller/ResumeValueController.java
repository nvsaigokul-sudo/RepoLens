package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.ResumeAnalysisResponse;
import com.titansearch.entity.Repository;
import com.titansearch.entity.ResumeAnalysis;
import com.titansearch.entity.User;
import com.titansearch.repository.ResumeAnalysisRepository;
import com.titansearch.repository.UserRepository;
import com.titansearch.service.ai.ResumeValueService;
import com.titansearch.service.cache.CacheService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Resume Value Analysis", description = "Endpoints for analyzing repository impact on developer resume")
@Slf4j
public class ResumeValueController {

    private final ResumeValueService resumeValueService;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;
    private final RepositorySearchService repositorySearchService;
    private final CacheService cacheService;

    @PostMapping("/{owner}/{repo}/resume-analysis")
    @Operation(summary = "Perform resume value analysis (triggers async analysis, returns 202 PENDING)")
    public ResponseEntity<ApiEnvelope<ResumeAnalysisResponse>> getResumeAnalysis(
            @PathVariable String owner, @PathVariable String repo) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found in DB: " + auth.getName()));

        Repository repository = repositorySearchService.getOrCreateRepository(owner, repo);
        Long repoId = repository.getId();
        Long userId = user.getId();

        String cacheKey = "resume-analysis:" + repoId + ":" + userId;

        // 1. Try Cache
        ResumeAnalysisResponse cached = cacheService.get(cacheKey, ResumeAnalysisResponse.class);
        if (cached != null) {
            log.info("Cache hit for resume analysis repo={}, user={}", repoId, userId);
            return ResponseEntity.ok(ApiEnvelope.ok(cached));
        }

        // 2. Check Database
        ResumeAnalysis dbAnalysis = resumeAnalysisRepository.findByRepositoryIdAndUserId(repoId, userId).orElse(null);
        if (dbAnalysis != null) {
            ResumeAnalysisResponse response = new ResumeAnalysisResponse(
                    dbAnalysis.getResumeScore(),
                    dbAnalysis.getStrengths(),
                    dbAnalysis.getWeaknesses(),
                    dbAnalysis.getIndustryRelevance(),
                    dbAnalysis.getSuggestedImprovements(),
                    "SUCCESS",
                    dbAnalysis.getGeneratedAt()
            );
            cacheService.put(cacheKey, response, 86400); // Cache for 24h
            return ResponseEntity.ok(ApiEnvelope.ok(response));
        }

        // 3. Check Redis Job status
        String jobStatus = resumeValueService.getJobStatus(repoId, userId);
        if ("PENDING".equals(jobStatus)) {
            ResumeAnalysisResponse pendingResponse = new ResumeAnalysisResponse(
                    null, null, null, null, null, "PENDING", null
            );
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiEnvelope.ok(pendingResponse));
        }

        if ("FAILED".equals(jobStatus)) {
            jobStatus = "NOT_STARTED";
        }

        if ("NOT_STARTED".equals(jobStatus)) {
            resumeValueService.generateResumeAnalysisAsync(repository, user);
            ResumeAnalysisResponse pendingResponse = new ResumeAnalysisResponse(
                    null, null, null, null, null, "PENDING", null
            );
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiEnvelope.ok(pendingResponse));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiEnvelope.error("INTERNAL_ERROR", "Unexpected job status encountered"));
    }
}
