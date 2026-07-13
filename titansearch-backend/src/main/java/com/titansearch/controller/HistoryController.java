package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.entity.User;
import com.titansearch.repository.SearchHistoryRepository;
import com.titansearch.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/history")
@RequiredArgsConstructor
@Tag(name = "Search History", description = "Retrieve user's query history")
public class HistoryController {

    private final SearchHistoryRepository searchHistoryRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Get query history for the authenticated user")
    public ResponseEntity<ApiEnvelope<List<Map<String, Object>>>> getHistory() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));

        var history = searchHistoryRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        List<Map<String, Object>> response = history.stream()
                .map(h -> Map.<String, Object>of(
                        "id", h.getId(),
                        "query", h.getQuery() != null ? h.getQuery() : "",
                        "filters", h.getFilters() != null ? h.getFilters() : "{}",
                        "resultCount", h.getResultCount() != null ? h.getResultCount() : 0,
                        "createdAt", h.getCreatedAt()
                ))
                .toList();

        return ResponseEntity.ok(ApiEnvelope.ok(response));
    }
}
