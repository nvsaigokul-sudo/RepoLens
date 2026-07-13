package com.titansearch.repository;

import com.titansearch.entity.HealthScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HealthScoreRepository extends JpaRepository<HealthScore, Long> {
    Optional<HealthScore> findByRepositoryId(Long repositoryId);
}
