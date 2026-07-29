package com.titansearch.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ResumeAnalysisPojo(
        int resumeScore,
        List<String> strengths,
        List<String> weaknesses,
        String industryRelevance,
        List<String> suggestedImprovements,
        Instant generatedAt,

        BigDecimal portfolioScore,
        String portfolioReasoning,
        List<String> portfolioContributors,

        Integer maintainabilityScore,
        String maintainabilityReasoning,
        List<String> maintainabilityContributors,

        Integer codeQualityScore,
        String codeQualityReasoning,
        List<String> codeQualityContributors,

        Integer overallHealthScore,
        String overallHealthReasoning,
        List<String> overallHealthContributors,

        Integer confidenceScore,

        // Report Card
        String architectureGrade,
        String architectureTooltip,
        String maintainabilityGrade,
        String maintainabilityTooltip,
        String documentationGrade,
        String documentationTooltip,
        String testingGrade,
        String testingTooltip,
        String securityGrade,
        String securityTooltip,
        String scalabilityGrade,
        String scalabilityTooltip,
        String codeOrganizationGrade,
        String codeOrganizationTooltip,
        String dependencyHealthGrade,
        String dependencyHealthTooltip,
        String overallGrade,

        // Timeline
        List<Map<String, Object>> healthTimeline,
        String healthTrend,

        // DNA
        Integer dnaArchitecture,
        Integer dnaDocumentation,
        Integer dnaTesting,
        Integer dnaSecurity,
        Integer dnaBackend,
        Integer dnaFrontend,
        Integer dnaInfrastructure,
        Integer dnaDevops,
        Integer dnaDatabase,
        Integer dnaPerformance,
        Integer dnaAi,

        // Personality
        String personalityTitle,
        List<String> personalityTraits,
        String personalityExplanation,

        // Risk Radar
        String riskDocumentation,
        String riskDocumentationRec,
        String riskSecurity,
        String riskSecurityRec,
        String riskTesting,
        String riskTestingRec,
        String riskDependencyUpdates,
        String riskDependencyUpdatesRec,
        String riskTechnicalDebt,
        String riskTechnicalDebtRec,
        String riskPerformance,
        String riskPerformanceRec,
        String riskScalability,
        String riskScalabilityRec,
        String riskApiStability,
        String riskApiStabilityRec,

        // Code Review Feed
        List<Map<String, Object>> codeReviewFeed,

        // Journey
        List<Map<String, Object>> journey,

        // Recruiter Skill Radar
        Integer recruiterBackend,
        Integer recruiterArchitecture,
        Integer recruiterTesting,
        Integer recruiterProduction,
        Integer recruiterDocumentation,
        Integer recruiterReadiness,
        Boolean recruiterRecommend,
        String recruiterReason,

        // Badges
        List<String> achievementBadges,

        // Roadmap
        List<String> roadmapHigh,
        List<String> roadmapMedium,
        List<String> roadmapLow
) {}
