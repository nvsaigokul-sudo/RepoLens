package com.titansearch.service.github;

import com.titansearch.exception.GitHubApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import java.util.List;

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

    public GitHubTreeResponse getTree(String owner, String repo, String sha) {
        try {
            return gitHubRestClient.get()
                    .uri("/repos/{owner}/{repo}/git/trees/{sha}?recursive=1", owner, repo, sha)
                    .retrieve()
                    .body(GitHubTreeResponse.class);
        } catch (RestClientException e) {
            log.error("GitHub tree fetch failed for {}/{} (sha={}): {}", owner, repo, sha, e.getMessage());
            throw new GitHubApiException("Failed to fetch repository tree from GitHub", e);
        }
    }

    public String getRawFileContent(String owner, String repo, String path) {
        try {
            return gitHubRestClient.get()
                    .uri("/repos/{owner}/{repo}/contents/{path}", owner, repo, path)
                    .headers(headers -> headers.set("Accept", "application/vnd.github.v3.raw"))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            log.warn("GitHub raw file fetch failed for {}/{} path={}: {}", owner, repo, path, e.getMessage());
            return null;
        }
    }

    public java.util.Map<String, Long> getLanguages(String owner, String repo) {
        try {
            return gitHubRestClient.get()
                    .uri("/repos/{owner}/{repo}/languages", owner, repo)
                    .retrieve()
                    .body(new org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Long>>() {});
        } catch (RestClientException e) {
            log.error("GitHub languages fetch failed for {}/{}: {}", owner, repo, e.getMessage());
            throw new GitHubApiException("Failed to fetch repository languages from GitHub", e);
        }
    }

    public int getCommitCountSince(String owner, String repo, java.time.Instant since) {
        try {
            var response = gitHubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/repos/{owner}/{repo}/commits")
                            .queryParam("since", since.toString())
                            .queryParam("per_page", 1)
                            .build(owner, repo))
                    .retrieve()
                    .toEntity(List.class);

            List<?> body = response.getBody();
            if (body == null || body.isEmpty()) {
                return 0;
            }

            String linkHeader = response.getHeaders().getFirst("Link");
            if (linkHeader == null) {
                return body.size();
            }

            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("page=(\\d+)>; rel=\"last\"");
            java.util.regex.Matcher matcher = pattern.matcher(linkHeader);
            if (matcher.find()) {
                return Integer.parseInt(matcher.group(1));
            }

            return body.size();
        } catch (RestClientException e) {
            log.warn("GitHub commits count fetch failed for {}/{}: {}", owner, repo, e.getMessage());
            return 0;
        }
    }
}

