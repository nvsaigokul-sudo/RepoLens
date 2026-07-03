package com.titansearch.repository;

import com.titansearch.entity.TechStackDetection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TechStackDetectionRepository extends JpaRepository<TechStackDetection, Long> {

    List<TechStackDetection> findByRepositoryId(Long repositoryId);

    @Modifying
    @Query("DELETE FROM TechStackDetection t WHERE t.repository.id = :repoId")
    void deleteByRepositoryId(@Param("repoId") Long repositoryId);
}
