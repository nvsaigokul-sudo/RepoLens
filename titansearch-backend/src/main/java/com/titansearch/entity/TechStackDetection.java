package com.titansearch.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "tech_stack_detections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TechStackDetection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Category category;

    @Column(nullable = false, length = 50)
    private String technology;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal confidence;

    @Column(name = "detected_at", nullable = false)
    @Builder.Default
    private Instant detected_at = Instant.now();

    public enum Category {
        FRONTEND, BACKEND, DATABASE, INFRA
    }
}
