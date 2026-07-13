package com.titansearch.repository;

import com.titansearch.entity.SimilarRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SimilarRepositoryRepository extends JpaRepository<SimilarRepository, Long> {
    List<SimilarRepository> findByRepositoryIdOrderBySimilarityScoreDesc(Long repositoryId);
    Optional<SimilarRepository> findByRepositoryIdAndSimilarRepositoryId(Long repositoryId, Long similarRepositoryId);
    void deleteByRepositoryId(Long repositoryId);
}
