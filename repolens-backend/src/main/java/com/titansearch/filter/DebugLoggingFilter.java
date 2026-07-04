package com.titansearch.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
public class DebugLoggingFilter extends OncePerRequestFilter {

    @Value("${app.debug-mode:false}")
    private boolean debugMode;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!debugMode) {
            filterChain.doFilter(request, response);
            return;
        }

        ContentCachingRequestWrapper requestWrapper = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);

        Throwable exception = null;
        try {
            filterChain.doFilter(requestWrapper, responseWrapper);
        } catch (Throwable t) {
            exception = t;
            throw t;
        } finally {
            logRequestAndResponse(requestWrapper, responseWrapper, exception);
            responseWrapper.copyBodyToResponse();
        }
    }

    private void logRequestAndResponse(ContentCachingRequestWrapper request, ContentCachingResponseWrapper response, Throwable exception) {
        String url = request.getRequestURI();
        String method = request.getMethod();
        int status = response.getStatus();

        byte[] requestBodyBytes = request.getContentAsByteArray();
        String requestBody = requestBodyBytes.length > 0 ? new String(requestBodyBytes, StandardCharsets.UTF_8) : "[Empty Body]";

        StringBuilder sb = new StringBuilder();
        sb.append("\n======================================================\n");
        sb.append("REQUEST:\n").append(method).append(" ").append(url).append("\n\n");
        sb.append("BODY:\n").append(requestBody).append("\n\n");
        sb.append("RESPONSE:\n").append(status);

        if (exception != null) {
            sb.append("\n\nEXCEPTION:\n").append(exception.getClass().getName()).append(": ").append(exception.getMessage());
        } else if (status >= 400) {
            Object springException = request.getAttribute("jakarta.servlet.error.exception");
            if (springException instanceof Throwable t) {
                sb.append("\n\nEXCEPTION:\n").append(t.getClass().getName()).append(": ").append(t.getMessage());
            }
        }
        sb.append("\n======================================================\n");
        log.info(sb.toString());
    }
}
