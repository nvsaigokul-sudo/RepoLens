package com.titansearch.repository;

import com.titansearch.entity.ArchitectureDiagram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ArchitectureDiagramRepository extends JpaRepository<ArchitectureDiagram, Long> {

    Optional<ArchitectureDiagram> findByRepositoryId(Long repositoryId);

    @Modifying
    @Query("DELETE FROM ArchitectureDiagram a WHERE a.repository.id = :repoId")
    void deleteByRepositoryId(@Param("repoId") Long repositoryId);
}
