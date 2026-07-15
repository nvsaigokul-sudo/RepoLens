package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.service.recommendation.SimilarityRecommendationService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Similar Repositories", description = "Get similar repositories recommendations based on tech stack and topics")
public class SimilarRepoController {

    private final RepositorySearchService repositorySearchService;
    private final SimilarityRecommendationService similarityRecommendationService;

    @GetMapping("/{owner}/{repo}/similar")
    @Operation(summary = "Get similar repositories recommendations (Jaccard similarity, live)")
    public ResponseEntity<ApiEnvelope<List<Map<String, Object>>>> getSimilar(
            @PathVariable String owner, @PathVariable String repo) {

        RepositoryDetailResponse detail = repositorySearchService.getDetail(owner, repo);
        List<Map<String, Object>> response = similarityRecommendationService.getSimilarRepositories(detail);

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
