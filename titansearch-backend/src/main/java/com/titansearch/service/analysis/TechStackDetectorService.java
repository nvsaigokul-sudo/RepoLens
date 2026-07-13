package com.titansearch.service.analysis;

import com.titansearch.entity.Repository;
import com.titansearch.entity.TechStackDetection;
import com.titansearch.repository.TechStackDetectionRepository;
import com.titansearch.service.github.GitHubClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TechStackDetectorService {

    private final GitHubClient gitHubClient;
    private final TechStackDetectionRepository techStackDetectionRepository;

    @Transactional
    public List<TechStackDetection> detectAndSave(Repository repository) {
        // Clear previous detections
        techStackDetectionRepository.deleteByRepositoryId(repository.getId());

        List<TechStackDetection> detections = detectTechStack(repository);
        return techStackDetectionRepository.saveAll(detections);
    }

    public List<TechStackDetection> detectTechStack(Repository repository) {
        List<TechStackDetection> detections = new ArrayList<>();
        String fullName = repository.getFullName();
        String[] parts = fullName.split("/");
        if (parts.length < 2) return detections;
        String owner = parts[0];
        String repoName = parts[1];

        // Fetch directory contents of the root
        List<Map<String, Object>> contents = gitHubClient.getDirectoryContents(owner, repoName, "");
        
        Set<String> files = contents.stream()
                .filter(item -> "file".equals(item.get("type")))
                .map(item -> (String) item.get("name"))
                .collect(Collectors.toSet());

        Set<String> dirs = contents.stream()
                .filter(item -> "dir".equals(item.get("type")))
                .map(item -> (String) item.get("name"))
                .collect(Collectors.toSet());

        boolean hasPom = files.contains("pom.xml");
        boolean hasGradle = files.contains("build.gradle") || files.contains("build.gradle.kts");
        boolean hasPackageJson = files.contains("package.json");
        boolean hasRequirements = files.contains("requirements.txt");
        boolean hasPyproject = files.contains("pyproject.toml");
        boolean hasDockerfile = files.contains("Dockerfile");
        boolean hasDockerCompose = files.contains("docker-compose.yml") || files.contains("docker-compose.yaml");
        boolean hasK8sDir = dirs.contains("k8s") || dirs.contains("kubernetes") || dirs.contains("charts");

        // 1. Java & Spring Boot
        if (hasPom || hasGradle || "Java".equalsIgnoreCase(repository.getPrimaryLanguage())) {
            detections.add(createDetection(repository, TechStackDetection.Category.BACKEND, "Java", 1.0));
            
            // Check for Spring Boot
            boolean isSpringBoot = false;
            if (hasPom) {
                String pomContent = gitHubClient.getRawFileContent(owner, repoName, "pom.xml");
                if (pomContent.contains("spring-boot") || pomContent.contains("org.springframework.boot")) {
                    isSpringBoot = true;
                }
            } else if (hasGradle) {
                String gradleContent = gitHubClient.getRawFileContent(owner, repoName, "build.gradle");
                if (gradleContent.contains("spring-boot") || gradleContent.contains("org.springframework.boot") || gradleContent.contains("io.spring.dependency-management")) {
                    isSpringBoot = true;
                }
            }
            
            if (isSpringBoot) {
                detections.add(createDetection(repository, TechStackDetection.Category.BACKEND, "Spring Boot", 1.0));
                // Add PostgreSQL/MySQL check if in dependencies
                String searchString = hasPom ? gitHubClient.getRawFileContent(owner, repoName, "pom.xml") : gitHubClient.getRawFileContent(owner, repoName, "build.gradle");
                if (searchString.contains("postgresql") || searchString.contains("org.postgresql")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.DATABASE, "PostgreSQL", 0.95));
                } else if (searchString.contains("mysql")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.DATABASE, "MySQL", 0.95));
                }
                if (searchString.contains("redis") || searchString.contains("spring-boot-starter-data-redis")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.DATABASE, "Redis", 0.9));
                }
            }
        }

        // 2. JavaScript / TypeScript (Node.js, React, Vue, Angular, Express)
        if (hasPackageJson || "JavaScript".equalsIgnoreCase(repository.getPrimaryLanguage()) || "TypeScript".equalsIgnoreCase(repository.getPrimaryLanguage())) {
            double nodeConf = hasPackageJson ? 0.9 : 0.6;
            detections.add(createDetection(repository, TechStackDetection.Category.BACKEND, "Node.js", nodeConf));

            if (hasPackageJson) {
                String packageContent = gitHubClient.getRawFileContent(owner, repoName, "package.json");
                boolean isExpress = packageContent.contains("\"express\"");
                boolean isReact = packageContent.contains("\"react\"");
                boolean isVue = packageContent.contains("\"vue\"");
                boolean isAngular = packageContent.contains("\"@angular/core\"");

                if (isExpress) {
                    detections.add(createDetection(repository, TechStackDetection.Category.BACKEND, "Express", 1.0));
                }
                if (isReact) {
                    detections.add(createDetection(repository, TechStackDetection.Category.FRONTEND, "React", 1.0));
                }
                if (isVue) {
                    detections.add(createDetection(repository, TechStackDetection.Category.FRONTEND, "Vue", 1.0));
                }
                if (isAngular) {
                    detections.add(createDetection(repository, TechStackDetection.Category.FRONTEND, "Angular", 1.0));
                }
                
                // DB checks
                if (packageContent.contains("\"pg\"") || packageContent.contains("\"sequelize\"") || packageContent.contains("\"prisma\"")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.DATABASE, "PostgreSQL", 0.8));
                }
                if (packageContent.contains("\"redis\"") || packageContent.contains("\"ioredis\"")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.DATABASE, "Redis", 0.8));
                }
                if (packageContent.contains("\"mongodb\"") || packageContent.contains("\"mongoose\"")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.DATABASE, "MongoDB", 0.9));
                }
            }
        }

        // 3. Python (Django, Flask, FastAPI)
        if (hasRequirements || hasPyproject || "Python".equalsIgnoreCase(repository.getPrimaryLanguage())) {
            detections.add(createDetection(repository, TechStackDetection.Category.BACKEND, "Python", 1.0));

            String searchStr = "";
            if (hasRequirements) {
                searchStr = gitHubClient.getRawFileContent(owner, repoName, "requirements.txt");
            } else if (hasPyproject) {
                searchStr = gitHubClient.getRawFileContent(owner, repoName, "pyproject.toml");
            }

            if (!searchStr.isEmpty()) {
                if (searchStr.toLowerCase().contains("django")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.BACKEND, "Django", 1.0));
                }
                if (searchStr.toLowerCase().contains("flask")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.BACKEND, "Flask", 1.0));
                }
                if (searchStr.toLowerCase().contains("fastapi")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.BACKEND, "FastAPI", 1.0));
                }
                if (searchStr.toLowerCase().contains("psycopg2") || searchStr.toLowerCase().contains("postgresql")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.DATABASE, "PostgreSQL", 0.9));
                }
                if (searchStr.toLowerCase().contains("redis")) {
                    detections.add(createDetection(repository, TechStackDetection.Category.DATABASE, "Redis", 0.8));
                }
            }
        }

        // 4. Docker & Kubernetes
        if (hasDockerfile || hasDockerCompose) {
            detections.add(createDetection(repository, TechStackDetection.Category.INFRA, "Docker", 1.0));
        }

        if (hasK8sDir) {
            detections.add(createDetection(repository, TechStackDetection.Category.INFRA, "Kubernetes", 1.0));
        } else {
            // Check if any yaml files inside root contain apiVersion
            for (String file : files) {
                if (file.endsWith(".yaml") || file.endsWith(".yml")) {
                    String yamlContent = gitHubClient.getRawFileContent(owner, repoName, file);
                    if (yamlContent.contains("apiVersion:") && yamlContent.contains("kind:")) {
                        detections.add(createDetection(repository, TechStackDetection.Category.INFRA, "Kubernetes", 0.9));
                        break;
                    }
                }
            }
        }

        return detections;
    }

    private TechStackDetection createDetection(Repository repository, TechStackDetection.Category category, String technology, double confidence) {
        return TechStackDetection.builder()
                .repository(repository)
                .category(category)
                .technology(technology)
                .confidence(BigDecimal.valueOf(confidence))
                .build();
    }
}
