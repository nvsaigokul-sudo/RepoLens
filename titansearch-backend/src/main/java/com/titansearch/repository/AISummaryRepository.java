package com.titansearch.repository;

import com.titansearch.entity.AISummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AISummaryRepository extends JpaRepository<AISummary, Long> {

    Optional<AISummary> findByRepositoryId(Long repositoryId);

    @Modifying
    @Query("DELETE FROM AISummary a WHERE a.repository.id = :repoId")
    void deleteByRepositoryId(@Param("repoId") Long repositoryId);
}
