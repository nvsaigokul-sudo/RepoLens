package com.titansearch.controller;

import com.titansearch.dto.response.ApiEnvelope;
import com.titansearch.dto.response.RepositorySummaryResponse;
import com.titansearch.entity.Repository;
import com.titansearch.entity.User;
import com.titansearch.entity.UserFavorite;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.repository.UserFavoriteRepository;
import com.titansearch.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
@Tag(name = "Favorites", description = "Manage user's saved repositories")
public class FavoritesController {

    private final UserFavoriteRepository userFavoriteRepository;
    private final UserRepository userRepository;
    private final RepositoryRepository repositoryRepository;

    @GetMapping
    @Operation(summary = "List saved repositories for the authenticated user")
    public ResponseEntity<ApiEnvelope<List<RepositorySummaryResponse>>> listFavorites() {
        User user = getAuthenticatedUser();
        List<UserFavorite> favorites = userFavoriteRepository.findByUserId(user.getId());

        List<RepositorySummaryResponse> summaries = favorites.stream()
                .map(f -> {
                    Repository repo = f.getRepository();
                    return new RepositorySummaryResponse(
                            repo.getId(),
                            repo.getFullName(),
                            repo.getOwner(),
                            repo.getDescription(),
                            repo.getStars(),
                            repo.getForks(),
                            repo.getTopics().stream().map(t -> t.getTopic()).toList(),
                            repo.getRepoPushedAt()
                    );
                })
                .toList();

        return ResponseEntity.ok(ApiEnvelope.ok(summaries));
    }

    @PostMapping("/{repositoryId}")
    @Operation(summary = "Save a repository to favorites")
    public ResponseEntity<ApiEnvelope<String>> addFavorite(@PathVariable Long repositoryId) {
        User user = getAuthenticatedUser();
        Repository repository = repositoryRepository.findById(repositoryId)
                .orElseThrow(() -> new IllegalArgumentException("Repository not found with id: " + repositoryId));

        if (!userFavoriteRepository.existsByUserIdAndRepositoryId(user.getId(), repositoryId)) {
            UserFavorite fav = UserFavorite.builder()
                    .user(user)
                    .repository(repository)
                    .build();
            userFavoriteRepository.save(fav);
        }

        return ResponseEntity.ok(ApiEnvelope.ok("Repository favorited successfully"));
    }

    @DeleteMapping("/{repositoryId}")
    @Operation(summary = "Remove a repository from favorites")
    public ResponseEntity<ApiEnvelope<String>> removeFavorite(@PathVariable Long repositoryId) {
        User user = getAuthenticatedUser();
        UserFavorite fav = userFavoriteRepository.findByUserIdAndRepositoryId(user.getId(), repositoryId)
                .orElseThrow(() -> new IllegalArgumentException("Favorite record not found"));

        userFavoriteRepository.delete(fav);
        return ResponseEntity.ok(ApiEnvelope.ok("Repository removed from favorites"));
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
