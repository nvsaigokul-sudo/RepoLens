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

    @GetMapping("/search")
    @Operation(summary = "Search repositories by name, description, topic, or language")
    public ResponseEntity<ApiEnvelope<PagedResponse<RepositorySummaryResponse>>> search(
            @Valid RepositorySearchRequest request) {
        
        PagedResponse<RepositorySummaryResponse> result = repositorySearchService.search(request);
        return ResponseEntity.ok(ApiEnvelope.ok(result));
    }
}
