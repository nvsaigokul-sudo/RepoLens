package com.titansearch.repository;

import com.titansearch.entity.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RepositoryRepository extends JpaRepository<Repository, Long> {

    Optional<Repository> findByGithubId(Long githubId);

    Optional<Repository> findByFullNameIgnoreCase(String fullName);

    @Query("""
        SELECT DISTINCT r FROM Repository r
        LEFT JOIN r.topics t
        WHERE (:q IS NULL OR
               LOWER(r.fullName) LIKE :q OR
               LOWER(r.description) LIKE :q OR
               LOWER(t.topic) LIKE :q)
          AND (:language IS NULL OR LOWER(r.primaryLanguage) = LOWER(:language))
          AND (:minStars IS NULL OR r.stars >= :minStars)
        """)
    Page<Repository> search(@Param("q") String query,
                             @Param("language") String language,
                             @Param("minStars") Integer minStars,
                             Pageable pageable);
}
