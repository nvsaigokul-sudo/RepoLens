package com.titansearch.repository;

import com.titansearch.entity.UserFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {
    List<UserFavorite> findByUserId(Long userId);
    Optional<UserFavorite> findByUserIdAndRepositoryId(Long userId, Long repositoryId);
    boolean existsByUserIdAndRepositoryId(Long userId, Long repositoryId);
}
