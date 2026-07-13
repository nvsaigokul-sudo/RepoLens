package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.entity.Repository;
import com.titansearch.entity.SimilarRepository;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.service.github.GitHubSyncService;
import com.titansearch.service.recommendation.SimilarityRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Similar Repositories", description = "Get similar repositories recommendations based on tech stack and topics")
public class SimilarRepoController {

    private final RepositoryRepository repositoryRepository;
    private final GitHubSyncService gitHubSyncService;
    private final SimilarityRecommendationService similarityRecommendationService;

    @GetMapping("/{owner}/{repo}/similar")
    @Operation(summary = "Get similar repositories recommendations (Jaccard similarity, no AI cost)")
    public ResponseEntity<ApiEnvelope<List<Map<String, Object>>>> getSimilar(
            @PathVariable String owner, @PathVariable String repo) {

        String fullName = owner + "/" + repo;
        Repository repository = repositoryRepository.findByFullNameIgnoreCase(fullName)
                .orElseGet(() -> gitHubSyncService.syncByOwnerAndName(owner, repo));

        List<SimilarRepository> recs = similarityRecommendationService.getSimilarRepositories(repository);

        List<Map<String, Object>> response = recs.stream()
                .map(r -> Map.<String, Object>of(
                        "id", r.getSimilarRepository().getId(),
                        "fullName", r.getSimilarRepository().getFullName(),
                        "owner", r.getSimilarRepository().getOwner(),
                        "description", r.getSimilarRepository().getDescription() != null ? r.getSimilarRepository().getDescription() : "",
                        "stars", r.getSimilarRepository().getStars(),
                        "forks", r.getSimilarRepository().getForks(),
                        "primaryLanguage", r.getSimilarRepository().getPrimaryLanguage() != null ? r.getSimilarRepository().getPrimaryLanguage() : "",
                        "similarityScore", r.getSimilarityScore(),
                        "reason", r.getReason() != null ? r.getReason() : ""
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
