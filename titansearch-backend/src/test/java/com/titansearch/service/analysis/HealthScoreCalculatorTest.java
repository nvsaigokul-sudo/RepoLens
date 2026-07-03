package com.titansearch.service.analysis;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HealthScoreCalculatorTest {

    @Test
    void calculateDocumentationScore_edgeCases() {
        // Empty README and no files
        assertThat(HealthScoreCalculator.calculateDocumentationScore(0, false, false)).isEqualTo(20);
        // Medium README with LICENSE/CONTRIBUTING
        assertThat(HealthScoreCalculator.calculateDocumentationScore(1500, true, true)).isEqualTo(70);
        // Large README
        assertThat(HealthScoreCalculator.calculateDocumentationScore(6000, true, true)).isEqualTo(100);
    }

    @Test
    void calculateCommitActivityScore_scaling() {
        assertThat(HealthScoreCalculator.calculateCommitActivityScore(0)).isEqualTo(0);
        assertThat(HealthScoreCalculator.calculateCommitActivityScore(10)).isEqualTo(33);
        assertThat(HealthScoreCalculator.calculateCommitActivityScore(30)).isEqualTo(100);
        assertThat(HealthScoreCalculator.calculateCommitActivityScore(100)).isEqualTo(100);
    }

    @Test
    void calculateIssuesHealthScore_scaling() {
        // No open issues
        assertThat(HealthScoreCalculator.calculateIssuesHealthScore(0, 500)).isEqualTo(100);
        // 50 open issues for 100 stars (ratio = 50 / (1+1) = 25 -> score = 75)
        assertThat(HealthScoreCalculator.calculateIssuesHealthScore(50, 100)).isEqualTo(75);
    }

    @Test
    void calculatePopularityScore_scaling() {
        assertThat(HealthScoreCalculator.calculatePopularityScore(0, 0)).isEqualTo(0);
        // stars + forks = 10 -> ln(11) * 20 = 48
        assertThat(HealthScoreCalculator.calculatePopularityScore(7, 3)).isEqualTo(48);
        // stars + forks = 150 -> ln(151) * 20 = 100
        assertThat(HealthScoreCalculator.calculatePopularityScore(100, 50)).isEqualTo(100);
    }

    @Test
    void calculateMaturityScore_scaling() {
        // Brand new
        assertThat(HealthScoreCalculator.calculateMaturityScore(1, false)).isEqualTo(40);
        // Young
        assertThat(HealthScoreCalculator.calculateMaturityScore(6, false)).isEqualTo(53);
        // Mature active
        assertThat(HealthScoreCalculator.calculateMaturityScore(24, false)).isEqualTo(100);
        // Stale mature
        assertThat(HealthScoreCalculator.calculateMaturityScore(24, true)).isEqualTo(70);
    }

    @Test
    void calculateOverallScore_weighted() {
        int overall = HealthScoreCalculator.calculateOverallScore(100, 100, 100, 100, 100);
        assertThat(overall).isEqualTo(100);

        // Weighted verification
        int mixed = HealthScoreCalculator.calculateOverallScore(80, 70, 90, 100, 60);
        // 0.25*80 + 0.25*70 + 0.15*90 + 0.20*100 + 0.15*60
        // = 20 + 17.5 + 13.5 + 20 + 9 = 80
        assertThat(mixed).isEqualTo(80);
    }
}
