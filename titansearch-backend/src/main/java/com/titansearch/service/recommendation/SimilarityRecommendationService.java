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
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SimilarityRecommendationService {

    private final RepositoryRepository repositoryRepository;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final SimilarRepositoryRepository similarRepositoryRepository;

    @Transactional
    public List<SimilarRepository> calculateAndSaveSimilar(Repository repository) {
        // Clear old recommendations
        similarRepositoryRepository.deleteByRepositoryId(repository.getId());

        List<Repository> allRepos = repositoryRepository.findAll();
        List<SimilarRepository> recommendations = new ArrayList<>();

        Map<String, Double> featuresA = getFeatures(repository);
        if (featuresA.isEmpty()) {
            return recommendations;
        }

        for (Repository other : allRepos) {
            if (other.getId().equals(repository.getId())) {
                continue;
            }

            Map<String, Double> featuresB = getFeatures(other);
            double similarity = calculateWeightedJaccard(featuresA, featuresB);

            if (similarity > 0.01) { // Threshold to consider similar
                SimilarRepository rec = SimilarRepository.builder()
                        .repository(repository)
                        .similarRepository(other)
                        .similarityScore(BigDecimal.valueOf(similarity))
                        .reason(generateReason(featuresA, featuresB))
                        .build();
                recommendations.add(rec);
            }
        }

        // Sort by score desc, limit to top 5
        recommendations.sort((r1, r2) -> r2.getSimilarityScore().compareTo(r1.getSimilarityScore()));
        List<SimilarRepository> topRecs = recommendations.stream().limit(5).toList();

        return similarRepositoryRepository.saveAll(topRecs);
    }

    public List<SimilarRepository> getSimilarRepositories(Repository repository) {
        List<SimilarRepository> recs = similarRepositoryRepository.findByRepositoryIdOrderBySimilarityScoreDesc(repository.getId());
        if (recs.isEmpty()) {
            return calculateAndSaveSimilar(repository);
        }
        return recs;
    }

    private Map<String, Double> getFeatures(Repository repo) {
        Map<String, Double> features = new HashMap<>();

        // Add topics (weight 1.0)
        if (repo.getTopics() != null) {
            for (var t : repo.getTopics()) {
                features.put(t.getTopic().toLowerCase(), 1.0);
            }
        }

        // Add tech stack detections (weight 2.0, overwriting topic weight if duplicate)
        List<TechStackDetection> detections = techStackDetectionRepository.findByRepositoryId(repo.getId());
        for (TechStackDetection d : detections) {
            features.put(d.getTechnology().toLowerCase(), 2.0);
        }

        return features;
    }

    private double calculateWeightedJaccard(Map<String, Double> featuresA, Map<String, Double> featuresB) {
        Set<String> unionKeys = new HashSet<>(featuresA.keySet());
        unionKeys.addAll(featuresB.keySet());

        double intersectionSum = 0.0;
        double unionSum = 0.0;

        for (String key : unionKeys) {
            Double valA = featuresA.get(key);
            Double valB = featuresB.get(key);

            if (valA != null && valB != null) {
                intersectionSum += Math.min(valA, valB);
                unionSum += Math.max(valA, valB);
            } else {
                unionSum += (valA != null) ? valA : valB;
            }
        }

        return unionSum == 0.0 ? 0.0 : intersectionSum / unionSum;
    }

    private String generateReason(Map<String, Double> featuresA, Map<String, Double> featuresB) {
        List<String> common = new ArrayList<>();
        for (String key : featuresA.keySet()) {
            if (featuresB.containsKey(key)) {
                // Capitalize key for readability
                common.add(key.substring(0, 1).toUpperCase() + key.substring(1));
            }
        }
        if (common.isEmpty()) {
            return "Similar topics.";
        }
        int size = common.size();
        if (size <= 2) {
            return "Shared usage of " + String.join(" and ", common);
        }
        return "Shared usage of " + common.get(0) + ", " + common.get(1) + ", and " + (size - 2) + " other technologies/topics";
    }
}
