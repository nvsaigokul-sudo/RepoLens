package com.titansearch.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.entity.AISummary;
import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.AISummaryRepository;
import com.titansearch.repository.HealthScoreRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.analysis.HealthScoreService;
import com.titansearch.service.analysis.TechStackDetectorService;
import com.titansearch.service.ai.dto.GeminiSummaryDto;
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
public class AISummaryService {

    private final GeminiClient geminiClient;
    private final PromptBuilder promptBuilder;
    private final AISummaryRepository aiSummaryRepository;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final HealthScoreRepository healthScoreRepository;
    private final TechStackDetectorService techStackDetectorService;
    private final HealthScoreService healthScoreService;
    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    public String getJobStatus(Long repoId) {
        String status = (String) cacheService.get("job:summary:" + repoId);
        return status != null ? status : "NOT_STARTED";
    }

    @Async
    @Transactional
    public void generateSummaryAsync(Repository repository) {
        Long repoId = repository.getId();
        log.info("Starting async AI summary generation for: {}", repository.getFullName());
        cacheService.put("job:summary:" + repoId, "PENDING", 300); // Expires in 5 minutes

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
            String prompt = promptBuilder.buildSummaryPrompt(repository, techStack, healthScore);
            String jsonOutput = geminiClient.generate(prompt);

            if (jsonOutput == null || jsonOutput.isBlank()) {
                log.error("Gemini failed to return content for summary of {}", repository.getFullName());
                cacheService.put("job:summary:" + repoId, "FAILED", 300);
                return;
            }

            // 3. Deserialize JSON output from Gemini
            GeminiSummaryDto dto;
            try {
                dto = objectMapper.readValue(jsonOutput, GeminiSummaryDto.class);
            } catch (Exception e) {
                log.warn("Failed to parse Gemini JSON output, attempting to scrub markdown ticks: {}", e.getMessage());
                // Fallback: clean out markdown block backticks if present
                String scrubbed = jsonOutput.replace("```json", "").replace("```", "").trim();
                try {
                    dto = objectMapper.readValue(scrubbed, GeminiSummaryDto.class);
                } catch (Exception ex) {
                    log.error("Failed to parse scrubbed JSON from Gemini: {}", scrubbed);
                    cacheService.put("job:summary:" + repoId, "FAILED", 300);
                    return;
                }
            }

            // 4. Save to database
            aiSummaryRepository.deleteByRepositoryId(repoId);

            AISummary aiSummary = AISummary.builder()
                    .repository(repository)
                    .overview(dto.overview())
                    .mainPurpose(dto.mainPurpose())
                    .architectureSummary(dto.architectureSummary())
                    .keyTechnologies(dto.keyTechnologies())
                    .learningValue(dto.learningValue())
                    .modelVersion("gemini-1.5-flash")
                    .build();

            aiSummaryRepository.save(aiSummary);
            
            // 5. Update status and evict read caches
            cacheService.put("job:summary:" + repoId, "SUCCESS", 300);
            
            String owner = repository.getOwner();
            String repoName = repository.getFullName().substring(repository.getFullName().indexOf('/') + 1);
            cacheService.evict("ai-summary:" + owner.toLowerCase() + ":" + repoName.toLowerCase());
            
            log.info("Successfully completed AI summary for: {}", repository.getFullName());

        } catch (Exception e) {
            log.error("Error in generateSummaryAsync for {}: {}", repository.getFullName(), e.getMessage());
            cacheService.put("job:summary:" + repoId, "FAILED", 300);
        }
    }
}
