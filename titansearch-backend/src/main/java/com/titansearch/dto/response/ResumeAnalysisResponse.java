package com.titansearch.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record ResumeAnalysisResponse(
        BigDecimal resumeScore,
        String strengths,
        String weaknesses,
        String industryRelevance,
        String suggestedImprovements,
        String status, // "PENDING", "SUCCESS", "FAILED", "NOT_STARTED"
        Instant generatedAt
) {}
