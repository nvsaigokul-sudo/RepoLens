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
    @Column(nullable = false)
    private TechCategory category;

    @Column(nullable = false)
    private String technology;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal confidence;

    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt;

    @PrePersist
    void onCreate() {
        detectedAt = Instant.now();
    }
}
