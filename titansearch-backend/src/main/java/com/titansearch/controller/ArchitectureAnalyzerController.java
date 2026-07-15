package com.titansearch.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.TechStackDto;
import com.titansearch.service.analysis.ArchitectureAnalyzerService;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Architecture Diagram", description = "Generate rule-based system diagrams")
public class ArchitectureAnalyzerController {

    private final RepositorySearchService repositorySearchService;
    private final TechStackDetectorService techStackDetectorService;
    private final ArchitectureAnalyzerService architectureAnalyzerService;
    private final ObjectMapper objectMapper;

    @GetMapping("/{owner}/{repo}/architecture")
    @Operation(summary = "Get system architecture diagram (re-analyzed live)")
    public ResponseEntity<ApiEnvelope<JsonNode>> getArchitecture(
            @PathVariable String owner, @PathVariable String repo) {

        RepositoryDetailResponse detail = repositorySearchService.getDetail(owner, repo);
        List<TechStackDto> detections = techStackDetectorService.detectTechStack(
                owner, repo, detail.primaryLanguage(), detail.description());

        Map<String, Object> diagram = architectureAnalyzerService.analyzeArchitecture(detections);

        try {
            JsonNode jsonNode = objectMapper.valueToTree(diagram);
            return ResponseEntity.ok(ApiEnvelope.ok(jsonNode));
        } catch (Exception e) {
            log.error("Failed to convert diagram Map: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
