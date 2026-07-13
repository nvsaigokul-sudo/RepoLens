package com.titansearch.repository;

import com.titansearch.entity.TechStackDetection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TechStackDetectionRepository extends JpaRepository<TechStackDetection, Long> {
    List<TechStackDetection> findByRepositoryId(Long repositoryId);
    void deleteByRepositoryId(Long repositoryId);
}
