package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.TechStackResponse;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.cache.CacheService;
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
@Tag(name = "Tech Stack Detection", description = "Endpoints for scanning and retrieving technology stacks")
@Slf4j
public class TechStackController {

    private final TechStackDetectorService techStackDetectorService;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final RepositorySearchService repositorySearchService;
    private final CacheService cacheService;

    @GetMapping("/{owner}/{repo}/tech-stack")
    @Operation(summary = "Get repository tech stack detection (triggers detection if not run, cached 24h)")
    public ResponseEntity<ApiEnvelope<List<TechStackResponse>>> getTechStack(
            @PathVariable String owner, @PathVariable String repo) {

        String cacheKey = "tech-stack:" + owner.toLowerCase() + ":" + repo.toLowerCase();

        // Cache-aside read
        TechStackResponse[] cached = cacheService.get(cacheKey, TechStackResponse[].class);
        if (cached != null) {
            log.info("Cache hit for tech-stack {}/{}", owner, repo);
            return ResponseEntity.ok(ApiEnvelope.ok(Arrays.asList(cached)));
        }

        log.info("Cache miss for tech-stack {}/{}", owner, repo);
        Repository repository = repositorySearchService.getOrCreateRepository(owner, repo);

        List<TechStackDetection> detections = techStackDetectionRepository.findByRepositoryId(repository.getId());
        if (detections.isEmpty()) {
            detections = techStackDetectorService.detectStack(repository);
        }

        List<TechStackResponse> response = detections.stream()
                .map(d -> new TechStackResponse(d.getCategory(), d.getTechnology(), d.getConfidence()))
                .toList();

        // 24h cache TTL
        cacheService.put(cacheKey, response, 86400);

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
