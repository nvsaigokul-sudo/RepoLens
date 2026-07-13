package com.titansearch.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GeminiSummaryDto(
    String overview,
    @JsonProperty("main_purpose") String mainPurpose,
    @JsonProperty("architecture_summary") String architectureSummary,
    @JsonProperty("key_technologies") String keyTechnologies,
    @JsonProperty("learning_value") String learningValue
) {}
