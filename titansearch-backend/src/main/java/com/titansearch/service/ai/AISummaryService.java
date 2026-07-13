package com.titansearch.service.ai;

import com.titansearch.entity.AISummary;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.AISummaryRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.dto.response.GeminiSummaryDto;
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
public class AISummaryService {

    private final AISummaryRepository aiSummaryRepository;
    private final TechStackDetectionRepository techStackDetectionRepository;
    private final GeminiClient geminiClient;

    private final Set<Long> activeSummaryJobs = ConcurrentHashMap.newKeySet();
    private static final long STALENESS_LIMIT_DAYS = 30;

    public Optional<AISummary> getSummary(Repository repository) {
        Long repoId = repository.getId();
        Optional<AISummary> existing = aiSummaryRepository.findByRepositoryId(repoId);

        if (existing.isPresent()) {
            AISummary summary = existing.get();
            if (isStale(summary)) {
                log.info("AI summary for repository {} is stale, triggering background refresh.", repoId);
                triggerAsyncGeneration(repository);
            }
            return Optional.of(summary);
        }

        triggerAsyncGeneration(repository);
        return Optional.empty();
    }

    public boolean isGenerationPending(Long repoId) {
        return activeSummaryJobs.contains(repoId);
    }

    @Transactional
    public void forceRegenerate(Repository repository) {
        triggerAsyncGeneration(repository);
    }

    private void triggerAsyncGeneration(Repository repository) {
        Long repoId = repository.getId();
        if (activeSummaryJobs.add(repoId)) {
            log.info("Triggered async AI summary generation for repository: {}", repository.getFullName());
            generateSummaryAsync(repository);
        } else {
            log.info("AI summary generation for repository {} is already in progress.", repoId);
        }
    }

    @Async
    @Transactional
    public void generateSummaryAsync(Repository repository) {
        Long repoId = repository.getId();
        try {
            List<String> techStack = techStackDetectionRepository.findByRepositoryId(repoId).stream()
                    .map(TechStackDetection::getTechnology)
                    .toList();

            GeminiSummaryDto dto = geminiClient.generateSummary(
                    repository.getFullName(),
                    repository.getDescription() != null ? repository.getDescription() : "",
                    techStack,
                    repository.getReadmePreview() != null ? repository.getReadmePreview() : ""
            );

            AISummary summary = aiSummaryRepository.findByRepositoryId(repoId)
                    .orElseGet(() -> AISummary.builder().repository(repository).build());

            summary.setOverview(dto.overview());
            summary.setMainPurpose(dto.mainPurpose());
            summary.setArchitectureSummary(dto.architectureSummary());
            summary.setKeyTechnologies(dto.keyTechnologies());
            summary.setLearningValue(dto.learningValue());
            summary.setModelVersion("gemini-1.5-flash");
            summary.setGeneratedAt(Instant.now());

            aiSummaryRepository.save(summary);
            log.info("Successfully generated AI summary for repository: {}", repository.getFullName());
        } catch (Exception e) {
            log.error("Failed to generate AI summary for repository {}: {}", repository.getFullName(), e.getMessage());
        } finally {
            activeSummaryJobs.remove(repoId);
        }
    }

    private boolean isStale(AISummary summary) {
        return summary.getGeneratedAt()
                .plus(STALENESS_LIMIT_DAYS, java.time.temporal.ChronoUnit.DAYS)
                .isBefore(Instant.now());
    }
}
