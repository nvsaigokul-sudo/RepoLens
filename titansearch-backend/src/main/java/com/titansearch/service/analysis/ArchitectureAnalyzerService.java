package com.titansearch.service.analysis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.dto.response.TechStackDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArchitectureAnalyzerService {

    private final ObjectMapper objectMapper;

    public Map<String, Object> analyzeArchitecture(List<TechStackDto> detections) {
        List<Map<String, String>> nodes = new ArrayList<>();
        List<Map<String, String>> edges = new ArrayList<>();

        String frontendTech = null;
        String backendTech = null;
        String databaseTech = null;
        String cacheTech = null;
        String infraTech = null;

        for (TechStackDto d : detections) {
            String tech = d.technology();
            switch (d.category()) {
                case "FRONTEND" -> frontendTech = tech;
                case "BACKEND" -> {
                    if (backendTech == null || !"Java".equals(backendTech) && !"Python".equals(backendTech) && !"Node.js".equals(backendTech)) {
                        backendTech = tech;
                    }
                }
                case "DATABASE" -> {
                    if ("Redis".equalsIgnoreCase(tech)) {
                        cacheTech = tech;
                    } else {
                        databaseTech = tech;
                    }
                }
                case "INFRA" -> infraTech = tech;
            }
        }

        if (frontendTech == null && backendTech == null) {
            backendTech = "Backend Service";
        }

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

        return diagram;
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
