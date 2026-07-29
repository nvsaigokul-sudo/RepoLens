package com.titansearch.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

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

        Integer confidenceScore
) {}
