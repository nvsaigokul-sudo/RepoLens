package com.titansearch.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "repo_languages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepoLanguage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @Column(nullable = false)
    private String language;

    @Column(name = "byte_count")
    @Builder.Default
    private Long byteCount = 0L;

    private BigDecimal percentage;
}
