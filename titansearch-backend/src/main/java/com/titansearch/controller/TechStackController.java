package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.TechStackDto;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Tech Stack", description = "Detect and list technology signatures")
public class TechStackController {

    private final RepositorySearchService repositorySearchService;
    private final TechStackDetectorService techStackDetectorService;

    @GetMapping("/{owner}/{repo}/tech-stack")
    @Operation(summary = "Get repository tech stack (runs live detection)")
    public ResponseEntity<ApiEnvelope<List<TechStackDto>>> getTechStack(
            @PathVariable String owner, @PathVariable String repo) {
        
        RepositoryDetailResponse detail = repositorySearchService.getDetail(owner, repo);
        List<TechStackDto> detections = techStackDetectorService.detectTechStack(
                owner, repo, detail.primaryLanguage(), detail.description());

        return ResponseEntity.ok(ApiEnvelope.ok(detections));
    }
}
