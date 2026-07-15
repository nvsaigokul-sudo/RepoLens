package com.titansearch.service.analysis;

import com.titansearch.dto.response.HealthScoreResponse;
import com.titansearch.service.github.GitHubClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthScoreService {

    private final GitHubClient gitHubClient;

    public HealthScoreResponse calculateHealthScore(
            String owner, 
            String repoName, 
            String readmePreview, 
            int openIssues, 
            int stars, 
            int forks, 
            Instant repoCreatedAt) {

        // 1. Fetch directory contents to check for LICENSE and CONTRIBUTING files
        List<Map<String, Object>> contents = gitHubClient.getDirectoryContents(owner, repoName, "");
        boolean hasContributing = false;
        boolean hasLicense = false;

        for (Map<String, Object> item : contents) {
            if ("file".equals(item.get("type"))) {
                String name = ((String) item.get("name")).toLowerCase();
                if (name.contains("contributing")) {
                    hasContributing = true;
                }
                if (name.contains("license")) {
                    hasLicense = true;
                }
            }
        }

        // 2. Fetch commit count for last 90 days
        int commits = gitHubClient.getCommitsCountInLast90Days(owner, repoName);

        // 3. Compute scores using pure calculator
        int docScore = HealthScoreCalculator.calculateDocumentationScore(readmePreview, hasContributing, hasLicense);
        int commitScore = HealthScoreCalculator.calculateCommitActivityScore(commits);
        int issuesScore = HealthScoreCalculator.calculateIssuesHealthScore(openIssues, stars, forks);
        int popularityScore = HealthScoreCalculator.calculatePopularityScore(stars, forks);
        int maturityScore = HealthScoreCalculator.calculateMaturityScore(repoCreatedAt);
        int overallScore = HealthScoreCalculator.calculateOverallScore(docScore, commitScore, issuesScore, popularityScore, maturityScore);

        Map<String, Integer> breakdown = Map.of(
                "documentationScore", docScore,
                "commitActivityScore", commitScore,
                "issuesScore", issuesScore,
                "popularityScore", popularityScore,
                "maturityScore", maturityScore
        );

        return new HealthScoreResponse(
                overallScore,
                breakdown,
                Instant.now()
        );
    }
}
