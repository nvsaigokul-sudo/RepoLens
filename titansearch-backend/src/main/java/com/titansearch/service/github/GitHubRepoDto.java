package com.titansearch.service.github;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;

// Minimal projection of GitHub's repo search-item schema — only fields TitanSearch uses.
@JsonIgnoreProperties(ignoreUnknown = true)
public record GitHubRepoDto(
        @JsonProperty("id") Long id,
        @JsonProperty("full_name") String fullName,
        @JsonProperty("description") String description,
        @JsonProperty("stargazers_count") Integer stars,
        @JsonProperty("forks_count") Integer forks,
        @JsonProperty("open_issues_count") Integer openIssues,
        @JsonProperty("language") String language,
        @JsonProperty("topics") List<String> topics,
        @JsonProperty("created_at") Instant createdAt,
        @JsonProperty("pushed_at") Instant pushedAt,
        @JsonProperty("owner") Owner owner
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Owner(@JsonProperty("login") String login) {}
}
