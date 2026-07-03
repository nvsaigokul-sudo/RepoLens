package com.titansearch.repository;

import com.titansearch.entity.HealthScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface HealthScoreRepository extends JpaRepository<HealthScore, Long> {

    Optional<HealthScore> findByRepositoryId(Long repositoryId);

    @Modifying
    @Query("DELETE FROM HealthScore h WHERE h.repository.id = :repoId")
    void deleteByRepositoryId(@Param("repoId") Long repositoryId);
}
