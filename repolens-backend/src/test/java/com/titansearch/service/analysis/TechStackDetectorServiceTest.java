package com.titansearch.service.analysis;

import com.titansearch.entity.Repository;
import com.titansearch.entity.TechCategory;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.RepositoryRepository;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.github.GitHubClient;
import com.titansearch.service.github.GitHubTreeEntry;
import com.titansearch.service.github.GitHubTreeResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TechStackDetectorServiceTest {

      @Mock private GitHubClient gitHubClient;
      @Mock private TechStackDetectionRepository techStackDetectionRepository;
      @Mock private RepositoryRepository repositoryRepository;

      @InjectMocks private TechStackDetectorService techStackDetectorService;

      @Captor private ArgumentCaptor<List<TechStackDetection>> detectionsCaptor;

      @Test
      void detectStack_matchesSignaturesCorrectly() {
          Repository repo = Repository.builder()
                  .id(1L)
                  .fullName("test/repo")
                  .owner("test")
                  .defaultBranch("main")
                  .build();

          // Mock recursive tree entries
          List<GitHubTreeEntry> entries = List.of(
                  new GitHubTreeEntry("pom.xml", "100644", "blob", "sha1", 100L, "url"),
                  new GitHubTreeEntry("docker-compose.yml", "100644", "blob", "sha2", 100L, "url"),
                  new GitHubTreeEntry("k8s/deployment.yaml", "100644", "blob", "sha3", 100L, "url")
          );
          GitHubTreeResponse treeResponse = new GitHubTreeResponse("tree-sha", "url", entries, false);

          when(gitHubClient.getTree("test", "repo", "main")).thenReturn(treeResponse);
          when(gitHubClient.getRawFileContent("test", "repo", "pom.xml"))
                  .thenReturn("<dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies>");
          when(gitHubClient.getLanguages("test", "repo")).thenReturn(Map.of("Java", 50000L));

          techStackDetectorService.detectStack(repo);

          verify(techStackDetectionRepository).deleteByRepositoryId(repo.getId());
          verify(techStackDetectionRepository).saveAll(detectionsCaptor.capture());

          List<TechStackDetection> saved = detectionsCaptor.getValue();
          assertThat(saved).hasSize(3); // Spring Boot, Docker, Kubernetes

          TechStackDetection sb = saved.stream().filter(d -> d.getTechnology().equals("Spring Boot")).findFirst().orElseThrow();
          assertThat(sb.getCategory()).isEqualTo(TechCategory.BACKEND);
          assertThat(sb.getConfidence()).isEqualByComparingTo(BigDecimal.valueOf(0.950));

          TechStackDetection docker = saved.stream().filter(d -> d.getTechnology().equals("Docker")).findFirst().orElseThrow();
          assertThat(docker.getCategory()).isEqualTo(TechCategory.INFRA);
          assertThat(docker.getConfidence()).isEqualByComparingTo(BigDecimal.valueOf(0.950));

          TechStackDetection k8s = saved.stream().filter(d -> d.getTechnology().equals("Kubernetes")).findFirst().orElseThrow();
          assertThat(k8s.getCategory()).isEqualTo(TechCategory.INFRA);
          assertThat(k8s.getConfidence()).isEqualByComparingTo(BigDecimal.valueOf(0.900));
      }
}
