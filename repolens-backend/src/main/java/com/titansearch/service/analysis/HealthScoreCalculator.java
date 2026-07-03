package com.titansearch.service.analysis;

public class HealthScoreCalculator {

    public static int calculateDocumentationScore(int readmeLength, boolean hasContributing, boolean hasLicense) {
        int score = 0;
        if (readmeLength < 500) {
            score += 20;
        } else if (readmeLength < 2000) {
            score += 50;
        } else if (readmeLength < 5000) {
            score += 70;
        } else {
            score += 80;
        }

        if (hasContributing) {
            score += 10;
        }
        if (hasLicense) {
            score += 10;
        }

        return Math.min(100, Math.max(0, score));
    }

    public static int calculateCommitActivityScore(int commitsInLast90Days) {
        // Assume 30+ commits in 90 days is a highly active project (score = 100)
        double score = commitsInLast90Days * 3.333;
        return (int) Math.min(100.0, Math.max(0.0, Math.round(score)));
    }

    public static int calculateIssuesHealthScore(int openIssues, int stars) {
        if (openIssues == 0) {
            return 100;
        }
        double ratio = (double) openIssues / ((double) stars / 100.0 + 1.0);
        double score = 100.0 - ratio;
        return (int) Math.min(100.0, Math.max(0.0, Math.round(score)));
    }

    public static int calculatePopularityScore(int stars, int forks) {
        int total = stars + forks;
        if (total == 0) {
            return 0;
        }
        // Using logarithmic scaling: 20 * ln(total + 1)
        double score = 20.0 * Math.log(total + 1.0);
        return (int) Math.min(100.0, Math.max(0.0, Math.round(score)));
    }

    public static int calculateMaturityScore(long ageInMonths, boolean isStale) {
        int score;
        if (ageInMonths < 3) {
            score = 40;
        } else if (ageInMonths < 12) {
            score = 40 + (int) ((ageInMonths - 3) * (40.0 / 9.0));
        } else if (ageInMonths <= 60) {
            score = 100;
        } else if (ageInMonths <= 120) {
            score = 90;
        } else {
            score = 70;
        }

        // Penalize completely stale repos (no commit in last 12 months)
        if (isStale) {
            score -= 30;
        }

        return Math.min(100, Math.max(0, score));
    }

    public static int calculateOverallScore(int doc, int commit, int issues, int pop, int maturity) {
        double overall = 0.25 * doc + 0.25 * commit + 0.15 * issues + 0.20 * pop + 0.15 * maturity;
        return (int) Math.min(100.0, Math.max(0.0, Math.round(overall)));
    }
}
