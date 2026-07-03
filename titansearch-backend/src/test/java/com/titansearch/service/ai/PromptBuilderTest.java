package com.titansearch.service.ai;

import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechCategory;
import com.titansearch.entity.TechStackDetection;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PromptBuilderTest {

    private final PromptBuilder promptBuilder = new PromptBuilder();

    @Test
    void buildSummaryPrompt_includesRepositoryAndMetrics() {
        Repository repo = Repository.builder()
                .fullName("spring/spring-boot")
                .description("Spring Boot project")
                .stars(500)
                .forks(100)
                .openIssues(10)
                .primaryLanguage("Java")
                .readmePreview("This is the readme content of Spring Boot application.")
                .build();

        List<TechStackDetection> techStack = List.of(
                TechStackDetection.builder().technology("Spring Boot").category(TechCategory.BACKEND).confidence(BigDecimal.valueOf(0.95)).build()
        );

        HealthScore score = HealthScore.builder().overallScore(80).build();

        String prompt = promptBuilder.buildSummaryPrompt(repo, techStack, score);

        assertThat(prompt).contains("spring/spring-boot");
        assertThat(prompt).contains("Spring Boot (Category: BACKEND, Confidence: 0.95)");
        assertThat(prompt).contains("Overall 80/100");
        assertThat(prompt).contains("This is the readme content");
        assertThat(prompt).contains("Return a JSON object matching this exact schema");
    }

    @Test
    void buildResumePrompt_includesRepositoryAndMetrics() {
        Repository repo = Repository.builder()
                .fullName("react/react-app")
                .primaryLanguage("JavaScript")
                .build();

        List<TechStackDetection> techStack = List.of(
                TechStackDetection.builder().technology("React").category(TechCategory.FRONTEND).build()
        );

        HealthScore score = HealthScore.builder().overallScore(90).build();

        String prompt = promptBuilder.buildResumePrompt(repo, techStack, score);

        assertThat(prompt).contains("react/react-app");
        assertThat(prompt).contains("React (FRONTEND)");
        assertThat(prompt).contains("Health Score Details: Overall 90/100");
    }
}
