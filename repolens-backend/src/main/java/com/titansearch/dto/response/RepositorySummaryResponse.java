package com.titansearch.dto.response;

import java.time.Instant;
import java.util.List;

public record RepositorySummaryResponse(
        Long id,
        String fullName,
        String owner,
        String description,
        Integer stars,
        Integer forks,
        List<String> topics,
        Instant lastUpdated
) {}
