package com.titansearch.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "repo_topics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepoTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @Column(nullable = false)
    private String topic;
}
