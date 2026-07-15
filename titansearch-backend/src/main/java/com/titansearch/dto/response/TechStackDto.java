package com.titansearch.dto.response;

public record TechStackDto(
        String category,
        String technology,
        double confidence
) {}
