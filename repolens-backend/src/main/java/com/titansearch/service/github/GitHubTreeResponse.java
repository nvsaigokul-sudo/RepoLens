package com.titansearch.service.github;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GitHubTreeResponse(
        @JsonProperty("sha") String sha,
        @JsonProperty("url") String url,
        @JsonProperty("tree") List<GitHubTreeEntry> tree,
        @JsonProperty("truncated") Boolean truncated
) {}
