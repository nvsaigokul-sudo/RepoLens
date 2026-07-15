package com.titansearch.dto.response;

import java.time.Instant;
import java.util.List;

public record ResumeAnalysisPojo(
        int resumeScore,
        List<String> strengths,
        List<String> weaknesses,
        String industryRelevance,
        List<String> suggestedImprovements,
        Instant generatedAt
) {}
