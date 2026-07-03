package com.titansearch.dto.response;

import java.math.BigDecimal;

public record SimilarRepoResponse(
        Long id,
        String fullName,
        String description,
        Integer stars,
        BigDecimal similarityScore,
        String reason
) {}
