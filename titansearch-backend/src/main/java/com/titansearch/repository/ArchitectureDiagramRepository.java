package com.titansearch.repository;

import com.titansearch.entity.ArchitectureDiagram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ArchitectureDiagramRepository extends JpaRepository<ArchitectureDiagram, Long> {
    Optional<ArchitectureDiagram> findByRepositoryId(Long repositoryId);
}
