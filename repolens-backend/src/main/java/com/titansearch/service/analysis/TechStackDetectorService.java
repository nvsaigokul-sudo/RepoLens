package com.titansearch.service.analysis;

import com.titansearch.entity.Repository;
import com.titansearch.entity.RepoLanguage;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.github.GitHubClient;
import com.titansearch.service.github.GitHubTreeEntry;
import com.titansearch.service.github.GitHubTreeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class TechStackDetectorService {

    private final GitHubClient gitHubClient;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final RepositoryRepository repositoryRepository;

    @Transactional
    public List<TechStackDetection> detectStack(Repository repository) {
        log.info("Starting tech stack detection for repository: {}", repository.getFullName());

        // 1. Delete existing detections
        techStackDetectionRepository.deleteByRepositoryId(repository.getId());

        // 2. Fetch language breakdown and update repository
        syncLanguages(repository);

        // 3. Fetch file tree recursively
        String owner = repository.getOwner();
        String repoName = repository.getFullName().substring(repository.getFullName().indexOf('/') + 1);
        String branch = repository.getDefaultBranch() != null ? repository.getDefaultBranch() : "main";

        List<GitHubTreeEntry> treeEntries = Collections.emptyList();
        try {
            GitHubTreeResponse treeResponse = gitHubClient.getTree(owner, repoName, branch);
            if (treeResponse != null && treeResponse.tree() != null) {
                treeEntries = treeResponse.tree();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch recursive tree for {} on branch {}: {}. Falling back to master.", repository.getFullName(), branch, e.getMessage());
            try {
                GitHubTreeResponse treeResponse = gitHubClient.getTree(owner, repoName, "master");
                if (treeResponse != null && treeResponse.tree() != null) {
                    treeEntries = treeResponse.tree();
                }
            } catch (Exception ex) {
                log.error("Failed to fetch tree on fallback branch master: {}", ex.getMessage());
            }
        }

        // 4. Match signatures and calculate confidence
        Map<String, TechStackDetection> detectedMap = new HashMap<>(); // Key: Category + ":" + Technology

        // Track seen signature files to fetch contents only once
        Map<String, String> fetchedFiles = new HashMap<>();

        for (GitHubTreeEntry entry : treeEntries) {
            String path = entry.path();
            if (path == null) continue;

            // Basic directory/file check for Kubernetes (e.g. k8s/ folder or deployment file)
            if (path.contains("k8s/") || path.startsWith("k8s/")) {
                addDetection(detectedMap, repository, TechSignature.KUBERNETES.getCategory(), TechSignature.KUBERNETES.getTechnology(), 0.90);
            }

            for (TechSignature sig : TechSignature.values()) {
                if (sig.matchesFile(path)) {
                    double confidence = sig.getDefaultConfidence();

                    // If file has keywords, retrieve file content to scan for corroborating keywords
                    if (sig.getKeywords() != null && !sig.getKeywords().isEmpty()) {
                        String content = fetchedFiles.get(path);
                        if (content == null) {
                            content = gitHubClient.getRawFileContent(owner, repoName, path);
                            if (content != null) {
                                fetchedFiles.put(path, content);
                            }
                        }

                        if (content != null) {
                            boolean keywordFound = false;
                            for (String keyword : sig.getKeywords()) {
                                if (content.contains(keyword)) {
                                    keywordFound = true;
                                    break;
                                }
                            }
                            if (keywordFound) {
                                confidence = 0.95; // Boost confidence to high on keyword match
                            }
                        }
                    }

                    // Special heuristic for Kubernetes yml files in non-k8s directories
                    if (sig == TechSignature.DOCKER_COMPOSE && path.endsWith(".yaml") || path.endsWith(".yml")) {
                        String content = fetchedFiles.get(path);
                        if (content != null && content.contains("kind: Deployment")) {
                            addDetection(detectedMap, repository, TechSignature.KUBERNETES.getCategory(), TechSignature.KUBERNETES.getTechnology(), 0.90);
                        }
                    }

                    addDetection(detectedMap, repository, sig.getCategory(), sig.getTechnology(), confidence);
                }
            }
        }

        // 5. Fallback heuristics if no specific files match but primary language is detected
        if (detectedMap.isEmpty() && repository.getPrimaryLanguage() != null) {
            String primary = repository.getPrimaryLanguage().toLowerCase();
            if (primary.equals("java")) {
                addDetection(detectedMap, repository, TechSignature.SPRING_BOOT.getCategory(), "Java", 0.30);
            } else if (primary.equals("javascript") || primary.equals("typescript")) {
                addDetection(detectedMap, repository, TechSignature.NODE_JS.getCategory(), "JavaScript", 0.30);
            } else if (primary.equals("python")) {
                addDetection(detectedMap, repository, TechSignature.DJANGO.getCategory(), "Python", 0.30);
            }
        }

        List<TechStackDetection> finalDetections = new ArrayList<>(detectedMap.values());
        techStackDetectionRepository.saveAll(finalDetections);
        log.info("Saved {} tech stack detections for {}", finalDetections.size(), repository.getFullName());
        return finalDetections;
    }

    private void addDetection(Map<String, TechStackDetection> detectedMap, Repository repo, com.titansearch.entity.TechCategory category, String technology, double confidence) {
        String key = category.name() + ":" + technology;
        BigDecimal newConf = BigDecimal.valueOf(confidence).setScale(3, RoundingMode.HALF_UP);
        
        TechStackDetection existing = detectedMap.get(key);
        if (existing == null || existing.getConfidence().compareTo(newConf) < 0) {
            detectedMap.put(key, TechStackDetection.builder()
                    .repository(repo)
                    .category(category)
                    .technology(technology)
                    .confidence(newConf)
                    .build());
        }
    }

    private void syncLanguages(Repository repository) {
        try {
            String owner = repository.getOwner();
            String repoName = repository.getFullName().substring(repository.getFullName().indexOf('/') + 1);

            Map<String, Long> languages = gitHubClient.getLanguages(owner, repoName);
            if (languages == null || languages.isEmpty()) return;

            long totalBytes = languages.values().stream().mapToLong(Long::longValue).sum();
            if (totalBytes == 0) return;

            repository.getLanguages().clear();
            for (Map.Entry<String, Long> entry : languages.entrySet()) {
                double pct = (entry.getValue() * 100.0) / totalBytes;
                BigDecimal percentage = BigDecimal.valueOf(pct).setScale(2, RoundingMode.HALF_UP);

                repository.getLanguages().add(RepoLanguage.builder()
                        .repository(repository)
                        .language(entry.getKey())
                        .byteCount(entry.getValue())
                        .percentage(percentage)
                        .build());
            }
            repositoryRepository.save(repository);
            log.info("Synchronized languages for {}: totalBytes={}", repository.getFullName(), totalBytes);
        } catch (Exception e) {
            log.warn("Failed to synchronize languages for {}: {}", repository.getFullName(), e.getMessage());
        }
    }
}
