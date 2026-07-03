package com.titansearch.repository;

import com.titansearch.entity.ResumeAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResumeAnalysisRepository extends JpaRepository<ResumeAnalysis, Long> {

    List<ResumeAnalysis> findByRepositoryId(Long repositoryId);

    Optional<ResumeAnalysis> findByRepositoryIdAndUserId(Long repositoryId, Long userId);
}
