package com.titansearch.service.ai;

import com.titansearch.entity.HealthScore;
import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PromptBuilder {

    public String buildSummaryPrompt(Repository repository, List<TechStackDetection> techStack, HealthScore healthScore) {
        String techList = techStack.stream()
                .map(d -> d.getTechnology() + " (Category: " + d.getCategory() + ", Confidence: " + d.getConfidence() + ")")
                .collect(Collectors.joining(", "));

        String readme = repository.getReadmePreview();
        if (readme != null && readme.length() > 2000) {
            readme = readme.substring(0, 2000) + "... [truncated]";
        }

        return String.format("""
                You are a senior software architect. Analyze the following repository and generate a structured JSON summary.
                
                Repository Name: %s
                Description: %s
                Stars: %d | Forks: %d | Open Issues: %d
                Primary Language: %s
                Detected Technologies: %s
                Health Score Details: Overall %d/100 (Docs: %d, Commits: %d, Issues: %d, Popularity: %d, Maturity: %d)
                
                Readme Preview:
                \"\"\"
                %s
                \"\"\"
                
                Return a JSON object matching this exact schema:
                {
                  "overview": "Short summary of the project's purpose and nature",
                  "mainPurpose": "Core problem this repository aims to solve",
                  "architectureSummary": "Explanation of the architectural design pattern (e.g. monolith, layered, event-driven)",
                  "keyTechnologies": "Brief explanation of how the main technologies are used in this stack",
                  "learningValue": "Concrete educational takeaways or value for developers studying this code"
                }
                
                Do NOT include markdown formatting wrappers like ```json ... ```, HTML tags, or any surrounding text. Return ONLY the JSON object.
                """,
                repository.getFullName(),
                repository.getDescription() != null ? repository.getDescription() : "None",
                repository.getStars(),
                repository.getForks(),
                repository.getOpenIssues(),
                repository.getPrimaryLanguage() != null ? repository.getPrimaryLanguage() : "Unknown",
                techList.isEmpty() ? "None detected" : techList,
                healthScore != null ? healthScore.getOverallScore() : 50,
                healthScore != null ? healthScore.getDocumentationScore() : 50,
                healthScore != null ? healthScore.getCommitActivityScore() : 50,
                healthScore != null ? healthScore.getIssuesScore() : 50,
                healthScore != null ? healthScore.getPopularityScore() : 50,
                healthScore != null ? healthScore.getMaturityScore() : 50,
                readme != null ? readme : "None available"
        );
    }

    public String buildResumePrompt(Repository repository, List<TechStackDetection> techStack, HealthScore healthScore) {
        String techList = techStack.stream()
                .map(d -> d.getTechnology() + " (" + d.getCategory() + ")")
                .collect(Collectors.joining(", "));

        return String.format("""
                You are a technical recruiter and engineering lead. Assess how valuable this repository is for a developer's resume or career profile.
                
                Repository Name: %s
                Primary Language: %s
                Detected Technologies: %s
                Health Score Details: Overall %d/100
                
                Analyze and return a JSON object matching this exact schema:
                {
                  "resumeScore": 8.5, // Numeric value out of 10.0 representing resume impact
                  "strengths": "Bullet list of key design patterns, frameworks, or complexity shown in the code",
                  "weaknesses": "Bullet list of key issues, lack of testing, or architecture simplifications",
                  "industryRelevance": "Explanation of how relevant these skills are in the current job market",
                  "suggestedImprovements": "Bullet list of recommended steps to make this repo code look more professional"
                }
                
                Do NOT include markdown formatting wrappers like ```json ... ```, HTML tags, or any surrounding text. Return ONLY the JSON object.
                """,
                repository.getFullName(),
                repository.getPrimaryLanguage() != null ? repository.getPrimaryLanguage() : "Unknown",
                techList.isEmpty() ? "None detected" : techList,
                healthScore != null ? healthScore.getOverallScore() : 50
        );
    }
}
