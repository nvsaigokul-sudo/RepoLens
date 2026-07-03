package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Repository Detail", description = "Fetch and sync individual repository detail from GitHub")
public class RepositoryDetailController {

    private final RepositorySearchService repositorySearchService;

    @GetMapping("/{owner}/{repo}")
    @Operation(summary = "Get repository detail (syncs from GitHub if stale or missing)")
    public ResponseEntity<ApiEnvelope<RepositoryDetailResponse>> getDetail(
            @PathVariable String owner, @PathVariable String repo) {
        return ResponseEntity.ok(ApiEnvelope.ok(repositorySearchService.getDetail(owner, repo)));
    }
}
