package com.titansearch.service.github;

import com.titansearch.exception.GitHubApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import jakarta.servlet.http.HttpServletResponse;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class GitHubClient {

    private final RestClient gitHubRestClient;

    /**
     * Searches GitHub repositories. GitHub's own query syntax (q=...) is used directly;
     * TitanSearch's RepositorySearchService is responsible for translating user input into it.
     */
    public GitHubSearchResponse searchRepositories(String query, int page, int perPage) {
        try {
            return gitHubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search/repositories")
                            .queryParam("q", query)
                            .queryParam("page", page + 1) // GitHub is 1-indexed
                            .queryParam("per_page", perPage)
                            .build())
                    .retrieve()
                    .body(GitHubSearchResponse.class);
        } catch (RestClientException e) {
            log.error("GitHub search failed for query='{}': {}", query, e.getMessage());
            throw new GitHubApiException("Failed to search GitHub repositories", e);
        }
    }

    public GitHubRepoDto getRepository(String owner, String repo) {
        try {
            return gitHubRestClient.get()
                    .uri("/repos/{owner}/{repo}", owner, repo)
                    .retrieve()
                    .body(GitHubRepoDto.class);
        } catch (RestClientException e) {
            log.error("GitHub repo fetch failed for {}/{}: {}", owner, repo, e.getMessage());
            throw new GitHubApiException("Failed to fetch repository from GitHub", e);
        }
    }

    public Map<String, Long> getLanguages(String owner, String repo) {
        try {
            return gitHubRestClient.get()
                    .uri("/repos/{owner}/{repo}/languages", owner, repo)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<Map<String, Long>>() {});
        } catch (Exception e) {
            log.error("GitHub languages fetch failed for {}/{}: {}", owner, repo, e.getMessage());
            return Map.of();
        }
    }

    public List<Map<String, Object>> getDirectoryContents(String owner, String repo, String path) {
        try {
            return gitHubRestClient.get()
                    .uri("/repos/{owner}/{repo}/contents/{path}", owner, repo, path == null ? "" : path)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            log.error("GitHub directory contents fetch failed for {}/{}/{} : {}", owner, repo, path, e.getMessage());
            return List.of();
        }
    }

    public String getRawFileContent(String owner, String repo, String path) {
        try {
            return gitHubRestClient.get()
                    .uri("/repos/{owner}/{repo}/contents/{path}", owner, repo, path)
                    .header("Accept", "application/vnd.github.v3.raw")
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.debug("Failed to fetch raw file {}/{}/{}: {}", owner, repo, path, e.getMessage());
            return "";
        }
    }

    public int getCommitsCountInLast90Days(String owner, String repo) {
        try {
            Instant since = Instant.now().minus(90, java.time.temporal.ChronoUnit.DAYS);
            String sinceStr = since.toString();
            List<Map<String, Object>> response = gitHubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/repos/{owner}/{repo}/commits")
                            .queryParam("since", sinceStr)
                            .queryParam("per_page", 100)
                            .build(owner, repo))
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {});
            return response != null ? response.size() : 0;
        } catch (Exception e) {
            log.error("Failed to fetch commits for {}/{}: {}", owner, repo, e.getMessage());
            return 0;
        }
    }

    public void downloadArchive(String owner, String repo, HttpServletResponse response) {
        try {
            gitHubRestClient.get()
                    .uri("/repos/{owner}/{repo}/zipball", owner, repo)
                    .header("Accept", "*/*")
                    .exchange((req, res) -> {
                        response.setStatus(res.getStatusCode().value());
                        response.setContentType("application/zip");
                        response.setHeader("Content-Disposition", "attachment; filename=\"" + owner + "-" + repo + ".zip\"");
                        
                        try (InputStream is = res.getBody()) {
                            is.transferTo(response.getOutputStream());
                        }
                        return null;
                    });
        } catch (Exception e) {
            log.error("GitHub download zip failed for {}/{}: {}", owner, repo, e.getMessage());
            throw new GitHubApiException("Failed to download ZIP from GitHub", e);
        }
    }
}
