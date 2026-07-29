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
            Map<String, Object> data = new java.util.HashMap<>();
            data.put("id", System.currentTimeMillis());
            data.put("resumeScore", analysis.resumeScore());
            data.put("strengths", analysis.strengths());
            data.put("weaknesses", analysis.weaknesses());
            data.put("industryRelevance", analysis.industryRelevance());
            data.put("suggestedImprovements", analysis.suggestedImprovements());
            data.put("generatedAt", analysis.generatedAt());
            
            data.put("portfolioScore", analysis.portfolioScore() != null ? analysis.portfolioScore() : BigDecimal.ZERO);
            data.put("portfolioReasoning", analysis.portfolioReasoning() != null ? analysis.portfolioReasoning() : "");
            data.put("portfolioContributors", analysis.portfolioContributors() != null ? analysis.portfolioContributors() : List.of());
            
            data.put("maintainabilityScore", analysis.maintainabilityScore() != null ? analysis.maintainabilityScore() : 0);
            data.put("maintainabilityReasoning", analysis.maintainabilityReasoning() != null ? analysis.maintainabilityReasoning() : "");
            data.put("maintainabilityContributors", analysis.maintainabilityContributors() != null ? analysis.maintainabilityContributors() : List.of());
            
            data.put("codeQualityScore", analysis.codeQualityScore() != null ? analysis.codeQualityScore() : 0);
            data.put("codeQualityReasoning", analysis.codeQualityReasoning() != null ? analysis.codeQualityReasoning() : "");
            data.put("codeQualityContributors", analysis.codeQualityContributors() != null ? analysis.codeQualityContributors() : List.of());
            
            data.put("overallHealthScore", analysis.overallHealthScore() != null ? analysis.overallHealthScore() : 0);
            data.put("overallHealthReasoning", analysis.overallHealthReasoning() != null ? analysis.overallHealthReasoning() : "");
            data.put("overallHealthContributors", analysis.overallHealthContributors() != null ? analysis.overallHealthContributors() : List.of());
            
            data.put("confidenceScore", analysis.confidenceScore() != null ? analysis.confidenceScore() : 0);

            // Report Card
            data.put("architectureGrade", analysis.architectureGrade() != null ? analysis.architectureGrade() : "B");
            data.put("architectureTooltip", analysis.architectureTooltip() != null ? analysis.architectureTooltip() : "");
            data.put("maintainabilityGrade", analysis.maintainabilityGrade() != null ? analysis.maintainabilityGrade() : "B");
            data.put("maintainabilityTooltip", analysis.maintainabilityTooltip() != null ? analysis.maintainabilityTooltip() : "");
            data.put("documentationGrade", analysis.documentationGrade() != null ? analysis.documentationGrade() : "B");
            data.put("documentationTooltip", analysis.documentationTooltip() != null ? analysis.documentationTooltip() : "");
            data.put("testingGrade", analysis.testingGrade() != null ? analysis.testingGrade() : "B");
            data.put("testingTooltip", analysis.testingTooltip() != null ? analysis.testingTooltip() : "");
            data.put("securityGrade", analysis.securityGrade() != null ? analysis.securityGrade() : "B");
            data.put("securityTooltip", analysis.securityTooltip() != null ? analysis.securityTooltip() : "");
            data.put("scalabilityGrade", analysis.scalabilityGrade() != null ? analysis.scalabilityGrade() : "B");
            data.put("scalabilityTooltip", analysis.scalabilityTooltip() != null ? analysis.scalabilityTooltip() : "");
            data.put("codeOrganizationGrade", analysis.codeOrganizationGrade() != null ? analysis.codeOrganizationGrade() : "B");
            data.put("codeOrganizationTooltip", analysis.codeOrganizationTooltip() != null ? analysis.codeOrganizationTooltip() : "");
            data.put("dependencyHealthGrade", analysis.dependencyHealthGrade() != null ? analysis.dependencyHealthGrade() : "B");
            data.put("dependencyHealthTooltip", analysis.dependencyHealthTooltip() != null ? analysis.dependencyHealthTooltip() : "");
            data.put("overallGrade", analysis.overallGrade() != null ? analysis.overallGrade() : "B");

            // Timeline
            data.put("healthTimeline", analysis.healthTimeline() != null ? analysis.healthTimeline() : List.of());
            data.put("healthTrend", analysis.healthTrend() != null ? analysis.healthTrend() : "Stable");

            // DNA
            data.put("dnaArchitecture", analysis.dnaArchitecture() != null ? analysis.dnaArchitecture() : 50);
            data.put("dnaDocumentation", analysis.dnaDocumentation() != null ? analysis.dnaDocumentation() : 50);
            data.put("dnaTesting", analysis.dnaTesting() != null ? analysis.dnaTesting() : 50);
            data.put("dnaSecurity", analysis.dnaSecurity() != null ? analysis.dnaSecurity() : 50);
            data.put("dnaBackend", analysis.dnaBackend() != null ? analysis.dnaBackend() : 50);
            data.put("dnaFrontend", analysis.dnaFrontend() != null ? analysis.dnaFrontend() : 50);
            data.put("dnaInfrastructure", analysis.dnaInfrastructure() != null ? analysis.dnaInfrastructure() : 50);
            data.put("dnaDevops", analysis.dnaDevops() != null ? analysis.dnaDevops() : 50);
            data.put("dnaDatabase", analysis.dnaDatabase() != null ? analysis.dnaDatabase() : 50);
            data.put("dnaPerformance", analysis.dnaPerformance() != null ? analysis.dnaPerformance() : 50);
            data.put("dnaAi", analysis.dnaAi() != null ? analysis.dnaAi() : 50);

            // Personality
            data.put("personalityTitle", analysis.personalityTitle() != null ? analysis.personalityTitle() : "The Builder");
            data.put("personalityTraits", analysis.personalityTraits() != null ? analysis.personalityTraits() : List.of());
            data.put("personalityExplanation", analysis.personalityExplanation() != null ? analysis.personalityExplanation() : "");

            // Risk Radar
            data.put("riskDocumentation", analysis.riskDocumentation() != null ? analysis.riskDocumentation() : "Green");
            data.put("riskDocumentationRec", analysis.riskDocumentationRec() != null ? analysis.riskDocumentationRec() : "");
            data.put("riskSecurity", analysis.riskSecurity() != null ? analysis.riskSecurity() : "Green");
            data.put("riskSecurityRec", analysis.riskSecurityRec() != null ? analysis.riskSecurityRec() : "");
            data.put("riskTesting", analysis.riskTesting() != null ? analysis.riskTesting() : "Green");
            data.put("riskTestingRec", analysis.riskTestingRec() != null ? analysis.riskTestingRec() : "");
            data.put("riskDependencyUpdates", analysis.riskDependencyUpdates() != null ? analysis.riskDependencyUpdates() : "Green");
            data.put("riskDependencyUpdatesRec", analysis.riskDependencyUpdatesRec() != null ? analysis.riskDependencyUpdatesRec() : "");
            data.put("riskTechnicalDebt", analysis.riskTechnicalDebt() != null ? analysis.riskTechnicalDebt() : "Green");
            data.put("riskTechnicalDebtRec", analysis.riskTechnicalDebtRec() != null ? analysis.riskTechnicalDebtRec() : "");
            data.put("riskPerformance", analysis.riskPerformance() != null ? analysis.riskPerformance() : "Green");
            data.put("riskPerformanceRec", analysis.riskPerformanceRec() != null ? analysis.riskPerformanceRec() : "");
            data.put("riskScalability", analysis.riskScalability() != null ? analysis.riskScalability() : "Green");
            data.put("riskScalabilityRec", analysis.riskScalabilityRec() != null ? analysis.riskScalabilityRec() : "");
            data.put("riskApiStability", analysis.riskApiStability() != null ? analysis.riskApiStability() : "Green");
            data.put("riskApiStabilityRec", analysis.riskApiStabilityRec() != null ? analysis.riskApiStabilityRec() : "");

            // Code Review Feed
            data.put("codeReviewFeed", analysis.codeReviewFeed() != null ? analysis.codeReviewFeed() : List.of());

            // Journey
            data.put("journey", analysis.journey() != null ? analysis.journey() : List.of());

            // Recruiter Perspective
            data.put("recruiterBackend", analysis.recruiterBackend() != null ? analysis.recruiterBackend() : 3);
            data.put("recruiterArchitecture", analysis.recruiterArchitecture() != null ? analysis.recruiterArchitecture() : 3);
            data.put("recruiterTesting", analysis.recruiterTesting() != null ? analysis.recruiterTesting() : 3);
            data.put("recruiterProduction", analysis.recruiterProduction() != null ? analysis.recruiterProduction() : 3);
            data.put("recruiterDocumentation", analysis.recruiterDocumentation() != null ? analysis.recruiterDocumentation() : 3);
            data.put("recruiterReadiness", analysis.recruiterReadiness() != null ? analysis.recruiterReadiness() : 70);
            data.put("recruiterRecommend", analysis.recruiterRecommend() != null ? analysis.recruiterRecommend() : true);
            data.put("recruiterReason", analysis.recruiterReason() != null ? analysis.recruiterReason() : "");

            // Badges
            data.put("achievementBadges", analysis.achievementBadges() != null ? analysis.achievementBadges() : List.of());

            // Roadmap
            data.put("roadmapHigh", analysis.roadmapHigh() != null ? analysis.roadmapHigh() : List.of());
            data.put("roadmapMedium", analysis.roadmapMedium() != null ? analysis.roadmapMedium() : List.of());
            data.put("roadmapLow", analysis.roadmapLow() != null ? analysis.roadmapLow() : List.of());

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
