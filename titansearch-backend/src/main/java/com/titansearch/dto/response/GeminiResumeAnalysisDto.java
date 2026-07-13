package com.titansearch.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record GeminiResumeAnalysisDto(
    @JsonProperty("resume_score") BigDecimal resumeScore,
    String strengths,
    String weaknesses,
    @JsonProperty("industry_relevance") String industryRelevance,
    @JsonProperty("suggested_improvements") String suggestedImprovements
) {}
