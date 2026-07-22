package com.titansearch.service.ai;

import com.titansearch.dto.response.AISummaryPojo;
import com.titansearch.dto.response.GeminiSummaryDto;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.TechStackDto;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.cache.CacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AISummaryService {

    private final TechStackDetectorService techStackDetectorService;
    private final CacheService cacheService;
    private final GeminiClient geminiClient;

    public enum JobState { PENDING, FAILED }
    private final java.util.Map<String, JobState> jobStates = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_SECONDS = 86400; // 24 hours

    public Optional<AISummaryPojo> getSummary(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String key = "ai-summary:" + repository.fullName().toLowerCase();
        Optional<AISummaryPojo> cached = cacheService.get(key, AISummaryPojo.class);

        if (cached.isPresent()) {
            return cached;
        }

        triggerAsyncGeneration(repository, gitToken, geminiKey);
        return Optional.empty();
    }

    public boolean isGenerationPending(String fullName) {
        return jobStates.get(fullName.toLowerCase()) == JobState.PENDING;
    }

    public String getJobError(String fullName) {
        String key = fullName.toLowerCase();
        if (jobStates.get(key) == JobState.FAILED) {
            return "Failed to generate AI summary. Please check your Gemini API key in System Settings.";
        }
        return null;
    }

    public void clearJobState(String fullName) {
        jobStates.remove(fullName.toLowerCase());
    }

    public void forceRegenerate(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        triggerAsyncGeneration(repository, gitToken, geminiKey);
    }

    private void triggerAsyncGeneration(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String name = repository.fullName().toLowerCase();
        JobState state = jobStates.get(name);
        if (state == JobState.PENDING) {
            log.info("AI summary generation for repository {} is already in progress.", repository.fullName());
            return;
        }
        log.info("Triggered async AI summary generation for repository: {}", repository.fullName());
        jobStates.put(name, JobState.PENDING);
        generateSummaryAsync(repository, gitToken, geminiKey);
    }

    @Async
    public void generateSummaryAsync(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String fullName = repository.fullName();
        String nameKey = fullName.toLowerCase();
        com.titansearch.config.SecurityContext.setGitHubToken(gitToken);
        com.titansearch.config.SecurityContext.setGeminiKey(geminiKey);
        try {
            String owner = fullName.split("/")[0];
            String repoName = fullName.split("/")[1];

            List<TechStackDto> detections = techStackDetectorService.detectTechStack(
                    owner, repoName, repository.primaryLanguage(), repository.description());
            List<String> techStack = detections.stream()
                    .map(TechStackDto::technology)
                    .toList();

            GeminiSummaryDto dto = geminiClient.generateSummary(
                    fullName,
                    repository.description() != null ? repository.description() : "",
                    techStack,
                    repository.readmePreview() != null ? repository.readmePreview() : ""
            );

            AISummaryPojo summary = new AISummaryPojo(
                    System.currentTimeMillis(),
                    dto.overview(),
                    dto.mainPurpose(),
                    dto.architectureSummary(),
                    dto.keyTechnologies(),
                    dto.learningValue(),
                    "gemini-1.5-flash",
                    Instant.now()
            );

            cacheService.put("ai-summary:" + nameKey, summary, CACHE_TTL_SECONDS);
            log.info("Successfully generated AI summary for repository: {}", fullName);
        } catch (Exception e) {
            log.error("Failed to generate AI summary for repository {}: {}", fullName, e.getMessage());
            jobStates.put(nameKey, JobState.FAILED);
        } finally {
            com.titansearch.config.SecurityContext.clear();
            if (jobStates.get(nameKey) == JobState.PENDING) {
                jobStates.remove(nameKey);
            }
        }
    }
}
