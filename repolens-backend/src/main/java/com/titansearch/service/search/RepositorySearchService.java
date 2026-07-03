package com.titansearch.service.search;

import com.titansearch.dto.request.RepositorySearchRequest;
import com.titansearch.dto.response.PagedResponse;
import com.titansearch.dto.response.RepositoryDetailResponse;
import com.titansearch.dto.response.RepositorySummaryResponse;
import com.titansearch.entity.Repository;
import com.titansearch.exception.ResourceNotFoundException;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.service.github.GitHubSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RepositorySearchService {

    private final RepositoryRepository repositoryRepository;
    private final GitHubSyncService gitHubSyncService;

    @Value("${titansearch.cache.detail-ttl-seconds}")
    private long detailTtlSeconds;

    // Phase 2: searches TitanSearch's own indexed table (populated as users view repos).
    // A background GitHub-crawling indexer arrives in Phase 3 for cold-start coverage.
    public PagedResponse<RepositorySummaryResponse> search(RepositorySearchRequest request) {
        var pageable = PageRequest.of(request.page(), request.size(), Sort.by(Sort.Direction.DESC, "stars"));
        Page<Repository> page = repositoryRepository.search(
                request.q(), request.language(), request.minStars(), pageable);

        List<RepositorySummaryResponse> content = page.getContent().stream()
                .map(this::toSummary)
                .toList();

        return new PagedResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }

    public Repository getOrCreateRepository(String owner, String repoName) {
        String fullName = owner + "/" + repoName;
        Repository repo = repositoryRepository.findByFullNameIgnoreCase(fullName)
                .orElse(null);

        if (repo == null || gitHubSyncService.isStale(repo, detailTtlSeconds)) {
            repo = gitHubSyncService.syncByOwnerAndName(owner, repoName);
        }

        if (repo == null) {
            throw new ResourceNotFoundException("Repository not found: " + fullName);
        }
        return repo;
    }

    public RepositoryDetailResponse getDetail(String owner, String repoName) {
        Repository repo = getOrCreateRepository(owner, repoName);
        return toDetail(repo);
    }

    private RepositorySummaryResponse toSummary(Repository repo) {
        return new RepositorySummaryResponse(
                repo.getId(),
                repo.getFullName(),
                repo.getOwner(),
                repo.getDescription(),
                repo.getStars(),
                repo.getForks(),
                repo.getTopics().stream().map(t -> t.getTopic()).toList(),
                repo.getRepoPushedAt()
        );
    }

    private RepositoryDetailResponse toDetail(Repository repo) {
        Map<String, Double> languageBreakdown = repo.getLanguages().stream()
                .collect(java.util.stream.Collectors.toMap(
                        l -> l.getLanguage(),
                        l -> l.getPercentage() != null ? l.getPercentage().doubleValue() : 0.0));

        return new RepositoryDetailResponse(
                repo.getId(),
                repo.getFullName(),
                repo.getOwner(),
                repo.getDescription(),
                repo.getStars(),
                repo.getForks(),
                repo.getOpenIssues(),
                repo.getPrimaryLanguage(),
                repo.getReadmePreview(),
                repo.getTopics().stream().map(t -> t.getTopic()).toList(),
                languageBreakdown,
                repo.getRepoCreatedAt(),
                repo.getRepoPushedAt()
        );
    }
}
