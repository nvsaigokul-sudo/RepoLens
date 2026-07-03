package com.titansearch.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "similar_repositories", uniqueConstraints = {
        @UniqueConstraint(name = "uq_similar_pair", columnNames = {"repository_id", "similar_repository_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimilarRepository {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "similar_repository_id", nullable = false)
    private Repository similarRepository;

    @Column(name = "similarity_score", nullable = false, precision = 4, scale = 3)
    private BigDecimal similarityScore;

    @Column(length = 255)
    private String reason;
}
