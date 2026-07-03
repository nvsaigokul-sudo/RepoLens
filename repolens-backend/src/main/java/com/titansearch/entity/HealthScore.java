package com.titansearch.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "health_scores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false, unique = true)
    private Repository repository;

    @Column(name = "overall_score", nullable = false)
    private Integer overallScore;

    @Column(name = "documentation_score", nullable = false)
    private Integer documentationScore;

    @Column(name = "commit_activity_score", nullable = false)
    private Integer commitActivityScore;

    @Column(name = "issues_score", nullable = false)
    private Integer issuesScore;

    @Column(name = "popularity_score", nullable = false)
    private Integer popularityScore;

    @Column(name = "maturity_score", nullable = false)
    private Integer maturityScore;

    @Column(name = "computed_at", nullable = false)
    private Instant computedAt;

    @PrePersist
    void onCreate() {
        computedAt = Instant.now();
    }
}
