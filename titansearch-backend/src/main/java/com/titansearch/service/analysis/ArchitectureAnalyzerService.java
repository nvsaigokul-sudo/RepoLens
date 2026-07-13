package com.titansearch.service.analysis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.entity.ArchitectureDiagram;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.ArchitectureDiagramRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArchitectureAnalyzerService {

    private final ArchitectureDiagramRepository architectureDiagramRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ArchitectureDiagram analyzeAndSave(Repository repository, List<TechStackDetection> detections) {
        String diagramJson = generateDiagramJson(detections);

        ArchitectureDiagram diagram = architectureDiagramRepository.findByRepositoryId(repository.getId())
                .orElseGet(() -> ArchitectureDiagram.builder().repository(repository).build());

        diagram.setDiagramJson(diagramJson);
        diagram.setDiagramType("LAYERED");
        diagram.setGeneratedAt(Instant.now());

        return architectureDiagramRepository.save(diagram);
    }

    private String generateDiagramJson(List<TechStackDetection> detections) {
        List<Map<String, String>> nodes = new ArrayList<>();
        List<Map<String, String>> edges = new ArrayList<>();

        // Group detections by category
        String frontendTech = null;
        String backendTech = null;
        String databaseTech = null;
        String cacheTech = null;
        String infraTech = null;

        for (TechStackDetection d : detections) {
            String tech = d.getTechnology();
            switch (d.getCategory()) {
                case FRONTEND -> frontendTech = tech;
                case BACKEND -> {
                    if (backendTech == null || !"Java".equals(backendTech) && !"Python".equals(backendTech) && !"Node.js".equals(backendTech)) {
                        backendTech = tech; // Prefer framework (Spring Boot, Express, Django) over raw language
                    }
                }
                case DATABASE -> {
                    if ("Redis".equalsIgnoreCase(tech)) {
                        cacheTech = tech;
                    } else {
                        databaseTech = tech;
                    }
                }
                case INFRA -> infraTech = tech;
            }
        }

        // Fallbacks based on primaryLanguage
        if (frontendTech == null && backendTech == null) {
            backendTech = "Backend Service";
        }

        // Add nodes
        if (frontendTech != null) {
            nodes.add(createNode("frontend", frontendTech + " App", "FRONTEND"));
        }
        if (backendTech != null) {
            nodes.add(createNode("backend", backendTech + " API", "BACKEND"));
        }
        if (cacheTech != null) {
            nodes.add(createNode("cache", cacheTech, "CACHE"));
        }
        if (databaseTech != null) {
            nodes.add(createNode("database", databaseTech + " DB", "DATABASE"));
        }
        if (infraTech != null) {
            nodes.add(createNode("infra", infraTech + " Host", "INFRA"));
        }

        // Add edges
        if (frontendTech != null && backendTech != null) {
            edges.add(createEdge("frontend", "backend"));
        }
        if (backendTech != null) {
            if (cacheTech != null) {
                edges.add(createEdge("backend", "cache"));
            }
            if (databaseTech != null) {
                edges.add(createEdge("backend", "database"));
            }
            if (infraTech != null) {
                edges.add(createEdge("backend", "infra"));
            }
        }
        if (databaseTech != null && infraTech != null) {
            edges.add(createEdge("database", "infra"));
        }

        Map<String, Object> diagram = new HashMap<>();
        diagram.put("nodes", nodes);
        diagram.put("edges", edges);

        try {
            return objectMapper.writeValueAsString(diagram);
        } catch (Exception e) {
            log.error("Failed to serialize architecture diagram JSON: {}", e.getMessage());
            return "{\"nodes\":[],\"edges\":[]}";
        }
    }

    private Map<String, String> createNode(String id, String label, String type) {
        Map<String, String> node = new HashMap<>();
        node.put("id", id);
        node.put("label", label);
        node.put("type", type);
        return node;
    }

    private Map<String, String> createEdge(String from, String to) {
        Map<String, String> edge = new HashMap<>();
        edge.put("from", from);
        edge.put("to", to);
        return edge;
    }
}
