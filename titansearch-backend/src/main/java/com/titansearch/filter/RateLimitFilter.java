package com.titansearch.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.config.RateLimitConfig;
import com.titansearch.dto.response.ApiEnvelope;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitConfig rateLimitConfig;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAuthenticated = auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal());

        // Resolve key and bucket
        String clientKey = isAuthenticated ? auth.getName() : request.getRemoteAddr();

        // Check if it's the AI regeneration endpoint (rate-limited to 5/hour)
        if (path.contains("/ai-summary/regenerate")) {
            String aiKey = "ai-regen:" + clientKey;
            Bucket aiBucket = rateLimitConfig.resolveAiBucket(aiKey);
            if (!aiBucket.tryConsume(1)) {
                sendErrorResponse(response, "AI_RATE_LIMIT_EXCEEDED", "AI summary regeneration is limited to 5 requests per hour");
                return;
            }
        }

        // Apply general limit
        Bucket generalBucket = rateLimitConfig.resolveGeneralBucket(clientKey, isAuthenticated);
        if (!generalBucket.tryConsume(1)) {
            sendErrorResponse(response, "TOO_MANY_REQUESTS", "Rate limit exceeded. Please try again later.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void sendErrorResponse(HttpServletResponse response, String errorCode, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        
        ApiEnvelope.ApiError apiError = new ApiEnvelope.ApiError(errorCode, message);
        ApiEnvelope<?> envelope = ApiEnvelope.failed(apiError);
        
        objectMapper.writeValue(response.getWriter(), envelope);
    }
}
