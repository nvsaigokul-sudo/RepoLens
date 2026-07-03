package com.titansearch.service.analysis;

import com.titansearch.entity.TechCategory;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.List;

@Getter
@RequiredArgsConstructor
public enum TechSignature {

    SPRING_BOOT("pom.xml", TechCategory.BACKEND, "Spring Boot", 0.30, List.of("spring-boot-starter", "org.springframework.boot")),
    SPRING_BOOT_GRADLE("build.gradle", TechCategory.BACKEND, "Spring Boot", 0.30, List.of("spring-boot", "org.springframework.boot")),
    
    REACT("package.json", TechCategory.FRONTEND, "React", 0.30, List.of("\"react\"")),
    VUE("package.json", TechCategory.FRONTEND, "Vue", 0.30, List.of("\"vue\"")),
    ANGULAR("package.json", TechCategory.FRONTEND, "Angular", 0.30, List.of("\"@angular/core\"")),
    NODE_EXPRESS("package.json", TechCategory.BACKEND, "Node.js", 0.30, List.of("\"express\"", "\"koa\"", "\"nestjs\"")),
    
    DJANGO("requirements.txt", TechCategory.BACKEND, "Django", 0.30, List.of("django", "Django")),
    FLASK("requirements.txt", TechCategory.BACKEND, "Flask", 0.30, List.of("flask", "Flask")),
    FASTAPI("requirements.txt", TechCategory.BACKEND, "FastAPI", 0.30, List.of("fastapi", "FastAPI")),
    
    DJANGO_PYPROJECT("pyproject.toml", TechCategory.BACKEND, "Django", 0.30, List.of("django", "Django")),
    FLASK_PYPROJECT("pyproject.toml", TechCategory.BACKEND, "Flask", 0.30, List.of("flask", "Flask")),
    FASTAPI_PYPROJECT("pyproject.toml", TechCategory.BACKEND, "FastAPI", 0.30, List.of("fastapi", "FastAPI")),
    
    POSTGRESQL_POM("pom.xml", TechCategory.DATABASE, "PostgreSQL", 0.20, List.of("postgresql", "org.postgresql")),
    MYSQL_POM("pom.xml", TechCategory.DATABASE, "MySQL", 0.20, List.of("mysql-connector", "mysql")),
    MONGODB_POM("pom.xml", TechCategory.DATABASE, "MongoDB", 0.20, List.of("mongodb", "mongo-java-driver")),
    REDIS_POM("pom.xml", TechCategory.DATABASE, "Redis", 0.20, List.of("spring-boot-starter-data-redis", "jedis", "lettuce")),
    
    POSTGRESQL_NPM("package.json", TechCategory.DATABASE, "PostgreSQL", 0.20, List.of("\"pg\"", "\"postgres\"")),
    MYSQL_NPM("package.json", TechCategory.DATABASE, "MySQL", 0.20, List.of("\"mysql\"", "\"mysql2\"")),
    MONGODB_NPM("package.json", TechCategory.DATABASE, "MongoDB", 0.20, List.of("\"mongodb\"", "\"mongoose\"")),
    REDIS_NPM("package.json", TechCategory.DATABASE, "Redis", 0.20, List.of("\"redis\"", "\"ioredis\"")),
    
    POSTGRESQL_PY("requirements.txt", TechCategory.DATABASE, "PostgreSQL", 0.20, List.of("psycopg2", "psycopg")),
    MYSQL_PY("requirements.txt", TechCategory.DATABASE, "MySQL", 0.20, List.of("mysqlclient", "pymysql")),
    MONGODB_PY("requirements.txt", TechCategory.DATABASE, "MongoDB", 0.20, List.of("pymongo", "motor")),
    REDIS_PY("requirements.txt", TechCategory.DATABASE, "Redis", 0.20, List.of("redis")),

    DOCKER_COMPOSE("docker-compose.yml", TechCategory.INFRA, "Docker", 0.95, List.of("version", "services")),
    DOCKERFILE("Dockerfile", TechCategory.INFRA, "Docker", 0.80, List.of("FROM", "RUN", "CMD", "EXPOSE"));

    private final String fileName;
    private final TechCategory category;
    private final String technology;
    private final double defaultConfidence;
    private final List<String> keywords;

    public boolean matchesFile(String path) {
        if (path == null) return false;
        String name = path.substring(path.lastIndexOf('/') + 1);
        return name.equalsIgnoreCase(fileName);
    }
}
