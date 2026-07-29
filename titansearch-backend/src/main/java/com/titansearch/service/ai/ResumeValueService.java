package com.titansearch.service.ai;

import com.titansearch.dto.response.GeminiResumeAnalysisDto;
import com.titansearch.dto.response.HealthScoreResponse;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.ResumeAnalysisPojo;
import com.titansearch.dto.response.TechStackDto;
import com.titansearch.service.analysis.HealthScoreService;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.cache.CacheService;
import com.titansearch.service.github.GitHubClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeValueService {

    private final TechStackDetectorService techStackDetectorService;
    private final HealthScoreService healthScoreService;
    private final CacheService cacheService;
    private final GeminiClient geminiClient;
    private final GitHubClient gitHubClient;

    public enum JobState { PENDING, FAILED }
    private final java.util.Map<String, JobState> jobStates = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_SECONDS = 86400; // 24 hours

    public Optional<ResumeAnalysisPojo> getResumeAnalysis(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String key = "resume-analysis:" + repository.fullName().toLowerCase();
        Optional<ResumeAnalysisPojo> cached = cacheService.get(key, ResumeAnalysisPojo.class);

        if (cached.isPresent()) {
            return cached;
        }

        triggerAsyncGeneration(repository, gitToken, geminiKey);
        return Optional.empty();
    }

    public boolean isGenerationPending(String fullName) {
        return jobStates.get(fullName.toLowerCase()) == JobState.PENDING;
    }

    public String getJobError(String fullName) {
        String key = fullName.toLowerCase();
        if (jobStates.get(key) == JobState.FAILED) {
            return "Failed to evaluate repository portfolio value. Please check your configuration and API keys.";
        }
        return null;
    }

    public void clearJobState(String fullName) {
        jobStates.remove(fullName.toLowerCase());
    }

    private void triggerAsyncGeneration(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String name = repository.fullName().toLowerCase();
        JobState state = jobStates.get(name);
        if (state == JobState.PENDING) {
            log.info("Resume evaluation for repository {} is already in progress.", repository.fullName());
            return;
        }
        log.info("Triggered async resume evaluation for repository: {}", repository.fullName());
        jobStates.put(name, JobState.PENDING);
        generateResumeAnalysisAsync(repository, gitToken, geminiKey);
    }

    @Async
    public void generateResumeAnalysisAsync(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String fullName = repository.fullName();
        String nameKey = fullName.toLowerCase();
        com.titansearch.config.SecurityContext.setGitHubToken(gitToken);
        com.titansearch.config.SecurityContext.setGeminiKey(geminiKey);
        try {
            String owner = fullName.split("/")[0];
            String repoName = fullName.split("/")[1];

            List<TechStackDto> detections = techStackDetectorService.detectTechStack(
                    owner, repoName, repository.primaryLanguage(), repository.description());
            List<String> techStack = detections.stream().map(TechStackDto::technology).toList();

            HealthScoreResponse healthScore = healthScoreService.calculateHealthScore(
                    owner,
                    repoName,
                    repository.readmePreview(),
                    repository.openIssues(),
                    repository.stars(),
                    repository.forks(),
                    repository.repoCreatedAt()
            );

            List<Map<String, Object>> contents = gitHubClient.getDirectoryContents(owner, repoName, "");
            StringBuilder structureBuilder = new StringBuilder();
            if (contents != null) {
                for (Map<String, Object> item : contents) {
                    if (item == null) continue;
                    String name = (String) item.get("name");
                    String type = (String) item.get("type");
                    structureBuilder.append("- ").append(name).append(" (").append(type).append(")\n");
                    
                    if ("dir".equals(type) && ("src".equalsIgnoreCase(name) || "app".equalsIgnoreCase(name) || "lib".equalsIgnoreCase(name) || "main".equalsIgnoreCase(name))) {
                        List<Map<String, Object>> subContents = gitHubClient.getDirectoryContents(owner, repoName, name);
                        if (subContents != null) {
                            for (Map<String, Object> subItem : subContents) {
                                if (subItem == null) continue;
                                structureBuilder.append("  - ").append(name).append("/").append(subItem.get("name"))
                                                 .append(" (").append(subItem.get("type")).append(")\n");
                            }
                        }
                    }
                }
            }
            String directoryStructure = structureBuilder.toString();

            GeminiResumeAnalysisDto dto = geminiClient.generateResumeAnalysis(
                    fullName,
                    repository.description() != null ? repository.description() : "",
                    techStack,
                    repository.readmePreview() != null ? repository.readmePreview() : "",
                    healthScore.overallScore(),
                    directoryStructure
            );

            int score = dto.resumeScore() != null ? dto.resumeScore().intValue() : 0;
            List<String> strengths = dto.strengths() != null ? List.of(dto.strengths().split("\n")) : List.of();
            List<String> weaknesses = dto.weaknesses() != null ? List.of(dto.weaknesses().split("\n")) : List.of();
            List<String> improvements = dto.suggestedImprovements() != null ? List.of(dto.suggestedImprovements().split("\n")) : List.of();

            BigDecimal portfolioScoreVal = dto.portfolioScore() != null ? dto.portfolioScore() : BigDecimal.valueOf(score);
            String portfolioReasoningVal = dto.portfolioReasoning() != null ? dto.portfolioReasoning() : "";
            List<String> portfolioContributorsVal = dto.portfolioContributors() != null ? dto.portfolioContributors() : List.of();

            Integer maintainabilityScoreVal = dto.maintainabilityScore() != null ? dto.maintainabilityScore() : 70;
            String maintainabilityReasoningVal = dto.maintainabilityReasoning() != null ? dto.maintainabilityReasoning() : "";
            List<String> maintainabilityContributorsVal = dto.maintainabilityContributors() != null ? dto.maintainabilityContributors() : List.of();

            Integer codeQualityScoreVal = dto.codeQualityScore() != null ? dto.codeQualityScore() : 70;
            String codeQualityReasoningVal = dto.codeQualityReasoning() != null ? dto.codeQualityReasoning() : "";
            List<String> codeQualityContributorsVal = dto.codeQualityContributors() != null ? dto.codeQualityContributors() : List.of();

            Integer overallHealthScoreVal = dto.overallHealthScore() != null ? dto.overallHealthScore() : healthScore.overallScore();
            String overallHealthReasoningVal = dto.overallHealthReasoning() != null ? dto.overallHealthReasoning() : "";
            List<String> overallHealthContributorsVal = dto.overallHealthContributors() != null ? dto.overallHealthContributors() : List.of();

            Integer confidenceScoreVal = dto.confidenceScore() != null ? dto.confidenceScore() : 80;

            String architectureGradeVal = dto.architectureGrade() != null ? dto.architectureGrade() : "B";
            String architectureTooltipVal = dto.architectureTooltip() != null ? dto.architectureTooltip() : "";
            String maintainabilityGradeVal = dto.maintainabilityGrade() != null ? dto.maintainabilityGrade() : "B";
            String maintainabilityTooltipVal = dto.maintainabilityTooltip() != null ? dto.maintainabilityTooltip() : "";
            String documentationGradeVal = dto.documentationGrade() != null ? dto.documentationGrade() : "B";
            String documentationTooltipVal = dto.documentationTooltip() != null ? dto.documentationTooltip() : "";
            String testingGradeVal = dto.testingGrade() != null ? dto.testingGrade() : "B";
            String testingTooltipVal = dto.testingTooltip() != null ? dto.testingTooltip() : "";
            String securityGradeVal = dto.securityGrade() != null ? dto.securityGrade() : "B";
            String securityTooltipVal = dto.securityTooltip() != null ? dto.securityTooltip() : "";
            String scalabilityGradeVal = dto.scalabilityGrade() != null ? dto.scalabilityGrade() : "B";
            String scalabilityTooltipVal = dto.scalabilityTooltip() != null ? dto.scalabilityTooltip() : "";
            String codeOrganizationGradeVal = dto.codeOrganizationGrade() != null ? dto.codeOrganizationGrade() : "B";
            String codeOrganizationTooltipVal = dto.codeOrganizationTooltip() != null ? dto.codeOrganizationTooltip() : "";
            String dependencyHealthGradeVal = dto.dependencyHealthGrade() != null ? dto.dependencyHealthGrade() : "B";
            String dependencyHealthTooltipVal = dto.dependencyHealthTooltip() != null ? dto.dependencyHealthTooltip() : "";
            String overallGradeVal = dto.overallGrade() != null ? dto.overallGrade() : "B";

            List<Map<String, Object>> healthTimelineVal = dto.healthTimeline() != null ? dto.healthTimeline() : List.of();
            String healthTrendVal = dto.healthTrend() != null ? dto.healthTrend() : "Stable";

            Integer dnaArchitectureVal = dto.dnaArchitecture() != null ? dto.dnaArchitecture() : 50;
            Integer dnaDocumentationVal = dto.dnaDocumentation() != null ? dto.dnaDocumentation() : 50;
            Integer dnaTestingVal = dto.dnaTesting() != null ? dto.dnaTesting() : 50;
            Integer dnaSecurityVal = dto.dnaSecurity() != null ? dto.dnaSecurity() : 50;
            Integer dnaBackendVal = dto.dnaBackend() != null ? dto.dnaBackend() : 50;
            Integer dnaFrontendVal = dto.dnaFrontend() != null ? dto.dnaFrontend() : 50;
            Integer dnaInfrastructureVal = dto.dnaInfrastructure() != null ? dto.dnaInfrastructure() : 50;
            Integer dnaDevopsVal = dto.dnaDevops() != null ? dto.dnaDevops() : 50;
            Integer dnaDatabaseVal = dto.dnaDatabase() != null ? dto.dnaDatabase() : 50;
            Integer dnaPerformanceVal = dto.dnaPerformance() != null ? dto.dnaPerformance() : 50;
            Integer dnaAiVal = dto.dnaAi() != null ? dto.dnaAi() : 50;

            String personalityTitleVal = dto.personalityTitle() != null ? dto.personalityTitle() : "The Builder";
            List<String> personalityTraitsVal = dto.personalityTraits() != null ? dto.personalityTraits() : List.of();
            String personalityExplanationVal = dto.personalityExplanation() != null ? dto.personalityExplanation() : "";

            String riskDocumentationVal = dto.riskDocumentation() != null ? dto.riskDocumentation() : "Green";
            String riskDocumentationRecVal = dto.riskDocumentationRec() != null ? dto.riskDocumentationRec() : "";
            String riskSecurityVal = dto.riskSecurity() != null ? dto.riskSecurity() : "Green";
            String riskSecurityRecVal = dto.riskSecurityRec() != null ? dto.riskSecurityRec() : "";
            String riskTestingVal = dto.riskTesting() != null ? dto.riskTesting() : "Green";
            String riskTestingRecVal = dto.riskTestingRec() != null ? dto.riskTestingRec() : "";
            String riskDependencyUpdatesVal = dto.riskDependencyUpdates() != null ? dto.riskDependencyUpdates() : "Green";
            String riskDependencyUpdatesRecVal = dto.riskDependencyUpdatesRec() != null ? dto.riskDependencyUpdatesRec() : "";
            String riskTechnicalDebtVal = dto.riskTechnicalDebt() != null ? dto.riskTechnicalDebt() : "Green";
            String riskTechnicalDebtRecVal = dto.riskTechnicalDebtRec() != null ? dto.riskTechnicalDebtRec() : "";
            String riskPerformanceVal = dto.riskPerformance() != null ? dto.riskPerformance() : "Green";
            String riskPerformanceRecVal = dto.riskPerformanceRec() != null ? dto.riskPerformanceRec() : "";
            String riskScalabilityVal = dto.riskScalability() != null ? dto.riskScalability() : "Green";
            String riskScalabilityRecVal = dto.riskScalabilityRec() != null ? dto.riskScalabilityRec() : "";
            String riskApiStabilityVal = dto.riskApiStability() != null ? dto.riskApiStability() : "Green";
            String riskApiStabilityRecVal = dto.riskApiStabilityRec() != null ? dto.riskApiStabilityRec() : "";

            List<Map<String, Object>> codeReviewFeedVal = dto.codeReviewFeed() != null ? dto.codeReviewFeed() : List.of();
            List<Map<String, Object>> journeyVal = dto.journey() != null ? dto.journey() : List.of();

            Integer recruiterBackendVal = dto.recruiterBackend() != null ? dto.recruiterBackend() : 3;
            Integer recruiterArchitectureVal = dto.recruiterArchitecture() != null ? dto.recruiterArchitecture() : 3;
            Integer recruiterTestingVal = dto.recruiterTesting() != null ? dto.recruiterTesting() : 3;
            Integer recruiterProductionVal = dto.recruiterProduction() != null ? dto.recruiterProduction() : 3;
            Integer recruiterDocumentationVal = dto.recruiterDocumentation() != null ? dto.recruiterDocumentation() : 3;
            Integer recruiterReadinessVal = dto.recruiterReadiness() != null ? dto.recruiterReadiness() : 70;
            Boolean recruiterRecommendVal = dto.recruiterRecommend() != null ? dto.recruiterRecommend() : true;
            String recruiterReasonVal = dto.recruiterReason() != null ? dto.recruiterReason() : "";

            List<String> achievementBadgesVal = dto.achievementBadges() != null ? dto.achievementBadges() : List.of();

            List<String> roadmapHighVal = dto.roadmapHigh() != null ? dto.roadmapHigh() : List.of();
            List<String> roadmapMediumVal = dto.roadmapMedium() != null ? dto.roadmapMedium() : List.of();
            List<String> roadmapLowVal = dto.roadmapLow() != null ? dto.roadmapLow() : List.of();

            ResumeAnalysisPojo analysis = new ResumeAnalysisPojo(
                    score,
                    strengths,
                    weaknesses,
                    dto.industryRelevance(),
                    improvements,
                    Instant.now(),
                    portfolioScoreVal,
                    portfolioReasoningVal,
                    portfolioContributorsVal,
                    maintainabilityScoreVal,
                    maintainabilityReasoningVal,
                    maintainabilityContributorsVal,
                    codeQualityScoreVal,
                    codeQualityReasoningVal,
                    codeQualityContributorsVal,
                    overallHealthScoreVal,
                    overallHealthReasoningVal,
                    overallHealthContributorsVal,
                    confidenceScoreVal,
                    architectureGradeVal,
                    architectureTooltipVal,
                    maintainabilityGradeVal,
                    maintainabilityTooltipVal,
                    documentationGradeVal,
                    documentationTooltipVal,
                    testingGradeVal,
                    testingTooltipVal,
                    securityGradeVal,
                    securityTooltipVal,
                    scalabilityGradeVal,
                    scalabilityTooltipVal,
                    codeOrganizationGradeVal,
                    codeOrganizationTooltipVal,
                    dependencyHealthGradeVal,
                    dependencyHealthTooltipVal,
                    overallGradeVal,
                    healthTimelineVal,
                    healthTrendVal,
                    dnaArchitectureVal,
                    dnaDocumentationVal,
                    dnaTestingVal,
                    dnaSecurityVal,
                    dnaBackendVal,
                    dnaFrontendVal,
                    dnaInfrastructureVal,
                    dnaDevopsVal,
                    dnaDatabaseVal,
                    dnaPerformanceVal,
                    dnaAiVal,
                    personalityTitleVal,
                    personalityTraitsVal,
                    personalityExplanationVal,
                    riskDocumentationVal,
                    riskDocumentationRecVal,
                    riskSecurityVal,
                    riskSecurityRecVal,
                    riskTestingVal,
                    riskTestingRecVal,
                    riskDependencyUpdatesVal,
                    riskDependencyUpdatesRecVal,
                    riskTechnicalDebtVal,
                    riskTechnicalDebtRecVal,
                    riskPerformanceVal,
                    riskPerformanceRecVal,
                    riskScalabilityVal,
                    riskScalabilityRecVal,
                    riskApiStabilityVal,
                    riskApiStabilityRecVal,
                    codeReviewFeedVal,
                    journeyVal,
                    recruiterBackendVal,
                    recruiterArchitectureVal,
                    recruiterTestingVal,
                    recruiterProductionVal,
                    recruiterDocumentationVal,
                    recruiterReadinessVal,
                    recruiterRecommendVal,
                    recruiterReasonVal,
                    achievementBadgesVal,
                    roadmapHighVal,
                    roadmapMediumVal,
                    roadmapLowVal
            );

            cacheService.put("resume-analysis:" + nameKey, analysis, CACHE_TTL_SECONDS);
            log.info("Successfully generated resume analysis for repository: {}", fullName);
        } catch (Exception e) {
            log.error("Failed to generate resume analysis for repository {}: {}", fullName, e.getMessage());
            jobStates.put(nameKey, JobState.FAILED);
        } finally {
            com.titansearch.config.SecurityContext.clear();
            if (jobStates.get(nameKey) == JobState.PENDING) {
                jobStates.remove(nameKey);
            }
        }
    }
}
