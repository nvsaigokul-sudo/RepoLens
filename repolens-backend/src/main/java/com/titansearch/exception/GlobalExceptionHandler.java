package com.titansearch.exception;

import com.titansearch.dto.response.ApiEnvelope;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiEnvelope.failed(new ApiEnvelope.ApiError("NOT_FOUND", ex.getMessage())));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleDuplicate(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiEnvelope.failed(new ApiEnvelope.ApiError("DUPLICATE", ex.getMessage())));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiEnvelope.failed(new ApiEnvelope.ApiError("INVALID_CREDENTIALS", ex.getMessage())));
    }

    @ExceptionHandler(GitHubApiException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleGitHubError(GitHubApiException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ApiEnvelope.failed(new ApiEnvelope.ApiError("GITHUB_API_ERROR", ex.getMessage())));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiEnvelope<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiEnvelope.failed(new ApiEnvelope.ApiError("VALIDATION_ERROR", message)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiEnvelope<Void>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiEnvelope.failed(new ApiEnvelope.ApiError("INTERNAL_ERROR", "Something went wrong")));
    }
}
