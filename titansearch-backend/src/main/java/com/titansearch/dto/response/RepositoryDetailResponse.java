package com.titansearch.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record RepositoryDetailResponse(
        Long id,
        String fullName,
        String owner,
        String description,
        Integer stars,
        Integer forks,
        Integer openIssues,
        String primaryLanguage,
        String readmePreview,
        List<String> topics,
        Map<String, Double> languageBreakdown,
        Instant repoCreatedAt,
        Instant repoPushedAt
) {}
