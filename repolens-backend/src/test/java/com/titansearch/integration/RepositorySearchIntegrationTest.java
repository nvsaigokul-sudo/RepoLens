package com.titansearch.integration;

import com.titansearch.entity.Repository;
import com.titansearch.repository.RepositoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RepositorySearchIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("titansearch_test")
            .withUsername("titansearch")
            .withPassword("titansearch");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @LocalServerPort int port;

    @Autowired TestRestTemplate restTemplate;
    @Autowired RepositoryRepository repositoryRepository;

    @Test
    void search_returnsIndexedRepository() {
        Repository repo = Repository.builder()
                .githubId(999L)
                .fullName("titansearch/demo-repo")
                .owner("titansearch")
                .description("A demo repository for integration testing")
                .stars(42)
                .forks(3)
                .build();
        repositoryRepository.save(repo);

        ResponseEntity<String> response = restTemplate.getForEntity(
                "/api/v1/repositories/search?q=demo-repo", String.class);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).contains("titansearch/demo-repo");
    }
}
