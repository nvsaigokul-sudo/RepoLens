package com.titansearch.dto.response;

import java.time.Instant;

public record AISummaryResponse(
        String overview,
        String mainPurpose,
        String architectureSummary,
        String keyTechnologies,
        String learningValue,
        String status, // "PENDING", "SUCCESS", "FAILED", "NOT_STARTED"
        Instant generatedAt
) {}
