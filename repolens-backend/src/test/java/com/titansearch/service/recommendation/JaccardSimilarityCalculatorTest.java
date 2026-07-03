package com.titansearch.service.recommendation;

import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class JaccardSimilarityCalculatorTest {

    @Test
    void calculate_nullOrEmpty_returnsZero() {
        assertThat(JaccardSimilarityCalculator.calculate(null, Set.of("java"))).isEqualTo(0.0);
        assertThat(JaccardSimilarityCalculator.calculate(Set.of("java"), null)).isEqualTo(0.0);
        assertThat(JaccardSimilarityCalculator.calculate(Collections.emptySet(), Set.of("java"))).isEqualTo(0.0);
    }

    @Test
    void calculate_noOverlap_returnsZero() {
        Set<String> setA = Set.of("java", "spring-boot");
        Set<String> setB = Set.of("python", "django");
        assertThat(JaccardSimilarityCalculator.calculate(setA, setB)).isEqualTo(0.0);
    }

    @Test
    void calculate_partialOverlap_returnsIntersectionOverUnion() {
        Set<String> setA = Set.of("java", "spring-boot", "postgres");
        Set<String> setB = Set.of("java", "react", "postgres");

        // Intersection: [java, postgres] (size = 2)
        // Union: [java, spring-boot, postgres, react] (size = 4)
        // Jaccard = 2 / 4 = 0.5
        assertThat(JaccardSimilarityCalculator.calculate(setA, setB)).isEqualTo(0.5);
    }

    @Test
    void calculate_exactMatch_returnsOne() {
        Set<String> setA = Set.of("java", "spring-boot");
        Set<String> setB = Set.of("java", "spring-boot");
        assertThat(JaccardSimilarityCalculator.calculate(setA, setB)).isEqualTo(1.0);
    }
}
