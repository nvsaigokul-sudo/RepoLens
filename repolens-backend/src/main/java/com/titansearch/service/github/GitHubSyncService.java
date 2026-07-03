package com.titansearch.service.github;

import com.titansearch.entity.Repository;
import com.titansearch.entity.RepoLanguage;
import com.titansearch.entity.RepoTopic;
import com.titansearch.repository.RepositoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Upserts GitHub API data into TitanSearch's own repositories table.
 * Language-percentage breakdown is fetched separately in Phase 3
 * (GitHub's /languages endpoint) — Phase 2 stores primary language only.
 */
@Service
@RequiredArgsConstructor
public class GitHubSyncService {

    private final RepositoryRepository repositoryRepository;
    private final GitHubClient gitHubClient;

    @Transactional
    public Repository syncByOwnerAndName(String owner, String repoName) {
        GitHubRepoDto dto = gitHubClient.getRepository(owner, repoName);
        return upsert(dto);
    }

    @Transactional
    public Repository upsert(GitHubRepoDto dto) {
        Optional<Repository> existing = repositoryRepository.findByGithubId(dto.id());

        Repository repo = existing.orElseGet(Repository::new);
        repo.setGithubId(dto.id());
        repo.setFullName(dto.fullName());
        repo.setOwner(dto.owner() != null ? dto.owner().login() : dto.fullName().split("/")[0]);
        repo.setDescription(dto.description());
        repo.setStars(dto.stars() != null ? dto.stars() : 0);
        repo.setForks(dto.forks() != null ? dto.forks() : 0);
        repo.setOpenIssues(dto.openIssues() != null ? dto.openIssues() : 0);
        repo.setPrimaryLanguage(dto.language());
        repo.setRepoCreatedAt(dto.createdAt());
        repo.setRepoPushedAt(dto.pushedAt());
        repo.setLastSyncedAt(Instant.now());
        repo.setDefaultBranch(dto.defaultBranch() != null ? dto.defaultBranch() : "main");

        if (dto.topics() != null) {
            repo.getTopics().clear();
            for (String topic : dto.topics()) {
                repo.getTopics().add(RepoTopic.builder().repository(repo).topic(topic).build());
            }
        }

        return repositoryRepository.save(repo);
    }

    public boolean isStale(Repository repo, long ttlSeconds) {
        if (repo.getLastSyncedAt() == null) return true;
        return repo.getLastSyncedAt().plusSeconds(ttlSeconds).isBefore(Instant.now());
    }
}
