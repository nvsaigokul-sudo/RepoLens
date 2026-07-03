package com.titansearch.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.config.RateLimitConfig;
import com.titansearch.dto.response.ApiEnvelope;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

@RequiredArgsConstructor
public class RateLimitFilter implements Filter {

    private final RateLimitConfig rateLimitConfig;
    private final ObjectMapper objectMapper;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (request instanceof HttpServletRequest httpRequest && response instanceof HttpServletResponse httpResponse) {
            
            // Resolve the client key (username if authenticated, client IP if anonymous)
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAuthenticated = auth != null && auth.isAuthenticated() 
                    && !(auth instanceof AnonymousAuthenticationToken);
            
            String key = isAuthenticated ? auth.getName() : httpRequest.getRemoteAddr();
            
            Bucket bucket = rateLimitConfig.resolveBucket(key, isAuthenticated);
            
            if (!bucket.tryConsume(1)) {
                httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                httpResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
                
                ApiEnvelope<?> envelope = ApiEnvelope.error(
                        "TOO_MANY_REQUESTS", 
                        "Rate limit exceeded. Try again in a minute."
                );
                
                httpResponse.getWriter().write(objectMapper.writeValueAsString(envelope));
                return;
            }
        }

        chain.doFilter(request, response);
    }
}
