package com.titansearch.dto.response;

import java.time.Instant;

public record AISummaryPojo(
        Long id,
        String overview,
        String mainPurpose,
        String architectureSummary,
        String keyTechnologies,
        String learningValue,
        String modelVersion,
        Instant generatedAt
) {}
