package com.titansearch.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record RepositorySearchRequest(
        @Size(min = 2, max = 100) String q,
        String language,
        @Min(0) Integer minStars,
        @Min(0) Integer page,
        @Min(1) Integer size
) {
    public RepositorySearchRequest {
        if (page == null) page = 0;
        if (size == null) size = 20;
        if (size > 100) size = 100;
    }
}
