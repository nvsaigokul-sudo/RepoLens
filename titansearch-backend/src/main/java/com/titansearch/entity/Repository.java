package com.titansearch.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "repositories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Repository {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "github_id", nullable = false, unique = true)
    private Long githubId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String owner;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    private Integer stars = 0;

    @Builder.Default
    private Integer forks = 0;

    @Column(name = "open_issues")
    @Builder.Default
    private Integer openIssues = 0;

    @Column(name = "primary_language")
    private String primaryLanguage;

    @Column(name = "readme_preview", columnDefinition = "TEXT")
    private String readmePreview;

    @Column(name = "repo_created_at")
    private Instant repoCreatedAt;

    @Column(name = "repo_pushed_at")
    private Instant repoPushedAt;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "default_branch")
    @Builder.Default
    private String defaultBranch = "main";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "repository", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RepoTopic> topics = new ArrayList<>();

    @OneToMany(mappedBy = "repository", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RepoLanguage> languages = new ArrayList<>();

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
