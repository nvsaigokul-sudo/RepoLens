package com.titansearch.exception;

public class GitHubApiException extends RuntimeException {
    public GitHubApiException(String message, Throwable cause) {
        super(message, cause);
    }
    public GitHubApiException(String message) {
        super(message);
    }
}
