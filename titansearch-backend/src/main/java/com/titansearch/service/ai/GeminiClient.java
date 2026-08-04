package com.titansearch.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.dto.response.GeminiResumeAnalysisDto;
import com.titansearch.dto.response.GeminiSummaryDto;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class GeminiClient {

    public static class GeminiException extends RuntimeException {
        private final int statusCode;
        private final String userFriendlyMessage;

        public GeminiException(int statusCode, String userFriendlyMessage, String logMessage, Throwable cause) {
            super(logMessage, cause);
            this.statusCode = statusCode;
            this.userFriendlyMessage = userFriendlyMessage;
        }

        public int getStatusCode() {
            return statusCode;
        }

        public String getUserFriendlyMessage() {
            return userFriendlyMessage;
        }
    }

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public GeminiClient(
            @Value("${titansearch.gemini.api-base-url}") String baseUrl,
            @Value("${titansearch.gemini.api-key}") String apiKey,
            @Value("${titansearch.gemini.model}") String model,
            ObjectMapper objectMapper) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    private String getEffectiveApiKey() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            String customGeminiKey = attributes.getRequest().getHeader("X-Gemini-Key");
            if (customGeminiKey != null && !customGeminiKey.isBlank()) {
                return customGeminiKey;
            }
        }
        String threadLocalKey = com.titansearch.config.SecurityContext.getGeminiKey();
        if (threadLocalKey != null && !threadLocalKey.isBlank()) {
            return threadLocalKey;
        }
        return apiKey;
    }

    @CircuitBreaker(name = "geminiClient", fallbackMethod = "generateSummaryFallback")
    @Retry(name = "geminiClient")
    public GeminiSummaryDto generateSummary(String repoName, String description, List<String> techStack, String readmePreview) {
        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey == null || effectiveKey.isBlank()) {
            log.warn("Gemini API key is missing. Using fallback mock summary.");
            return generateSummaryFallback(repoName, description, techStack, readmePreview, new IllegalStateException("API key missing"));
        }

        String prompt = """
            You are an expert code analyst. Analyze the following GitHub repository metadata and generate a structured JSON summary.
            
            Repository Name: %s
            Description: %s
            Detected Technologies: %s
            README Preview:
            %s
            
            Return ONLY a valid JSON object matching the following structure:
            {
              "overview": "A concise 2-3 sentence description of the project.",
              "main_purpose": "The main goal or problem this repository solves.",
              "architecture_summary": "High-level summary of the directory structure or flow.",
              "key_technologies": "Comma-separated list of the 3-5 key technologies and their roles.",
              "learning_value": "What developers can learn by reading or building upon this codebase."
            }
            Do not include any markdown block fences like ```json, return only the raw JSON.
            """.formatted(repoName, description, String.join(", ", techStack), readmePreview);

        String responseBody = callGeminiApi(prompt, effectiveKey, "application/json");
        try {
            return objectMapper.readValue(cleanJsonResponse(responseBody), GeminiSummaryDto.class);
        } catch (Exception e) {
            log.error("Failed to parse Gemini summary JSON: {}, raw response: {}", e.getMessage(), responseBody);
            throw new RuntimeException("Failed to parse AI summary", e);
        }
    }

    @CircuitBreaker(name = "geminiClient", fallbackMethod = "generateResumeAnalysisFallback")
    @Retry(name = "geminiClient")
    public GeminiResumeAnalysisDto generateResumeAnalysis(String repoName, String description, List<String> techStack, String readmePreview, int healthScore, String directoryStructure) {
        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey == null || effectiveKey.isBlank()) {
            log.warn("Gemini API key is missing. Using fallback mock resume analysis.");
            return generateResumeAnalysisFallback(repoName, description, techStack, readmePreview, healthScore, directoryStructure, new IllegalStateException("API key missing"));
        }

        String prompt = """
            You are a senior systems architect, technical recruiter, and code auditor. Evaluate this GitHub repository's quality.
            Your evaluation must be realistic, objective, and deeply critical.
            DO NOT use hardcoded offsets, fixed constants, or static baseline score estimates (e.g., do not default everything to 6/10).
            Vastly differentiate quality:
            - Outstanding, industry-grade, or world-class open-source projects (e.g., Spring Framework, MyBatis, Kafka, React) must score between 9.0 and 10.0 for Portfolio Score and 90-100 for other metrics.
            - Strong, complete, production-ready full-stack projects should score between 8.0 and 9.0 for Portfolio Score and 80-90 for other metrics.
            - Well-constructed student capstone/course projects should score between 7.0 and 8.0 for Portfolio Score and 70-80 for other metrics.
            - Average/simple CRUD applications should score between 5.0 and 6.0 for Portfolio Score and 50-65 for other metrics.
            - Basic, beginner, or copy-pasted tutorial apps should score between 2.0 and 4.0 for Portfolio Score.
            - Minimal setups, hello worlds, or empty repositories should score between 0.0 and 2.0 for Portfolio Score.

            Base your calculations on this evidence:
            - Repository Name: %s
            - Description: %s
            - Technologies Used: %s
            - Directory Structure:
            %s
            - Computed GitHub Stats Health Score: %d/100
            - README Preview:
            %s

            Return ONLY a valid JSON object matching the following structure:
            {
              "resume_score": 7.5,
              "strengths": "Summary of technical strengths.",
              "weaknesses": "Summary of weaknesses.",
              "industry_relevance": "Industry relevance summary.",
              "suggested_improvements": "Actionable improvements.",

              "portfolio_score": 7.5,
              "portfolio_reasoning": "Critique of originality, complexity, completion, production-readiness, and candidate presentation.",
              "portfolio_contributors": ["+15 Original design", "+10 Complete tests", "-5 No deployment script"],

              "maintainability_score": 85,
              "maintainability_reasoning": "Evaluation of package layout, separation of concerns, DRY, modularity, and folder structure.",
              "maintainability_contributors": ["+15 Layered packages", "-10 High coupling between views and controllers"],

              "code_quality_score": 80,
              "code_quality_reasoning": "Evaluation of complexity, documentation, exception handling patterns, and code hygiene.",
              "code_quality_contributors": ["+10 Thorough comments", "-15 No error logs or checkstyle configs"],

              "overall_health_score": 82,
              "overall_health_reasoning": "Summary of activity, license, open issues, and maturity indicators.",
              "overall_health_contributors": ["+15 Weekly commits", "+10 Has LICENSE file", "-5 High ratio of unhandled issues"],

              "confidence_score": 90,

              "architecture_grade": "A+",
              "architecture_tooltip": "Why this grade was assigned (1-2 sentences).",
              "maintainability_grade": "A",
              "maintainability_tooltip": "Why...",
              "documentation_grade": "B+",
              "documentation_tooltip": "Why...",
              "testing_grade": "C",
              "testing_tooltip": "Why...",
              "security_grade": "A",
              "security_tooltip": "Why...",
              "scalability_grade": "A-",
              "scalability_tooltip": "Why...",
              "code_organization_grade": "A+",
              "code_organization_tooltip": "Why...",
              "dependency_health_grade": "B",
              "dependency_health_tooltip": "Why...",
              "overall_grade": "A",

              "health_timeline": [
                {"label": "Jan", "score": 82},
                {"label": "Feb", "score": 76},
                {"label": "Mar", "score": 85},
                {"label": "Apr", "score": 70},
                {"label": "May", "score": 89}
              ],
              "health_trend": "Improving",

              "dna_architecture": 85,
              "dna_documentation": 70,
              "dna_testing": 40,
              "dna_security": 90,
              "dna_backend": 95,
              "dna_frontend": 10,
              "dna_infrastructure": 20,
              "dna_devops": 30,
              "dna_database": 60,
              "dna_performance": 80,
              "dna_ai": 5,

              "personality_title": "The Architect",
              "personality_traits": ["Enterprise ready", "Highly modular", "Excellent structure"],
              "personality_explanation": "Why this personality matches (2-3 sentences).",

              "risk_documentation": "Green",
              "risk_documentation_rec": "Actionable recommendation.",
              "risk_security": "Green",
              "risk_security_rec": "Actionable recommendation.",
              "risk_testing": "Red",
              "risk_testing_rec": "Configure JUnit/Test frameworks to guarantee regression safety.",
              "risk_dependency_updates": "Yellow",
              "risk_dependency_updates_rec": "Upgrade outdated libraries.",
              "risk_technical_debt": "Yellow",
              "risk_technical_debt_rec": "Refactor complex helper methods.",
              "risk_performance": "Green",
              "risk_performance_rec": "Efficient data structure usage.",
              "risk_scalability": "Green",
              "risk_scalability_rec": "Layered architecture allows easy scaling.",
              "risk_api_stability": "Green",
              "risk_api_stability_rec": "Clean, versioned public API endpoints.",

              "code_review_feed": [
                {"status": "Check", "message": "Excellent package organization.", "path": "src/main/java"},
                {"status": "Warning", "message": "Large service class detected.", "path": "src/main/java/com/titansearch/service/ai/ResumeValueService.java"},
                {"status": "Warning", "message": "Missing integration tests.", "path": "src/test"}
              ],

              "journey": [
                {"year": "2024", "title": "Repository Created", "description": "Initial codebase established with foundational configurations."},
                {"year": "2025", "title": "Architecture Setup", "description": "Layered backend logic and controller mapping configured."}
              ],

              "recruiter_backend": 5,
              "recruiter_architecture": 5,
              "recruiter_testing": 3,
              "recruiter_production": 4,
              "recruiter_documentation": 4,
              "recruiter_readiness": 92,
              "recruiter_recommend": true,
              "recruiter_reason": "Excellent architecture with production-quality practices, but testing coverage could be improved.",

              "achievement_badges": ["Enterprise Ready", "Well Modularized"],

              "roadmap_high": ["Increase unit test coverage", "Add integration tests"],
              "roadmap_medium": ["Improve README configuration details"],
              "roadmap_low": ["Reduce package coupling in services"]
            }
            The resume_score and portfolio_score must be numeric values between 0.0 and 10.0.
            The maintainability_score, code_quality_score, overall_health_score, confidence_score, and all dna_* variables must be integers between 0 and 100.
            All risk_* variables must be exactly "Green", "Yellow", or "Red".
            The code_review_feed and journey lists must contain small objects matching the schema exactly.
            In code_review_feed.path, make sure to suggest real paths present in the directory structure.
            In code_review_feed.status, make sure to use exactly "Check", "Warning", or "Error".
            Do not include any markdown block fences like ```json, return only the raw JSON.
            """.formatted(repoName, description, String.join(", ", techStack), directoryStructure, healthScore, readmePreview);

        String responseBody = callGeminiApi(prompt, effectiveKey, "application/json");
        try {
            return objectMapper.readValue(cleanJsonResponse(responseBody), GeminiResumeAnalysisDto.class);
        } catch (Exception e) {
            log.error("Failed to parse Gemini resume analysis JSON: {}, raw response: {}", e.getMessage(), responseBody);
            throw new RuntimeException("Failed to parse AI resume analysis", e);
        }
    }

    public String generateChatResponse(String repoName, String description, String summaryOverview, String userQuery) {
        return generateChatResponse(repoName, description, summaryOverview, userQuery, 0.7);
    }

    public String generateChatResponse(String repoName, String description, String summaryOverview, String userQuery, double temperature) {
        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey == null || effectiveKey.isBlank()) {
            return "This is a local mock response. I'm ready to answer any questions about " + repoName + " once the Gemini API key is configured!";
        }

        String depthGuideline = "";
        if (temperature <= 0.25) {
            depthGuideline = """
                [EXPLANATION LEVEL: Level 1 (0-25%) - Non-technical Audience]
                - Use very simple, plain language. Explain concepts as if to a complete beginner or a non-programmer.
                - Absolutely avoid technical jargon, framework details, or programming specifics.
                - Use analogies and real-world examples to describe what the code/repository achieves.
                - Focus on explaining: What the repository does, Why someone created it, Who would use it, and What problem it solves.
                - Include a very simple, high-level Mermaid flowchart using non-technical terms.
                """;
        } else if (temperature <= 0.50) {
            depthGuideline = """
                [EXPLANATION LEVEL: Level 2 (25-50%) - Students and Beginners]
                - Focus on the main programming language, frameworks, directory structure, high-level workflow, APIs used, dependencies, and basic architecture.
                - Avoid deep code implementation details or complex software patterns.
                - Keep explanations intermediate and clear.
                - Include a basic Mermaid flowchart or sequence diagram visualizing the high-level system components.
                """;
        } else if (temperature <= 0.75) {
            depthGuideline = """
                [EXPLANATION LEVEL: Level 3 (50-75%) - Software Developers]
                - Provide a deep technical overview suitable for a professional software engineer.
                - Include details about internal architecture, design patterns, request lifecycle, package responsibilities, build configurations, controllers/services, database schemas/interactions, API/module interactions, and class roles.
                - Use technical terminology naturally.
                - Include detailed technical Mermaid flowcharts, sequence flows, class relationships, or package dependency graphs.
                """;
        } else {
            depthGuideline = """
                [EXPLANATION LEVEL: Level 4 (75-100%) - Senior Developers, Architects, and Open Source Contributors]
                - Provide the deepest possible repository analysis. Assume the user is looking to understand the codebase deeply to write and contribute code.
                - Discuss: internal execution flow, call graphs, complex component coordination, sequence flow details, concurrency, threading models, data flows, scalability trade-offs, performance bottlenecks, memory management, design rationale, CI/CD pipelines, security, and potential system refactors.
                - Include extensive, advanced Mermaid diagrams (such as detailed UML class structures, complex sequence interactions, data flow maps, or architectural layers).
                """;
        }

        String prompt = """
            You are RepoLens AI, an expert software developer and repository auditor.
            You are assisting a user in understanding the repository: %s.
            Here is the repository description: %s
            Here is the repository overview summary: %s
            
            Current Target Audience and Depth Guidelines:
            %s
            
            Answer the following user question/request:
            "%s"
            
            IMPORTANT RULES:
            - Respond directly using markdown formatting.
            - Adapt your vocabulary, tone, explanation depth, and technical terminology strictly to match the target audience level guidelines.
            - Automatically generate and embed appropriate Mermaid diagrams (using ```mermaid code fences) to visually map out workflows, APIs, components, or call hierarchies described in your response.
            """.formatted(repoName, description, summaryOverview, depthGuideline, userQuery);

        try {
            String responseBody = callGeminiApi(prompt, effectiveKey, null, temperature);
            return cleanJsonResponse(responseBody);
        } catch (Exception e) {
            System.err.println("--- DETAILED GEMINI EXCEPTION ---");
            e.printStackTrace();
            if (e instanceof org.springframework.web.client.RestClientResponseException ex) {
                System.err.println("HTTP Status Code: " + ex.getStatusCode());
                System.err.println("HTTP Response Body: " + ex.getResponseBodyAsString());
                System.err.println("HTTP Response Headers: " + ex.getResponseHeaders());
            }
            System.err.println("---------------------------------");
            log.error("Complete Gemini Exception stack trace: ", e);

            int statusCode = 500;
            String userFriendlyMessage = "An unexpected AI service error occurred. Please try again later.";

            if (e instanceof org.springframework.web.client.HttpClientErrorException ex) {
                statusCode = ex.getStatusCode().value();
                if (statusCode == 429) {
                    userFriendlyMessage = "AI service is temporarily busy. Please wait a few seconds and try again.";
                } else if (statusCode == 401) {
                    userFriendlyMessage = "Invalid Gemini API key. Please check your API key in System Settings.";
                } else if (statusCode == 403) {
                    userFriendlyMessage = "Your Gemini API key does not have permission to access this model.";
                }
            } else if (e instanceof org.springframework.web.client.HttpServerErrorException ex) {
                statusCode = 500;
                userFriendlyMessage = "An unexpected AI service error occurred. Please try again later.";
            } else if (e instanceof org.springframework.web.client.ResourceAccessException ex) {
                Throwable cause = ex.getCause();
                if (cause instanceof java.net.SocketTimeoutException || cause instanceof java.net.http.HttpTimeoutException) {
                    statusCode = 504;
                    userFriendlyMessage = "The AI request timed out. Please try again.";
                } else {
                    statusCode = 503;
                    userFriendlyMessage = "Unable to contact the AI service. Please check your internet connection.";
                }
            } else if (e instanceof java.net.SocketTimeoutException || e instanceof java.net.http.HttpTimeoutException) {
                statusCode = 504;
                userFriendlyMessage = "The AI request timed out. Please try again.";
            } else if (e instanceof java.io.IOException || e instanceof java.net.ConnectException) {
                statusCode = 503;
                userFriendlyMessage = "Unable to contact the AI service. Please check your internet connection.";
            }

            throw new GeminiException(statusCode, userFriendlyMessage, e.getMessage(), e);
        }
    }

    private String callGeminiApi(String prompt, String effectiveKey, String responseMimeType) {
        return callGeminiApi(prompt, effectiveKey, responseMimeType, null);
    }

    private String callGeminiApi(String prompt, String effectiveKey, String responseMimeType, Double temperature) {
        java.util.Map<String, Object> generationConfig = new java.util.HashMap<>();
        if (responseMimeType != null) {
            generationConfig.put("responseMimeType", responseMimeType);
        }
        if (temperature != null) {
            generationConfig.put("temperature", temperature);
        }

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", generationConfig
        );

        return restClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/models/{model}:generateContent")
                        .queryParam("key", effectiveKey)
                        .build(model))
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);
    }

    private String cleanJsonResponse(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode candidate = root.path("candidates").get(0);
        if (candidate != null) {
            JsonNode part = candidate.path("content").path("parts").get(0);
            if (part != null) {
                String text = part.path("text").asText().trim();
                // Strip markdown backticks if returned despite system instructions
                if (text.startsWith("```")) {
                    text = text.replaceAll("^```json\\s*", "").replaceAll("\\s*```$", "");
                }
                return text;
            }
        }
        throw new IllegalStateException("Invalid response structure from Gemini API");
    }

    // Fallbacks
    public GeminiSummaryDto generateSummaryFallback(String repoName, String description, List<String> techStack, String readmePreview, Throwable t) {
        log.error("Gemini generateSummary failed (using fallback): {}", t.getMessage());
        return new GeminiSummaryDto(
            "Offline summary fallback. " + description,
            "Problem solving and demonstration of " + String.join(", ", techStack),
            "Classic directories layout.",
            String.join(", ", techStack),
            "Code patterns and API integrations."
        );
    }

    public GeminiResumeAnalysisDto generateResumeAnalysisFallback(String repoName, String description, List<String> techStack, String readmePreview, int healthScore, String directoryStructure, Throwable t) {
        log.error("Gemini generateResumeAnalysis failed (using fallback): {}", t.getMessage());
        BigDecimal defaultScore = BigDecimal.valueOf(6.5);
        return new GeminiResumeAnalysisDto(
            defaultScore,
            "Shows basic repository lifecycle and use of " + String.join(", ", techStack),
            "Missing advanced production architectural components or CI/CD pipelines.",
            "Relevant for general developer roles using modern stacks.",
            "Add detailed unit tests, build scripts, and a clear setup guide in the README.",
            defaultScore,
            "Portfolio score is moderate due to standard project setup.",
            List.of("+15 Clean setup", "-5 Missing tests"),
            70,
            "Structure conforms to standard layouts.",
            List.of("+10 Standard directories"),
            68,
            "Code quality is decent with standard patterns.",
            List.of("+10 Readable code"),
            healthScore,
            "Health calculated from commits and issues.",
            List.of("+10 Active commits"),
            80,

            // Report Card
            "B", "Standard file configuration mapping detected.",
            "B", "Clean, classic folder paths and packaging patterns.",
            "B+", "Readme documentation exists and contains setup files.",
            "C", "Few test suites detected in primary descriptors.",
            "A", "No clear credentials leaks or security bypasses.",
            "B", "Standard architectural components support standard growth.",
            "B+", "Modestly layered layout separation.",
            "B", "Libraries declared and integrated.",
            "B",

            // Timeline
            List.of(
                Map.of("label", "Jan", "score", 65),
                Map.of("label", "Feb", "score", 70),
                Map.of("label", "Mar", "score", 68),
                Map.of("label", "Apr", "score", 72),
                Map.of("label", "May", "score", 76)
            ),
            "Improving",

            // DNA
            70, 75, 40, 80, 85, 20, 30, 40, 50, 70, 10,

            // Personality
            "The Builder",
            List.of("Rapid development", "Standard setup", "Modest documentation"),
            "This repository has a clean, standard structure suitable for rapid additions.",

            // Risk Radar
            "Green", "Readme is present.",
            "Green", "No credentials leaks.",
            "Yellow", "JUnit test configurations could be expanded.",
            "Green", "Standard dependencies mapped.",
            "Yellow", "Refactor helper methods.",
            "Green", "Standard performance.",
            "Green", "Modular architecture supports growth.",
            "Green", "Endpoints are structured.",

            // Code Review Feed
            List.of(
                Map.of("status", "Check", "message", "Standard file structure layout", "path", "src/"),
                Map.of("status", "Warning", "message", "Add comprehensive test configurations", "path", "src/test")
            ),

            // Journey
            List.of(
                Map.of("year", "2024", "title", "Initial Commit", "description", "Project setup completed"),
                Map.of("year", "2025", "title", "Production Build", "description", "Code base finalized")
            ),

            // Recruiter Perspective
            3, 3, 2, 3, 3, 72, true, "Solid baseline project, but lacks enterprise-level test coverage and automated integration workflows.",

            // Badges
            List.of("Clean Setup", "Standard layout"),

            // Roadmap
            List.of("Write integration test suites"),
            List.of("Expand README setup details"),
            List.of("Review static library declarations")
        );
    }
}
