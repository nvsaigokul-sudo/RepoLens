package com.titansearch.repository;

import com.titansearch.entity.ResumeAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeAnalysisRepository extends JpaRepository<ResumeAnalysis, Long> {
    List<ResumeAnalysis> findByRepositoryId(Long repositoryId);
    Optional<ResumeAnalysis> findFirstByRepositoryIdAndUserIdOrderByGeneratedAtDesc(Long repositoryId, Long userId);
}
