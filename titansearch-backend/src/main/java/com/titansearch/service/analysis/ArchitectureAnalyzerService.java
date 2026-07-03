package com.titansearch.service.analysis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.entity.ArchitectureDiagram;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.ArchitectureDiagramRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArchitectureAnalyzerService {

    private final ArchitectureDiagramRepository architectureDiagramRepository;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public ArchitectureDiagram generateDiagram(Repository repository) {
        log.info("Generating architecture diagram for repository: {}", repository.getFullName());

        // 1. Delete existing diagram
        architectureDiagramRepository.deleteByRepositoryId(repository.getId());

        // 2. Fetch tech stack detections
        List<TechStackDetection> detections = techStackDetectionRepository.findByRepositoryId(repository.getId());

        // 3. Classify technologies
        boolean hasFrontend = false;
        boolean hasBackend = false;
        boolean hasDatabase = false;
        boolean hasRedis = false;
        boolean hasDocker = false;
        boolean hasK8s = false;

        String frontendTech = "";
        String backendTech = "";
        String databaseTech = "";

        for (TechStackDetection d : detections) {
            String tech = d.getTechnology();
            switch (d.getCategory()) {
                case FRONTEND -> {
                    hasFrontend = true;
                    frontendTech = tech;
                }
                case BACKEND -> {
                    hasBackend = true;
                    backendTech = tech;
                }
                case DATABASE -> {
                    if (tech.equalsIgnoreCase("Redis")) {
                        hasRedis = true;
                    } else {
                        hasDatabase = true;
                        databaseTech = tech;
                    }
                }
                case INFRA -> {
                    if (tech.equalsIgnoreCase("Docker")) {
                        hasDocker = true;
                    } else if (tech.equalsIgnoreCase("Kubernetes")) {
                        hasK8s = true;
                    } else if (tech.equalsIgnoreCase("Redis")) {
                        hasRedis = true;
                    }
                }
            }
        }

        // 4. Construct diagram JSON
        List<Map<String, String>> nodes = new ArrayList<>();
        List<Map<String, String>> edges = new ArrayList<>();

        // Add standard Client Browser node
        nodes.add(createNode("n_client", "Client Browser", "CLIENT", "Web client browser"));

        // Match stack shapes
        String shape = "monolith";

        if (hasFrontend && hasBackend) {
            shape = "static+API";
            nodes.add(createNode("n_frontend", frontendTech + " SPA", "PRESENTATION", "Interactive web front-end application"));
            nodes.add(createNode("n_backend", backendTech + " API", "BUSINESS", "REST API backend services"));

            edges.add(createEdge("n_client", "n_frontend", "VISITS"));
            edges.add(createEdge("n_frontend", "n_backend", "CALLS"));
        } else if (hasBackend) {
            shape = "monolith";
            nodes.add(createNode("n_backend", backendTech + " Application", "BUSINESS", "Monolithic application server"));

            edges.add(createEdge("n_client", "n_backend", "REQUESTS"));
        } else if (hasFrontend) {
            shape = "static";
            nodes.add(createNode("n_frontend", frontendTech + " App", "PRESENTATION", "Static web application"));
            edges.add(createEdge("n_client", "n_frontend", "VISITS"));
        }

        if (hasBackend) {
            if (hasDatabase) {
                nodes.add(createNode("n_db", databaseTech + " Database", "PERSISTENCE", "Primary relational database store"));
                edges.add(createEdge("n_backend", "n_db", "QUERIES"));
            }
            if (hasRedis) {
                shape = "microservice+cache";
                nodes.add(createNode("n_cache", "Redis Cache", "CACHE", "In-memory key-value cache and rate limit store"));
                edges.add(createEdge("n_backend", "n_cache", "READS_WRITES"));
            }
        }

        if (hasDocker || hasK8s) {
            String infraName = hasK8s ? "Kubernetes Cluster" : "Docker Containerization";
            nodes.add(createNode("n_infra", infraName, "INFRASTRUCTURE", "Orchestrated container infrastructure environment"));
            
            if (hasBackend) {
                edges.add(createEdge("n_backend", "n_infra", "HOSTED_BY"));
            }
            if (hasDatabase) {
                edges.add(createEdge("n_db", "n_infra", "PROVISIONED_ON"));
            }
        }

        Map<String, Object> diagramMap = new HashMap<>();
        diagramMap.put("nodes", nodes);
        diagramMap.put("edges", edges);

        String jsonString = "{}";
        try {
            jsonString = objectMapper.writeValueAsString(diagramMap);
        } catch (Exception e) {
            log.error("Failed to serialize architecture diagram JSON map: {}", e.getMessage());
        }

        ArchitectureDiagram diagram = ArchitectureDiagram.builder()
                .repository(repository)
                .diagramJson(jsonString)
                .diagramType(shape.toUpperCase())
                .build();

        return architectureDiagramRepository.save(diagram);
    }

    private Map<String, String> createNode(String id, String label, String layer, String description) {
        Map<String, String> node = new HashMap<>();
        node.put("id", id);
        node.put("label", label);
        node.put("layer", layer);
        node.put("description", description);
        return node;
    }

    private Map<String, String> createEdge(String from, String to, String type) {
        Map<String, String> edge = new HashMap<>();
        edge.put("from", from);
        edge.put("to", to);
        edge.put("type", type);
        return edge;
    }
}
