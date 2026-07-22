package com.titansearch.service.search;

import com.titansearch.dto.request.RepositorySearchRequest;
import com.titansearch.dto.response.PagedResponse;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.RepositorySummaryResponse;
import com.titansearch.service.github.GitHubClient;
import com.titansearch.service.github.GitHubRepoDto;
import com.titansearch.service.github.GitHubSearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RepositorySearchService {

    private final GitHubClient gitHubClient;

    public PagedResponse<RepositorySummaryResponse> search(RepositorySearchRequest request) {
        StringBuilder queryBuilder = new StringBuilder();
        if (request.q() != null && !request.q().trim().isEmpty()) {
            queryBuilder.append(request.q().trim());
        } else {
            queryBuilder.append("stars:>=0");
        }
        if (request.language() != null && !request.language().trim().isEmpty()) {
            queryBuilder.append(" language:").append(request.language().trim());
        }
        if (request.minStars() != null) {
            queryBuilder.append(" stars:>=").append(request.minStars());
        }

        GitHubSearchResponse response = gitHubClient.searchRepositories(
                queryBuilder.toString(), request.page(), request.size());

        List<RepositorySummaryResponse> content = response.items().stream()
                .map(this::toSummary)
                .toList();

        long totalElements = response.totalCount();
        int totalPages = (int) Math.ceil((double) totalElements / request.size());

        return new PagedResponse<>(content, request.page(), request.size(), totalElements, totalPages);
    }

    public RepositoryDetailResponse getDetail(String owner, String repoName) {
        GitHubRepoDto dto = gitHubClient.getRepository(owner, repoName);

        Map<String, Long> langs = gitHubClient.getLanguages(owner, repoName);
        long totalBytes = langs.values().stream().mapToLong(Long::longValue).sum();
        Map<String, Double> languageBreakdown = new HashMap<>();
        if (totalBytes > 0) {
            for (Map.Entry<String, Long> entry : langs.entrySet()) {
                double pct = (double) entry.getValue() * 100.0 / totalBytes;
                languageBreakdown.put(entry.getKey(), Math.round(pct * 100.0) / 100.0);
            }
        }

        String readme = gitHubClient.getRawFileContent(owner, repoName, "README.md");
        if (readme == null || readme.trim().isEmpty()) {
            readme = gitHubClient.getRawFileContent(owner, repoName, "readme.md");
        }

        return new RepositoryDetailResponse(
                dto.id(),
                dto.fullName(),
                dto.owner() != null ? dto.owner().login() : owner,
                dto.description(),
                dto.stars() != null ? dto.stars() : 0,
                dto.forks() != null ? dto.forks() : 0,
                dto.openIssues() != null ? dto.openIssues() : 0,
                dto.language(),
                readme,
                dto.topics() != null ? dto.topics() : List.of(),
                languageBreakdown,
                dto.createdAt(),
                dto.pushedAt()
        );
    }

    private RepositorySummaryResponse toSummary(GitHubRepoDto dto) {
        return new RepositorySummaryResponse(
                dto.id(),
                dto.fullName(),
                dto.owner() != null ? dto.owner().login() : "",
                dto.description(),
                dto.stars() != null ? dto.stars() : 0,
                dto.forks() != null ? dto.forks() : 0,
                dto.topics() != null ? dto.topics() : List.of(),
                dto.pushedAt()
        );
    }

    public void downloadZip(String owner, String repoName, HttpServletResponse response) {
        gitHubClient.downloadArchive(owner, repoName, response);
    }
}
