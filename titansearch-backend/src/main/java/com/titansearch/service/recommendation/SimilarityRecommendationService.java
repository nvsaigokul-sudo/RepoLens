package com.titansearch.service.recommendation;

import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.TechStackDto;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.github.GitHubClient;
import com.titansearch.service.github.GitHubRepoDto;
import com.titansearch.service.github.GitHubSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SimilarityRecommendationService {

    private final GitHubClient gitHubClient;
    private final TechStackDetectorService techStackDetectorService;

    public List<Map<String, Object>> getSimilarRepositories(RepositoryDetailResponse target) {
        List<Map<String, Object>> recommendations = new ArrayList<>();

        List<TechStackDto> targetDetections = techStackDetectorService.detectTechStack(
                target.owner(), target.fullName().split("/")[1], target.primaryLanguage(), target.description());
        Map<String, Double> featuresA = getFeatures(target.topics(), targetDetections);
        if (featuresA.isEmpty()) {
            return recommendations;
        }

        String query = "language:" + (target.primaryLanguage() != null ? target.primaryLanguage() : "Java") + " stars:>=50";
        GitHubSearchResponse response;
        try {
            response = gitHubClient.searchRepositories(query, 0, 15);
        } catch (Exception e) {
            log.error("Failed to fetch similar repo candidates: {}", e.getMessage());
            return recommendations;
        }

        for (GitHubRepoDto candidate : response.items()) {
            if (candidate.fullName().equalsIgnoreCase(target.fullName())) {
                continue;
            }

            String candOwner = candidate.fullName().split("/")[0];
            String candName = candidate.fullName().split("/")[1];
            List<TechStackDto> candDetections = techStackDetectorService.detectTechStack(
                    candOwner, candName, candidate.language(), candidate.description());

            Map<String, Double> featuresB = getFeatures(candidate.topics(), candDetections);
            double similarity = calculateWeightedJaccard(featuresA, featuresB);

            if (similarity > 0.01) {
                recommendations.add(Map.of(
                        "id", candidate.id(),
                        "fullName", candidate.fullName(),
                        "owner", candOwner,
                        "description", candidate.description() != null ? candidate.description() : "",
                        "stars", candidate.stars() != null ? candidate.stars() : 0,
                        "forks", candidate.forks() != null ? candidate.forks() : 0,
                        "primaryLanguage", candidate.language() != null ? candidate.language() : "",
                        "similarityScore", Math.round(similarity * 100.0) / 100.0,
                        "reason", generateReason(featuresA, featuresB)
                ));
            }
        }

        recommendations.sort((r1, r2) -> Double.compare((double) r2.get("similarityScore"), (double) r1.get("similarityScore")));
        return recommendations.stream().limit(5).toList();
    }

    private Map<String, Double> getFeatures(List<String> topics, List<TechStackDto> detections) {
        Map<String, Double> features = new HashMap<>();
        if (topics != null) {
            for (String t : topics) {
                features.put(t.toLowerCase(), 1.0);
            }
        }
        if (detections != null) {
            for (TechStackDto d : detections) {
                features.put(d.technology().toLowerCase(), 2.0);
            }
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
