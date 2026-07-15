package com.titansearch.service.analysis;

import com.titansearch.dto.response.TechStackDto;
import com.titansearch.service.github.GitHubClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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

    public List<TechStackDto> detectTechStack(String owner, String repoName, String primaryLanguage, String description) {
        List<TechStackDto> detections = new ArrayList<>();

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
        if (hasPom || hasGradle || "Java".equalsIgnoreCase(primaryLanguage)) {
            detections.add(new TechStackDto("BACKEND", "Java", 1.0));
            
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
                detections.add(new TechStackDto("BACKEND", "Spring Boot", 1.0));
                String searchString = hasPom ? gitHubClient.getRawFileContent(owner, repoName, "pom.xml") : gitHubClient.getRawFileContent(owner, repoName, "build.gradle");
                if (searchString.contains("postgresql") || searchString.contains("org.postgresql")) {
                    detections.add(new TechStackDto("DATABASE", "PostgreSQL", 0.95));
                } else if (searchString.contains("mysql")) {
                    detections.add(new TechStackDto("DATABASE", "MySQL", 0.95));
                }
                if (searchString.contains("redis") || searchString.contains("spring-boot-starter-data-redis")) {
                    detections.add(new TechStackDto("DATABASE", "Redis", 0.9));
                }
            }
        }

        // 2. JavaScript / TypeScript (Node.js, React, Vue, Angular, Express)
        if (hasPackageJson || "JavaScript".equalsIgnoreCase(primaryLanguage) || "TypeScript".equalsIgnoreCase(primaryLanguage)) {
            double nodeConf = hasPackageJson ? 0.9 : 0.6;
            detections.add(new TechStackDto("BACKEND", "Node.js", nodeConf));

            if (hasPackageJson) {
                String packageContent = gitHubClient.getRawFileContent(owner, repoName, "package.json");
                boolean isExpress = packageContent.contains("\"express\"");
                boolean isReact = packageContent.contains("\"react\"");
                boolean isVue = packageContent.contains("\"vue\"");
                boolean isAngular = packageContent.contains("\"@angular/core\"");

                if (isExpress) {
                    detections.add(new TechStackDto("BACKEND", "Express", 1.0));
                }
                if (isReact) {
                    detections.add(new TechStackDto("FRONTEND", "React", 1.0));
                }
                if (isVue) {
                    detections.add(new TechStackDto("FRONTEND", "Vue", 1.0));
                }
                if (isAngular) {
                    detections.add(new TechStackDto("FRONTEND", "Angular", 1.0));
                }
                
                // DB checks
                if (packageContent.contains("\"pg\"") || packageContent.contains("\"sequelize\"") || packageContent.contains("\"prisma\"")) {
                    detections.add(new TechStackDto("DATABASE", "PostgreSQL", 0.8));
                }
                if (packageContent.contains("\"redis\"") || packageContent.contains("\"ioredis\"")) {
                    detections.add(new TechStackDto("DATABASE", "Redis", 0.8));
                }
                if (packageContent.contains("\"mongodb\"") || packageContent.contains("\"mongoose\"")) {
                    detections.add(new TechStackDto("DATABASE", "MongoDB", 0.9));
                }
            }
        }

        // 3. Python (Django, Flask, FastAPI)
        if (hasRequirements || hasPyproject || "Python".equalsIgnoreCase(primaryLanguage)) {
            detections.add(new TechStackDto("BACKEND", "Python", 1.0));

            String searchStr = "";
            if (hasRequirements) {
                searchStr = gitHubClient.getRawFileContent(owner, repoName, "requirements.txt");
            } else if (hasPyproject) {
                searchStr = gitHubClient.getRawFileContent(owner, repoName, "pyproject.toml");
            }

            if (!searchStr.isEmpty()) {
                if (searchStr.toLowerCase().contains("django")) {
                    detections.add(new TechStackDto("BACKEND", "Django", 1.0));
                }
                if (searchStr.toLowerCase().contains("flask")) {
                    detections.add(new TechStackDto("BACKEND", "Flask", 1.0));
                }
                if (searchStr.toLowerCase().contains("fastapi")) {
                    detections.add(new TechStackDto("BACKEND", "FastAPI", 1.0));
                }
                if (searchStr.toLowerCase().contains("psycopg2") || searchStr.toLowerCase().contains("postgresql")) {
                    detections.add(new TechStackDto("DATABASE", "PostgreSQL", 0.9));
                }
                if (searchStr.toLowerCase().contains("redis")) {
                    detections.add(new TechStackDto("DATABASE", "Redis", 0.8));
                }
            }
        }

        // 4. Docker & Kubernetes
        if (hasDockerfile || hasDockerCompose) {
            detections.add(new TechStackDto("INFRA", "Docker", 1.0));
        }

        if (hasK8sDir) {
            detections.add(new TechStackDto("INFRA", "Kubernetes", 1.0));
        } else {
            for (String file : files) {
                if (file.endsWith(".yaml") || file.endsWith(".yml")) {
                    String yamlContent = gitHubClient.getRawFileContent(owner, repoName, file);
                    if (yamlContent.contains("apiVersion:") && yamlContent.contains("kind:")) {
                        detections.add(new TechStackDto("INFRA", "Kubernetes", 0.9));
                        break;
                    }
                }
            }
        }

        return detections;
    }
}
