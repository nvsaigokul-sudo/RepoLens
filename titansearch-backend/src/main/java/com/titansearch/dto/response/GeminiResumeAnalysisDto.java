package com.titansearch.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;

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

    @JsonProperty("confidence_score") Integer confidenceScore
) {}
