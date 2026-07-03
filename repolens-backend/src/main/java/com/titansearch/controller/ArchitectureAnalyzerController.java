package com.titansearch.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.entity.ArchitectureDiagram;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.ArchitectureDiagramRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.analysis.ArchitectureAnalyzerService;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.cache.CacheService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Architecture Analysis", description = "Endpoints for generating and retrieving rule-based architecture diagrams")
@Slf4j
public class ArchitectureAnalyzerController {

    private final ArchitectureAnalyzerService architectureAnalyzerService;
    private final ArchitectureDiagramRepository architectureDiagramRepository;
    private final TechStackDetectorService techStackDetectorService;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final RepositorySearchService repositorySearchService;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    @GetMapping("/{owner}/{repo}/architecture")
    @Operation(summary = "Get repository architecture layout (generates diagram if missing, cached 24h)")
    public ResponseEntity<ApiEnvelope<Map<String, Object>>> getArchitecture(
            @PathVariable String owner, @PathVariable String repo) {

        String cacheKey = "architecture:" + owner.toLowerCase() + ":" + repo.toLowerCase();

        // Cache-aside read
        Map<String, Object> cached = cacheService.get(cacheKey, Map.class);
        if (cached != null) {
            log.info("Cache hit for architecture {}/{}", owner, repo);
            return ResponseEntity.ok(ApiEnvelope.ok(cached));
        }

        log.info("Cache miss for architecture {}/{}", owner, repo);
        Repository repository = repositorySearchService.getOrCreateRepository(owner, repo);

        ArchitectureDiagram diagram = architectureDiagramRepository.findByRepositoryId(repository.getId()).orElse(null);

        if (diagram == null) {
            // Ensure tech stack is scanned first, since diagram is derived from it
            List<TechStackDetection> detections = techStackDetectionRepository.findByRepositoryId(repository.getId());
            if (detections.isEmpty()) {
                techStackDetectorService.detectStack(repository);
            }
            diagram = architectureAnalyzerService.generateDiagram(repository);
        }

        Map<String, Object> response = getDiagramAsMap(diagram.getDiagramJson());

        // Cache for 24h (86400 seconds)
        cacheService.put(cacheKey, response, 86400);

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }

    private Map<String, Object> getDiagramAsMap(String json) {
        try {
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Failed to parse diagram JSON string back to Map: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
