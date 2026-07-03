package com.titansearch.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.titansearch.config.RateLimitConfig;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    private RateLimitConfig rateLimitConfig;
    private ObjectMapper objectMapper;
    private RateLimitFilter rateLimitFilter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        rateLimitConfig = mock(RateLimitConfig.class);
        objectMapper = new ObjectMapper();
        rateLimitFilter = new RateLimitFilter(rateLimitConfig, objectMapper);
        filterChain = mock(FilterChain.class);
    }

    @Test
    void doFilter_allowsRequestsWhenTokenAvailable() throws ServletException, IOException {
        Bucket bucket = mock(Bucket.class);
        when(bucket.tryConsume(1)).thenReturn(true);
        when(rateLimitConfig.resolveBucket(anyString(), anyBoolean())).thenReturn(bucket);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
    }

    @Test
    void doFilter_blocksRequestsAndReturns429WhenLimitExceeded() throws ServletException, IOException {
        Bucket bucket = mock(Bucket.class);
        when(bucket.tryConsume(1)).thenReturn(false);
        when(rateLimitConfig.resolveBucket(anyString(), anyBoolean())).thenReturn(bucket);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        rateLimitFilter.doFilter(request, response, filterChain);

        verify(filterChain, never()).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        assertThat(response.getContentAsString()).contains("TOO_MANY_REQUESTS");
    }
}
