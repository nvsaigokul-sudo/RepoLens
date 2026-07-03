package com.titansearch.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeminiClientTest {

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private RestClient.Builder restClientBuilder;

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private RestClient restClient;

    private ObjectMapper objectMapper;

    @InjectMocks
    private GeminiClient geminiClient;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        ReflectionTestUtils.setField(geminiClient, "objectMapper", objectMapper);
        ReflectionTestUtils.setField(geminiClient, "apiKey", "test-key");
        ReflectionTestUtils.setField(geminiClient, "model", "gemini-1.5-flash");
    }

    @Test
    void generate_success_parsesResponseCorrectly() {
        String mockGeminiResponse = """
                {
                  "candidates": [
                    {
                      "content": {
                        "parts": [
                          {
                            "text": "{\\"overview\\": \\"This is a test overview\\"}"
                          }
                        ]
                      }
                    }
                  ]
                }
                """;

        when(restClientBuilder.build()).thenReturn(restClient);
        when(restClient.post()
                .uri(anyString())
                .contentType(any())
                .body(any())
                .retrieve()
                .body(String.class))
                .thenReturn(mockGeminiResponse);

        String result = geminiClient.generate("Test prompt");

        assertThat(result).isEqualTo("{\"overview\": \"This is a test overview\"}");
    }
}
