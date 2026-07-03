package com.titansearch.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.entity.ResumeAnalysis;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.entity.User;
import com.titansearch.repository.HealthScoreRepository;
import com.titansearch.repository.ResumeAnalysisRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.analysis.HealthScoreService;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.ai.dto.GeminiResumeAnalysisDto;
import com.titansearch.service.cache.CacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeValueService {

    private final GeminiClient geminiClient;
    private final PromptBuilder promptBuilder;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final HealthScoreRepository healthScoreRepository;
    private final TechStackDetectorService techStackDetectorService;
    private final HealthScoreService healthScoreService;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    public String getJobStatus(Long repoId, Long userId) {
        String status = (String) cacheService.get("job:resume:" + repoId + ":" + userId);
        return status != null ? status : "NOT_STARTED";
    }

    @Async
    @Transactional
    public void generateResumeAnalysisAsync(Repository repository, User user) {
        Long repoId = repository.getId();
        Long userId = user.getId();
        log.info("Starting async AI resume analysis for repo: {}, user: {}", repository.getFullName(), user.getEmail());
        cacheService.put("job:resume:" + repoId + ":" + userId, "PENDING", 300);

        try {
            // 1. Ensure tech stack and health scores exist
            List<TechStackDetection> techStack = techStackDetectionRepository.findByRepositoryId(repoId);
            if (techStack.isEmpty()) {
                techStack = techStackDetectorService.detectStack(repository);
            }

            HealthScore healthScore = healthScoreRepository.findByRepositoryId(repoId).orElse(null);
            if (healthScore == null) {
                healthScore = healthScoreService.computeHealthScore(repository);
            }

            // 2. Generate prompt and call Gemini
            String prompt = promptBuilder.buildResumePrompt(repository, techStack, healthScore);
            String jsonOutput = geminiClient.generate(prompt);

            if (jsonOutput == null || jsonOutput.isBlank()) {
                log.error("Gemini failed to return content for resume analysis of {}", repository.getFullName());
                cacheService.put("job:resume:" + repoId + ":" + userId, "FAILED", 300);
                return;
            }

            // 3. Deserialize JSON output from Gemini
            GeminiResumeAnalysisDto dto;
            try {
                dto = objectMapper.readValue(jsonOutput, GeminiResumeAnalysisDto.class);
            } catch (Exception e) {
                log.warn("Failed to parse Gemini JSON output for resume, scrubbing backticks: {}", e.getMessage());
                String scrubbed = jsonOutput.replace("```json", "").replace("```", "").trim();
                try {
                    dto = objectMapper.readValue(scrubbed, GeminiResumeAnalysisDto.class);
                } catch (Exception ex) {
                    log.error("Failed to parse scrubbed JSON from Gemini: {}", scrubbed);
                    cacheService.put("job:resume:" + repoId + ":" + userId, "FAILED", 300);
                    return;
                }
            }

            // 4. Save to database (delete existing user-specific analysis for this repo)
            resumeAnalysisRepository.findByRepositoryIdAndUserId(repoId, userId)
                    .ifPresent(existing -> resumeAnalysisRepository.delete(existing));

            ResumeAnalysis analysis = ResumeAnalysis.builder()
                    .repository(repository)
                    .user(user)
                    .resumeScore(dto.resumeScore())
                    .strengths(dto.strengths())
                    .weaknesses(dto.weaknesses())
                    .industryRelevance(dto.industryRelevance())
                    .suggestedImprovements(dto.suggestedImprovements())
                    .build();

            resumeAnalysisRepository.save(analysis);

            // 5. Update status and evict cache
            cacheService.put("job:resume:" + repoId + ":" + userId, "SUCCESS", 300);
            cacheService.evict("resume-analysis:" + repoId + ":" + userId);

            log.info("Successfully completed AI resume analysis for repo: {}, user: {}", repository.getFullName(), user.getEmail());

        } catch (Exception e) {
            log.error("Error in generateResumeAnalysisAsync: {}", e.getMessage());
            cacheService.put("job:resume:" + repoId + ":" + userId, "FAILED", 300);
        }
    }
}
