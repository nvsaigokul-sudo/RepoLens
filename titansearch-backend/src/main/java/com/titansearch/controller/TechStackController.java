package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.github.GitHubSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Tech Stack", description = "Detect and list technology signatures")
public class TechStackController {

    private final RepositoryRepository repositoryRepository;
    private final GitHubSyncService gitHubSyncService;
    private final TechStackDetectorService techStackDetectorService;
    private final TechStackDetectionRepository techStackDetectionRepository;

    @GetMapping("/{owner}/{repo}/tech-stack")
    @Operation(summary = "Get repository tech stack (runs detection if missing or stale > 24h)")
    public ResponseEntity<ApiEnvelope<List<Map<String, Object>>>> getTechStack(
            @PathVariable String owner, @PathVariable String repo) {
        
        String fullName = owner + "/" + repo;
        Repository repository = repositoryRepository.findByFullNameIgnoreCase(fullName)
                .orElseGet(() -> gitHubSyncService.syncByOwnerAndName(owner, repo));

        List<TechStackDetection> detections = techStackDetectionRepository.findByRepositoryId(repository.getId());
        
        if (detections.isEmpty() || detections.get(0).getDetected_at().plus(24, ChronoUnit.HOURS).isBefore(Instant.now())) {
            detections = techStackDetectorService.detectAndSave(repository);
        }

        List<Map<String, Object>> response = detections.stream()
                .map(d -> Map.<String, Object>of(
                        "category", d.getCategory().name(),
                        "technology", d.getTechnology(),
                        "confidence", d.getConfidence()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
