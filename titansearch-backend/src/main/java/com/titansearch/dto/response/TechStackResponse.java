package com.titansearch.dto.response;

import com.titansearch.entity.TechCategory;
import java.math.BigDecimal;

public record TechStackResponse(
        TechCategory category,
        String technology,
        BigDecimal confidence
) {}
