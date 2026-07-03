package com.titansearch.service.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GeminiSummaryDto(
        String overview,
        String mainPurpose,
        String architectureSummary,
        String keyTechnologies,
        String learningValue
) {}
