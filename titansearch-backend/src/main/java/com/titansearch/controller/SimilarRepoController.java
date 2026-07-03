package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.SimilarRepoResponse;
import com.titansearch.entity.Repository;
import com.titansearch.entity.SimilarRepository;
import com.titansearch.service.cache.CacheService;
import com.titansearch.service.recommendation.SimilarityRecommendationService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Similarity Recommendation", description = "Endpoints for discovering similar repositories")
@Slf4j
public class SimilarRepoController {

    private final SimilarityRecommendationService similarityRecommendationService;
    private final RepositorySearchService repositorySearchService;
    private final CacheService cacheService;

    @GetMapping("/{owner}/{repo}/similar")
    @Operation(summary = "Get similar repositories (computed on-demand and cached, no AI cost)")
    public ResponseEntity<ApiEnvelope<List<SimilarRepoResponse>>> getSimilar(
            @PathVariable String owner, @PathVariable String repo) {

        String cacheKey = "similar-repos:" + owner.toLowerCase() + ":" + repo.toLowerCase();

        // 1. Try Cache
        SimilarRepoResponse[] cached = cacheService.get(cacheKey, SimilarRepoResponse[].class);
        if (cached != null) {
            log.info("Cache hit for similar-repos {}/{}", owner, repo);
            return ResponseEntity.ok(ApiEnvelope.ok(Arrays.asList(cached)));
        }

        log.info("Cache miss for similar-repos {}/{}", owner, repo);
        Repository repository = repositorySearchService.getOrCreateRepository(owner, repo);

        List<SimilarRepository> recs = similarityRecommendationService.getRecommendations(repository);

        List<SimilarRepoResponse> response = recs.stream()
                .map(r -> new SimilarRepoResponse(
                        r.getSimilarRepository().getId(),
                        r.getSimilarRepository().getFullName(),
                        r.getSimilarRepository().getDescription(),
                        r.getSimilarRepository().getStars(),
                        r.getSimilarityScore(),
                        r.getReason()
                ))
                .toList();

        // Cache for 24h (86400 seconds)
        cacheService.put(cacheKey, response, 86400);

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
