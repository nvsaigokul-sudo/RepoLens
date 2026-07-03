package com.titansearch.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeminiClient {

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${titansearch.ai.gemini.api-key:}")
    private String apiKey;

    @Value("${titansearch.ai.gemini.model:gemini-1.5-flash}")
    private String model;

    public String generate(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API Key is missing. Check your GITHUB_TOKEN or GEMINI_API_KEY environment variables.");
            return null;
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;

        // Build request payload matching Gemini standard Schema
        Map<String, Object> part = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(part));
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(content),
                "generationConfig", Map.of("responseMimeType", "application/json")
        );

        try {
            RestClient client = restClientBuilder.build();
            String response = client.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (response == null) {
                return null;
            }

            var root = objectMapper.readTree(response);
            var candidates = root.path("candidates");
            if (!candidates.isMissingNode() && candidates.size() > 0) {
                var parts = candidates.get(0).path("content").path("parts");
                if (!parts.isMissingNode() && parts.size() > 0) {
                    return parts.get(0).path("text").asText();
                }
            }
            log.error("Invalid response format from Gemini API: {}", response);
            return null;
        } catch (RestClientException e) {
            log.error("Gemini RestClient call failed: {}", e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
            return null;
        }
    }
}
