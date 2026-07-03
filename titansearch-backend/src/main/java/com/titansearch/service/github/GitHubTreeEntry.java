package com.titansearch.service.github;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GitHubTreeEntry(
        @JsonProperty("path") String path,
        @JsonProperty("mode") String mode,
        @JsonProperty("type") String type, // "blob" or "tree"
        @JsonProperty("sha") String sha,
        @JsonProperty("size") Long size,
        @JsonProperty("url") String url
) {}
