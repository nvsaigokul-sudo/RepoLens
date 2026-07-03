package com.titansearch.service.recommendation;

import com.titansearch.entity.Repository;
import com.titansearch.entity.SimilarRepository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.repository.SimilarRepositoryRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SimilarityRecommendationService {

    private final RepositoryRepository repositoryRepository;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final SimilarRepositoryRepository similarRepositoryRepository;

    @Transactional
    public List<SimilarRepository> getRecommendations(Repository repository) {
        log.info("Fetching recommendations for repository: {}", repository.getFullName());

        List<SimilarRepository> existing = similarRepositoryRepository
                .findByRepositoryIdOrderBySimilarityScoreDesc(repository.getId());

        if (!existing.isEmpty()) {
            return existing;
        }

        log.info("Calculating recommendations on-demand for: {}", repository.getFullName());

        // 1. Gather features for current repo (topics + technology tags)
        Set<String> thisFeatures = new HashSet<>();
        if (repository.getTopics() != null) {
            repository.getTopics().forEach(t -> thisFeatures.add(t.getTopic().toLowerCase()));
        }
        List<TechStackDetection> thisTech = techStackDetectionRepository.findByRepositoryId(repository.getId());
        thisTech.forEach(d -> thisFeatures.add(d.getTechnology().toLowerCase()));

        // 2. Fetch all other repositories
        List<Repository> allRepos = repositoryRepository.findAll();
        List<SimilarRepository> calculated = new ArrayList<>();

        for (Repository other : allRepos) {
            if (other.getId().equals(repository.getId())) {
                continue;
            }

            Set<String> otherFeatures = new HashSet<>();
            if (other.getTopics() != null) {
                other.getTopics().forEach(t -> otherFeatures.add(t.getTopic().toLowerCase()));
            }
            List<TechStackDetection> otherTech = techStackDetectionRepository.findByRepositoryId(other.getId());
            otherTech.forEach(d -> otherFeatures.add(d.getTechnology().toLowerCase()));

            double score = JaccardSimilarityCalculator.calculate(thisFeatures, otherFeatures);

            if (score > 0.05) {
                // Determine overlapping features for user feedback reason
                Set<String> overlaps = new HashSet<>(thisFeatures);
                overlaps.retainAll(otherFeatures);
                String reason = "Matches on: " + overlaps.stream().limit(3).collect(Collectors.joining(", "));

                SimilarRepository rec = SimilarRepository.builder()
                        .repository(repository)
                        .similarRepository(other)
                        .similarityScore(BigDecimal.valueOf(score).setScale(3, RoundingMode.HALF_UP))
                        .reason(reason)
                        .build();
                calculated.add(rec);
            }
        }

        // 3. Sort, limit to top 5, and persist
        calculated.sort(Comparator.comparing(SimilarRepository::getSimilarityScore).reversed());
        List<SimilarRepository> persisted = calculated.stream().limit(5).toList();

        if (!persisted.isEmpty()) {
            similarRepositoryRepository.saveAll(persisted);
            log.info("Saved {} similar repositories for {}", persisted.size(), repository.getFullName());
        }

        return persisted;
    }
}
