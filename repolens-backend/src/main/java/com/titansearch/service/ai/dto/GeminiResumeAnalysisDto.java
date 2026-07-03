package com.titansearch.service.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GeminiResumeAnalysisDto(
        BigDecimal resumeScore,
        String strengths,
        String weaknesses,
        String industryRelevance,
        String suggestedImprovements
) {}
