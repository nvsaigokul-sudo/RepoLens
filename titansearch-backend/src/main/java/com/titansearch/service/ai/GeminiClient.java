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
    public GeminiResumeAnalysisDto generateResumeAnalysis(String repoName, String description, List<String> techStack, String readmePreview, int healthScore) {
        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey == null || effectiveKey.isBlank()) {
            log.warn("Gemini API key is missing. Using fallback mock resume analysis.");
            return generateResumeAnalysisFallback(repoName, description, techStack, readmePreview, healthScore, new IllegalStateException("API key missing"));
        }

        String prompt = """
            You are a technical recruiter and hiring manager. Evaluate this GitHub repository's quality for inclusion on a software engineer's resume or portfolio.
            
            Repository Name: %s
            Description: %s
            Technologies Used: %s
            Computed Health Score: %d/100
            README Preview:
            %s
            
            Return ONLY a valid JSON object matching the following structure:
            {
              "resume_score": 7.5,
              "strengths": "Brief summary of key technical highlights, clean code patterns, or good project organization.",
              "weaknesses": "Issues like missing tests, basic implementation, lack of documentation, etc.",
              "industry_relevance": "How relevant these skills/tech are to contemporary professional software engineering jobs.",
              "suggested_improvements": "Actionable items the developer can implement to make this project shine on a resume."
            }
            The resume_score must be a numeric value between 0.0 and 10.0.
            Do not include any markdown block fences like ```json, return only the raw JSON.
            """.formatted(repoName, description, String.join(", ", techStack), healthScore, readmePreview);

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

    public GeminiResumeAnalysisDto generateResumeAnalysisFallback(String repoName, String description, List<String> techStack, String readmePreview, int healthScore, Throwable t) {
        log.error("Gemini generateResumeAnalysis failed (using fallback): {}", t.getMessage());
        return new GeminiResumeAnalysisDto(
            BigDecimal.valueOf(6.5),
            "Shows basic repository lifecycle and use of " + String.join(", ", techStack),
            "Missing advanced production architectural components or CI/CD pipelines.",
            "Relevant for general developer roles using modern stacks.",
            "Add detailed unit tests, build scripts, and a clear setup guide in the README."
        );
    }
}
