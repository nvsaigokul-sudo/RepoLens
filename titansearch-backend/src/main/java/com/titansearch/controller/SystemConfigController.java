package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/config")
public class SystemConfigController {

    @Value("${titansearch.github.token:}")
    private String gitToken;

    @Value("${titansearch.gemini.api-key:}")
    private String geminiKey;

    @GetMapping("/status")
    public ResponseEntity<ApiEnvelope<Map<String, Boolean>>> getStatus() {
        boolean hasGitToken = gitToken != null && !gitToken.isBlank();
        boolean hasGeminiKey = geminiKey != null && !geminiKey.isBlank();
        return ResponseEntity.ok(ApiEnvelope.ok(Map.of(
            "githubTokenConfigured", hasGitToken,
            "geminiKeyConfigured", hasGeminiKey
        )));
    }
}
