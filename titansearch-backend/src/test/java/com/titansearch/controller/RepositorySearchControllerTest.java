package com.titansearch.controller;

import com.titansearch.dto.response.PagedResponse;
import com.titansearch.dto.response.RepositorySummaryResponse;
import com.titansearch.security.JwtAuthFilter;
import com.titansearch.security.JwtService;
import com.titansearch.service.search.RepositorySearchService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RepositorySearchController.class)
class RepositorySearchControllerTest {

    @Autowired MockMvc mockMvc;

    @MockBean RepositorySearchService repositorySearchService;
    @MockBean JwtAuthFilter jwtAuthFilter;
    @MockBean JwtService jwtService;
    @MockBean com.titansearch.filter.RateLimitFilter rateLimitFilter;
    @MockBean com.titansearch.repository.UserRepository userRepository;
    @MockBean com.titansearch.repository.SearchHistoryRepository searchHistoryRepository;

    @org.junit.jupiter.api.BeforeEach
    void setUp() throws Exception {
        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.http.HttpServletRequest request = invocation.getArgument(0);
            jakarta.servlet.http.HttpServletResponse response = invocation.getArgument(1);
            jakarta.servlet.FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(request, response);
            return null;
        }).when(rateLimitFilter).doFilter(any(), any(), any());

        org.mockito.Mockito.doAnswer(invocation -> {
            jakarta.servlet.http.HttpServletRequest request = invocation.getArgument(0);
            jakarta.servlet.http.HttpServletResponse response = invocation.getArgument(1);
            jakarta.servlet.FilterChain filterChain = invocation.getArgument(2);
            filterChain.doFilter(request, response);
            return null;
        }).when(jwtAuthFilter).doFilter(any(), any(), any());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser
    void search_returnsPagedResults() throws Exception {
        var summary = new RepositorySummaryResponse(1L, "spring-projects/spring-boot", "spring-projects",
                "Spring Boot", 76000, 40200, List.of("java", "spring"), null);
        var paged = new PagedResponse<>(List.of(summary), 0, 20, 1, 1);

        when(repositorySearchService.search(any())).thenReturn(paged);

        mockMvc.perform(get("/api/v1/repositories/search").param("q", "spring boot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].fullName").value("spring-projects/spring-boot"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }
}
