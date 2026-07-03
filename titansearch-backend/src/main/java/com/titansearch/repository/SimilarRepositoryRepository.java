package com.titansearch.repository;

import com.titansearch.entity.SimilarRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SimilarRepositoryRepository extends JpaRepository<SimilarRepository, Long> {

    @Query("SELECT s FROM SimilarRepository s JOIN FETCH s.similarRepository WHERE s.repository.id = :repoId ORDER BY s.similarityScore DESC")
    List<SimilarRepository> findByRepositoryIdOrderBySimilarityScoreDesc(@Param("repoId") Long repositoryId);

    @Modifying
    @Query("DELETE FROM SimilarRepository s WHERE s.repository.id = :repoId")
    void deleteByRepositoryId(@Param("repoId") Long repositoryId);
}
