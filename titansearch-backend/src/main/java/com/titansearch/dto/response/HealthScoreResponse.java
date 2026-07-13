package com.titansearch.dto.response;

import java.time.Instant;
import java.util.Map;

public record HealthScoreResponse(
    Integer overallScore,
    Map<String, Integer> breakdown,
    Instant computedAt
) {}
