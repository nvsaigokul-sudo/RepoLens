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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class GeminiClient {

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

    @CircuitBreaker(name = "geminiClient", fallbackMethod = "generateSummaryFallback")
    @Retry(name = "geminiClient")
    public GeminiSummaryDto generateSummary(String repoName, String description, List<String> techStack, String readmePreview) {
        if (apiKey == null || apiKey.isBlank()) {
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

        String responseBody = callGeminiApi(prompt);
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
        if (apiKey == null || apiKey.isBlank()) {
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

        String responseBody = callGeminiApi(prompt);
        try {
            return objectMapper.readValue(cleanJsonResponse(responseBody), GeminiResumeAnalysisDto.class);
        } catch (Exception e) {
            log.error("Failed to parse Gemini resume analysis JSON: {}, raw response: {}", e.getMessage(), responseBody);
            throw new RuntimeException("Failed to parse AI resume analysis", e);
        }
    }

    private String callGeminiApi(String prompt) {
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            ),
            "generationConfig", Map.of(
                "responseMimeType", "application/json"
            )
        );

        return restClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/models/{model}:generateContent")
                        .queryParam("key", apiKey)
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
