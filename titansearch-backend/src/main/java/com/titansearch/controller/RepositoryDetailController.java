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
@Tag(name = "Repository Detail", description = "Fetch individual repository detail from GitHub")
public class RepositoryDetailController {

    private final RepositorySearchService repositorySearchService;

    @GetMapping("/{owner}/{repo}")
    @Operation(summary = "Get repository detail live")
    public ResponseEntity<ApiEnvelope<RepositoryDetailResponse>> getDetail(
            @PathVariable String owner, @PathVariable String repo) {
        return ResponseEntity.ok(ApiEnvelope.ok(repositorySearchService.getDetail(owner, repo)));
    }

    @PostMapping("/{owner}/{repo}/sync")
    @Operation(summary = "Force re-fetch repository metadata")
    public ResponseEntity<ApiEnvelope<RepositoryDetailResponse>> forceSync(
            @PathVariable String owner, @PathVariable String repo) {
        return ResponseEntity.ok(ApiEnvelope.ok(repositorySearchService.getDetail(owner, repo)));
    }

    @GetMapping("/{owner}/{repo}/zip")
    @Operation(summary = "Download repository ZIP archive")
    public ResponseEntity<byte[]> downloadZip(
            @PathVariable String owner, @PathVariable String repo) {
        byte[] zipBytes = repositorySearchService.downloadZip(owner, repo);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + owner + "-" + repo + ".zip\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/zip")
                .body(zipBytes);
    }
}
