package com.titansearch.service.ai;

import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.entity.ResumeAnalysis;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.entity.User;
import com.titansearch.repository.HealthScoreRepository;
import com.titansearch.repository.ResumeAnalysisRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.analysis.HealthScoreService;
import com.titansearch.dto.response.GeminiResumeAnalysisDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResumeValueService {

    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final HealthScoreRepository healthScoreRepository;
    private final HealthScoreService healthScoreService;
    private final GeminiClient geminiClient;

    private final Set<String> activeResumeJobs = ConcurrentHashMap.newKeySet();

    public Optional<ResumeAnalysis> getResumeAnalysis(Repository repository, User user) {
        Long repoId = repository.getId();
        Long userId = user.getId();
        
        Optional<ResumeAnalysis> existing = resumeAnalysisRepository
                .findFirstByRepositoryIdAndUserIdOrderByGeneratedAtDesc(repoId, userId);

        if (existing.isPresent()) {
            return existing;
        }

        triggerAsyncGeneration(repository, user);
        return Optional.empty();
    }

    public boolean isGenerationPending(Long repoId, Long userId) {
        return activeResumeJobs.contains(repoId + "-" + userId);
    }

    private void triggerAsyncGeneration(Repository repository, User user) {
        String jobKey = repository.getId() + "-" + user.getId();
        if (activeResumeJobs.add(jobKey)) {
            log.info("Triggered async resume evaluation for repository: {} by user: {}", repository.getFullName(), user.getEmail());
            generateResumeAnalysisAsync(repository, user);
        } else {
            log.info("Resume evaluation for repository {} by user {} is already in progress.", repository.getId(), user.getEmail());
        }
    }

    @Async
    @Transactional
    public void generateResumeAnalysisAsync(Repository repository, User user) {
        Long repoId = repository.getId();
        String jobKey = repoId + "-" + user.getId();
        try {
            // Get tech stack
            List<String> techStack = techStackDetectionRepository.findByRepositoryId(repoId).stream()
                    .map(TechStackDetection::getTechnology)
                    .toList();

            // Get or calculate health score
            HealthScore healthScore = healthScoreRepository.findByRepositoryId(repoId)
                    .orElseGet(() -> healthScoreService.calculateAndSave(repository));

            GeminiResumeAnalysisDto dto = geminiClient.generateResumeAnalysis(
                    repository.getFullName(),
                    repository.getDescription() != null ? repository.getDescription() : "",
                    techStack,
                    repository.getReadmePreview() != null ? repository.getReadmePreview() : "",
                    healthScore.getOverallScore()
            );

            ResumeAnalysis analysis = ResumeAnalysis.builder()
                    .repository(repository)
                    .user(user)
                    .resumeScore(dto.resumeScore())
                    .strengths(dto.strengths())
                    .weaknesses(dto.weaknesses())
                    .industryRelevance(dto.industryRelevance())
                    .suggestedImprovements(dto.suggestedImprovements())
                    .generatedAt(Instant.now())
                    .build();

            resumeAnalysisRepository.save(analysis);
            log.info("Successfully generated resume analysis for repository: {}", repository.getFullName());
        } catch (Exception e) {
            log.error("Failed to generate resume analysis for repository {}: {}", repository.getFullName(), e.getMessage());
        } finally {
            activeResumeJobs.remove(jobKey);
        }
    }
}
