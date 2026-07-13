package com.titansearch.service.analysis;

import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.repository.HealthScoreRepository;
import com.titansearch.service.github.GitHubClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthScoreService {

    private final GitHubClient gitHubClient;
    private final HealthScoreRepository healthScoreRepository;

    @Transactional
    public HealthScore calculateAndSave(Repository repository) {
        String fullName = repository.getFullName();
        String[] parts = fullName.split("/");
        if (parts.length < 2) {
            throw new IllegalArgumentException("Invalid repository full name: " + fullName);
        }
        String owner = parts[0];
        String repoName = parts[1];

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
        int docScore = HealthScoreCalculator.calculateDocumentationScore(repository.getReadmePreview(), hasContributing, hasLicense);
        int commitScore = HealthScoreCalculator.calculateCommitActivityScore(commits);
        int issuesScore = HealthScoreCalculator.calculateIssuesHealthScore(repository.getOpenIssues(), repository.getStars(), repository.getForks());
        int popularityScore = HealthScoreCalculator.calculatePopularityScore(repository.getStars(), repository.getForks());
        int maturityScore = HealthScoreCalculator.calculateMaturityScore(repository.getRepoCreatedAt());
        int overallScore = HealthScoreCalculator.calculateOverallScore(docScore, commitScore, issuesScore, popularityScore, maturityScore);

        // 4. Upsert health score record
        HealthScore healthScore = healthScoreRepository.findByRepositoryId(repository.getId())
                .orElseGet(() -> HealthScore.builder().repository(repository).build());

        healthScore.setOverallScore(overallScore);
        healthScore.setDocumentationScore(docScore);
        healthScore.setCommitActivityScore(commitScore);
        healthScore.setIssuesScore(issuesScore);
        healthScore.setPopularityScore(popularityScore);
        healthScore.setMaturityScore(maturityScore);
        healthScore.setComputedAt(Instant.now());

        return healthScoreRepository.save(healthScore);
    }
}
