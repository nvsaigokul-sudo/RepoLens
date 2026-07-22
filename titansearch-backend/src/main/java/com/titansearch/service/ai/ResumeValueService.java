package com.titansearch.service.ai;

import com.titansearch.dto.response.GeminiResumeAnalysisDto;
import com.titansearch.dto.response.HealthScoreResponse;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.ResumeAnalysisPojo;
import com.titansearch.dto.response.TechStackDto;
import com.titansearch.service.analysis.HealthScoreService;
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
public class ResumeValueService {

    private final TechStackDetectorService techStackDetectorService;
    private final HealthScoreService healthScoreService;
    private final CacheService cacheService;
    private final GeminiClient geminiClient;

    public enum JobState { PENDING, FAILED }
    private final java.util.Map<String, JobState> jobStates = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_SECONDS = 86400; // 24 hours

    public Optional<ResumeAnalysisPojo> getResumeAnalysis(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String key = "resume-analysis:" + repository.fullName().toLowerCase();
        Optional<ResumeAnalysisPojo> cached = cacheService.get(key, ResumeAnalysisPojo.class);

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
            return "Failed to evaluate repository portfolio value. Please check your configuration and API keys.";
        }
        return null;
    }

    public void clearJobState(String fullName) {
        jobStates.remove(fullName.toLowerCase());
    }

    private void triggerAsyncGeneration(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String name = repository.fullName().toLowerCase();
        JobState state = jobStates.get(name);
        if (state == JobState.PENDING) {
            log.info("Resume evaluation for repository {} is already in progress.", repository.fullName());
            return;
        }
        log.info("Triggered async resume evaluation for repository: {}", repository.fullName());
        jobStates.put(name, JobState.PENDING);
        generateResumeAnalysisAsync(repository, gitToken, geminiKey);
    }

    @Async
    public void generateResumeAnalysisAsync(RepositoryDetailResponse repository, String gitToken, String geminiKey) {
        String fullName = repository.fullName();
        String nameKey = fullName.toLowerCase();
        com.titansearch.config.SecurityContext.setGitHubToken(gitToken);
        com.titansearch.config.SecurityContext.setGeminiKey(geminiKey);
        try {
            String owner = fullName.split("/")[0];
            String repoName = fullName.split("/")[1];

            List<TechStackDto> detections = techStackDetectorService.detectTechStack(
                    owner, repoName, repository.primaryLanguage(), repository.description());
            List<String> techStack = detections.stream().map(TechStackDto::technology).toList();

            HealthScoreResponse healthScore = healthScoreService.calculateHealthScore(
                    owner,
                    repoName,
                    repository.readmePreview(),
                    repository.openIssues(),
                    repository.stars(),
                    repository.forks(),
                    repository.repoCreatedAt()
            );

            GeminiResumeAnalysisDto dto = geminiClient.generateResumeAnalysis(
                    fullName,
                    repository.description() != null ? repository.description() : "",
                    techStack,
                    repository.readmePreview() != null ? repository.readmePreview() : "",
                    healthScore.overallScore()
            );

            int score = dto.resumeScore() != null ? dto.resumeScore().intValue() : 0;
            List<String> strengths = dto.strengths() != null ? List.of(dto.strengths().split("\n")) : List.of();
            List<String> weaknesses = dto.weaknesses() != null ? List.of(dto.weaknesses().split("\n")) : List.of();
            List<String> improvements = dto.suggestedImprovements() != null ? List.of(dto.suggestedImprovements().split("\n")) : List.of();

            ResumeAnalysisPojo analysis = new ResumeAnalysisPojo(
                    score,
                    strengths,
                    weaknesses,
                    dto.industryRelevance(),
                    improvements,
                    Instant.now()
            );

            cacheService.put("resume-analysis:" + nameKey, analysis, CACHE_TTL_SECONDS);
            log.info("Successfully generated resume analysis for repository: {}", fullName);
        } catch (Exception e) {
            log.error("Failed to generate resume analysis for repository {}: {}", fullName, e.getMessage());
            jobStates.put(nameKey, JobState.FAILED);
        } finally {
            com.titansearch.config.SecurityContext.clear();
            if (jobStates.get(nameKey) == JobState.PENDING) {
                jobStates.remove(nameKey);
            }
        }
    }
}
