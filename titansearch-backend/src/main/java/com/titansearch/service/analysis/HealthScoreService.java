package com.titansearch.service.analysis;

import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.repository.HealthScoreRepository;
import com.titansearch.service.github.GitHubClient;
import com.titansearch.service.github.GitHubTreeEntry;
import com.titansearch.service.github.GitHubTreeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthScoreService {

    private final GitHubClient gitHubClient;
    private final HealthScoreRepository healthScoreRepository;

    @Transactional
    public HealthScore computeHealthScore(Repository repository) {
        log.info("Computing health score for repository: {}", repository.getFullName());

        // 1. Delete existing score
        healthScoreRepository.deleteByRepositoryId(repository.getId());

        String owner = repository.getOwner();
        String repoName = repository.getFullName().substring(repository.getFullName().indexOf('/') + 1);

        // 2. Fetch commit count in last 90 days
        Instant since = Instant.now().minus(90, ChronoUnit.DAYS);
        int commitsCount = gitHubClient.getCommitCountSince(owner, repoName, since);

        // 3. Scan tree for contributing and license files
        boolean hasContributing = false;
        boolean hasLicense = false;
        String branch = repository.getDefaultBranch() != null ? repository.getDefaultBranch() : "main";

        List<GitHubTreeEntry> treeEntries = Collections.emptyList();
        try {
            GitHubTreeResponse treeResponse = gitHubClient.getTree(owner, repoName, branch);
            if (treeResponse != null && treeResponse.tree() != null) {
                treeEntries = treeResponse.tree();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch tree during health score calculation: {}", e.getMessage());
            try {
                GitHubTreeResponse treeResponse = gitHubClient.getTree(owner, repoName, "master");
                if (treeResponse != null && treeResponse.tree() != null) {
                    treeEntries = treeResponse.tree();
                }
            } catch (Exception ex) {
                log.error("Failed fallback tree fetch: {}", ex.getMessage());
            }
        }

        for (GitHubTreeEntry entry : treeEntries) {
            String path = entry.path().toLowerCase();
            if (path.contains("contributing")) {
                hasContributing = true;
            }
            if (path.contains("license") || path.contains("copying")) {
                hasLicense = true;
            }
        }

        // 4. Calculate scores
        int readmeLength = repository.getReadmePreview() != null ? repository.getReadmePreview().length() : 0;
        int docScore = HealthScoreCalculator.calculateDocumentationScore(readmeLength, hasContributing, hasLicense);
        int commitScore = HealthScoreCalculator.calculateCommitActivityScore(commitsCount);
        int issuesScore = HealthScoreCalculator.calculateIssuesHealthScore(
                repository.getOpenIssues() != null ? repository.getOpenIssues() : 0,
                repository.getStars() != null ? repository.getStars() : 0
        );
        int popularityScore = HealthScoreCalculator.calculatePopularityScore(
                repository.getStars() != null ? repository.getStars() : 0,
                repository.getForks() != null ? repository.getForks() : 0
        );

        Instant createdAt = repository.getRepoCreatedAt() != null ? repository.getRepoCreatedAt() : Instant.now();
        long ageInMonths = ChronoUnit.MONTHS.between(createdAt, Instant.now());
        
        Instant pushed = repository.getRepoPushedAt();
        boolean isStale = pushed == null || pushed.plus(365, ChronoUnit.DAYS).isBefore(Instant.now());
        int maturityScore = HealthScoreCalculator.calculateMaturityScore(ageInMonths, isStale);

        int overall = HealthScoreCalculator.calculateOverallScore(docScore, commitScore, issuesScore, popularityScore, maturityScore);

        // 5. Build and save score entity
        HealthScore healthScore = HealthScore.builder()
                .repository(repository)
                .overallScore(overall)
                .documentationScore(docScore)
                .commitActivityScore(commitScore)
                .issuesScore(issuesScore)
                .popularityScore(popularityScore)
                .maturityScore(maturityScore)
                .build();

        return healthScoreRepository.save(healthScore);
    }
}
