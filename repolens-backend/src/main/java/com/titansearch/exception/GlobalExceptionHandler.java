package com.titansearch.exception;

import com.titansearch.dto.response.ApiEnvelope;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @Value("${app.debug-mode:false}")
    private boolean debugMode;

    private ResponseEntity<Object> buildResponse(Exception ex, HttpStatus status, String errorCode, String message, HttpServletRequest request) {
        if (debugMode) {
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            ex.printStackTrace(pw);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("success", false);
            body.put("errorType", ex.getClass().getSimpleName());
            body.put("message", message);
            body.put("timestamp", LocalDateTime.now().toString());
            body.put("path", request.getRequestURI());
            body.put("stackTrace", sw.toString());

            return ResponseEntity.status(status).body(body);
        } else {
            // Spring Envelope Standard Error response
            ApiEnvelope<Void> envelope = ApiEnvelope.failed(new ApiEnvelope.ApiError(errorCode, message));
            return ResponseEntity.status(status).body(envelope);
        }
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Object> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return buildResponse(ex, HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<Object> handleDuplicate(DuplicateResourceException ex, HttpServletRequest request) {
        return buildResponse(ex, HttpStatus.CONFLICT, "DUPLICATE", ex.getMessage(), request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Object> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return buildResponse(ex, HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", ex.getMessage(), request);
    }

    @ExceptionHandler(GitHubApiException.class)
    public ResponseEntity<Object> handleGitHubError(GitHubApiException ex, HttpServletRequest request) {
        return buildResponse(ex, HttpStatus.BAD_GATEWAY, "GITHUB_API_ERROR", ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return buildResponse(ex, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGeneric(Exception ex, HttpServletRequest request) {
        String message = debugMode ? ex.getMessage() : "Something went wrong";
        return buildResponse(ex, HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message, request);
    }
}
