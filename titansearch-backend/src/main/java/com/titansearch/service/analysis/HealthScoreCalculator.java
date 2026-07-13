package com.titansearch.service.analysis;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

public class HealthScoreCalculator {

    public static int calculateDocumentationScore(String readmeText, boolean hasContributing, boolean hasLicense) {
        int score = 0;
        if (readmeText != null && !readmeText.isBlank()) {
            int length = readmeText.length();
            if (length > 2000) {
                score += 80;
            } else {
                score += (int) (80.0 * (length / 2000.0));
            }
        }
        if (hasContributing) {
            score += 10;
        }
        if (hasLicense) {
            score += 10;
        }
        return Math.clamp(score, 0, 100);
    }

    public static int calculateCommitActivityScore(int commitsInLast90Days) {
        // 50 or more commits in 90 days gets 100 score, proportional otherwise
        return Math.clamp(commitsInLast90Days * 2, 0, 100);
    }

    public static int calculateIssuesHealthScore(int openIssues, int stars, int forks) {
        if (openIssues == 0) {
            return 100;
        }
        // Penalize based on open issues relative to stars and forks
        double ratio = (double) openIssues / (stars + forks + 1);
        int penalty = (int) (ratio * 100.0);
        return Math.clamp(100 - penalty, 0, 100);
    }

    public static int calculatePopularityScore(int stars, int forks) {
        // Log-scaled: 100k+ stars/forks is 100, 10k is 80, 1k is 60, 100 is 40, etc.
        double logVal = Math.log10(stars + forks + 1);
        int score = (int) ((logVal / 5.0) * 100.0);
        return Math.clamp(score, 0, 100);
    }

    public static int calculateMaturityScore(Instant repoCreatedAt) {
        if (repoCreatedAt == null) {
            return 0;
        }
        long days = ChronoUnit.DAYS.between(repoCreatedAt, Instant.now());
        // 2 years (730 days) is 100 score, proportional otherwise
        int score = (int) ((days / 730.0) * 100.0);
        return Math.clamp(score, 0, 100);
    }

    public static int calculateOverallScore(int doc, int commit, int issues, int pop, int maturity) {
        double overall = 0.25 * doc + 0.25 * commit + 0.15 * issues + 0.20 * pop + 0.15 * maturity;
        return (int) Math.round(overall);
    }
}
