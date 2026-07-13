package com.titansearch.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.entity.ArchitectureDiagram;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.ArchitectureDiagramRepository;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.analysis.ArchitectureAnalyzerService;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.github.GitHubSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Architecture Diagram", description = "Generate rule-based system diagrams")
public class ArchitectureAnalyzerController {

    private final RepositoryRepository repositoryRepository;
    private final GitHubSyncService gitHubSyncService;
    private final TechStackDetectorService techStackDetectorService;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final ArchitectureAnalyzerService architectureAnalyzerService;
    private final ArchitectureDiagramRepository architectureDiagramRepository;
    private final ObjectMapper objectMapper;

    @GetMapping("/{owner}/{repo}/architecture")
    @Operation(summary = "Get system architecture diagram (re-analyzed if stale > 24h)")
    public ResponseEntity<ApiEnvelope<JsonNode>> getArchitecture(
            @PathVariable String owner, @PathVariable String repo) {

        String fullName = owner + "/" + repo;
        Repository repository = repositoryRepository.findByFullNameIgnoreCase(fullName)
                .orElseGet(() -> gitHubSyncService.syncByOwnerAndName(owner, repo));

        ArchitectureDiagram diagram = architectureDiagramRepository.findByRepositoryId(repository.getId()).orElse(null);

        if (diagram == null || diagram.getGeneratedAt().plus(24, ChronoUnit.HOURS).isBefore(Instant.now())) {
            List<TechStackDetection> detections = techStackDetectionRepository.findByRepositoryId(repository.getId());
            if (detections.isEmpty()) {
                detections = techStackDetectorService.detectAndSave(repository);
            }
            diagram = architectureAnalyzerService.analyzeAndSave(repository, detections);
        }

        try {
            JsonNode jsonNode = objectMapper.readTree(diagram.getDiagramJson());
            return ResponseEntity.ok(ApiEnvelope.ok(jsonNode));
        } catch (Exception e) {
            log.error("Failed to parse diagram JSON: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
