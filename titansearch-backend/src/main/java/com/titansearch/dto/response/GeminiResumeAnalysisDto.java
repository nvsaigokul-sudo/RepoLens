package com.titansearch.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record GeminiResumeAnalysisDto(
    @JsonProperty("resume_score") BigDecimal resumeScore,
    String strengths,
    String weaknesses,
    @JsonProperty("industry_relevance") String industryRelevance,
    @JsonProperty("suggested_improvements") String suggestedImprovements,

    @JsonProperty("portfolio_score") BigDecimal portfolioScore,
    @JsonProperty("portfolio_reasoning") String portfolioReasoning,
    @JsonProperty("portfolio_contributors") List<String> portfolioContributors,

    @JsonProperty("maintainability_score") Integer maintainabilityScore,
    @JsonProperty("maintainability_reasoning") String maintainabilityReasoning,
    @JsonProperty("maintainability_contributors") List<String> maintainabilityContributors,

    @JsonProperty("code_quality_score") Integer codeQualityScore,
    @JsonProperty("code_quality_reasoning") String codeQualityReasoning,
    @JsonProperty("code_quality_contributors") List<String> codeQualityContributors,

    @JsonProperty("overall_health_score") Integer overallHealthScore,
    @JsonProperty("overall_health_reasoning") String overallHealthReasoning,
    @JsonProperty("overall_health_contributors") List<String> overallHealthContributors,

    @JsonProperty("confidence_score") Integer confidenceScore,

    // Report Card
    @JsonProperty("architecture_grade") String architectureGrade,
    @JsonProperty("architecture_tooltip") String architectureTooltip,
    @JsonProperty("maintainability_grade") String maintainabilityGrade,
    @JsonProperty("maintainability_tooltip") String maintainabilityTooltip,
    @JsonProperty("documentation_grade") String documentationGrade,
    @JsonProperty("documentation_tooltip") String documentationTooltip,
    @JsonProperty("testing_grade") String testingGrade,
    @JsonProperty("testing_tooltip") String testingTooltip,
    @JsonProperty("security_grade") String securityGrade,
    @JsonProperty("security_tooltip") String securityTooltip,
    @JsonProperty("scalability_grade") String scalabilityGrade,
    @JsonProperty("scalability_tooltip") String scalabilityTooltip,
    @JsonProperty("code_organization_grade") String codeOrganizationGrade,
    @JsonProperty("code_organization_tooltip") String codeOrganizationTooltip,
    @JsonProperty("dependency_health_grade") String dependencyHealthGrade,
    @JsonProperty("dependency_health_tooltip") String dependencyHealthTooltip,
    @JsonProperty("overall_grade") String overallGrade,

    // Timeline
    @JsonProperty("health_timeline") List<Map<String, Object>> healthTimeline,
    @JsonProperty("health_trend") String healthTrend,

    // DNA
    @JsonProperty("dna_architecture") Integer dnaArchitecture,
    @JsonProperty("dna_documentation") Integer dnaDocumentation,
    @JsonProperty("dna_testing") Integer dnaTesting,
    @JsonProperty("dna_security") Integer dnaSecurity,
    @JsonProperty("dna_backend") Integer dnaBackend,
    @JsonProperty("dna_frontend") Integer dnaFrontend,
    @JsonProperty("dna_infrastructure") Integer dnaInfrastructure,
    @JsonProperty("dna_devops") Integer dnaDevops,
    @JsonProperty("dna_database") Integer dnaDatabase,
    @JsonProperty("dna_performance") Integer dnaPerformance,
    @JsonProperty("dna_ai") Integer dnaAi,

    // Personality
    @JsonProperty("personality_title") String personalityTitle,
    @JsonProperty("personality_traits") List<String> personalityTraits,
    @JsonProperty("personality_explanation") String personalityExplanation,

    // Risk Radar
    @JsonProperty("risk_documentation") String riskDocumentation,
    @JsonProperty("risk_documentation_rec") String riskDocumentationRec,
    @JsonProperty("risk_security") String riskSecurity,
    @JsonProperty("risk_security_rec") String riskSecurityRec,
    @JsonProperty("risk_testing") String riskTesting,
    @JsonProperty("risk_testing_rec") String riskTestingRec,
    @JsonProperty("risk_dependency_updates") String riskDependencyUpdates,
    @JsonProperty("risk_dependency_updates_rec") String riskDependencyUpdatesRec,
    @JsonProperty("risk_technical_debt") String riskTechnicalDebt,
    @JsonProperty("risk_technical_debt_rec") String riskTechnicalDebtRec,
    @JsonProperty("risk_performance") String riskPerformance,
    @JsonProperty("risk_performance_rec") String riskPerformanceRec,
    @JsonProperty("risk_scalability") String riskScalability,
    @JsonProperty("risk_scalability_rec") String riskScalabilityRec,
    @JsonProperty("risk_api_stability") String riskApiStability,
    @JsonProperty("risk_api_stability_rec") String riskApiStabilityRec,

    // Code Review Feed
    @JsonProperty("code_review_feed") List<Map<String, Object>> codeReviewFeed,

    // Journey
    @JsonProperty("journey") List<Map<String, Object>> journey,

    // Recruiter Skill Radar
    @JsonProperty("recruiter_backend") Integer recruiterBackend,
    @JsonProperty("recruiter_architecture") Integer recruiterArchitecture,
    @JsonProperty("recruiter_testing") Integer recruiterTesting,
    @JsonProperty("recruiter_production") Integer recruiterProduction,
    @JsonProperty("recruiter_documentation") Integer recruiterDocumentation,
    @JsonProperty("recruiter_readiness") Integer recruiterReadiness,
    @JsonProperty("recruiter_recommend") Boolean recruiterRecommend,
    @JsonProperty("recruiter_reason") String recruiterReason,

    // Badges
    @JsonProperty("achievement_badges") List<String> achievementBadges,

    // Roadmap
    @JsonProperty("roadmap_high") List<String> roadmapHigh,
    @JsonProperty("roadmap_medium") List<String> roadmapMedium,
    @JsonProperty("roadmap_low") List<String> roadmapLow
) {}
