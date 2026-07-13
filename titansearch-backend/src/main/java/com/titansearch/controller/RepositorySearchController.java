package com.titansearch.controller;

import com.titansearch.dto.request.RepositorySearchRequest;
import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.PagedResponse;
import com.titansearch.dto.response.RepositorySummaryResponse;
import com.titansearch.service.search.RepositorySearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "Repository Search", description = "Search indexed GitHub repositories")
public class RepositorySearchController {

    private final RepositorySearchService repositorySearchService;
    private final com.titansearch.repository.UserRepository userRepository;
    private final com.titansearch.repository.SearchHistoryRepository searchHistoryRepository;

    @GetMapping("/search")
    @Operation(summary = "Search repositories by name, description, topic, or language")
    public ResponseEntity<ApiEnvelope<PagedResponse<RepositorySummaryResponse>>> search(
            @Valid RepositorySearchRequest request) {
        
        PagedResponse<RepositorySummaryResponse> result = repositorySearchService.search(request);

        // Record history for authenticated user
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            try {
                String email = auth.getName();
                userRepository.findByEmail(email).ifPresent(user -> {
                    String filtersJson = String.format("{\"language\":\"%s\",\"minStars\":%d}",
                            request.language() != null ? request.language() : "",
                            request.minStars() != null ? request.minStars() : 0);

                    com.titansearch.entity.SearchHistory history = com.titansearch.entity.SearchHistory.builder()
                            .user(user)
                            .query(request.q())
                            .filters(filtersJson)
                            .resultCount((int) result.totalElements())
                            .build();
                    searchHistoryRepository.save(history);
                });
            } catch (Exception e) {
                // Ignore history recording failures to avoid breaking searches
            }
        }

        return ResponseEntity.ok(ApiEnvelope.ok(result));
    }
}
