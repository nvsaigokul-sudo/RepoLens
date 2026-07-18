# Stage 1: Build React SPA
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY titansearch-frontend/package*.json ./
RUN npm install
COPY titansearch-frontend/ ./
RUN npm run build

# Stage 2: Build Spring Boot Backend
FROM maven:3.9-amazoncorretto-21 AS backend-build
WORKDIR /app
COPY titansearch-backend/pom.xml ./
RUN mvn dependency:go-offline
COPY titansearch-backend/ ./
# Copy React compiled assets into Spring Boot static resources folder
COPY --from=frontend-build /app/dist/ ./src/main/resources/static/
# Copy RepoLens desktop executable to static resources for download
COPY RepoLens.exe ./src/main/resources/static/
RUN mvn clean package -DskipTests

# Stage 3: Run Application
FROM amazoncorretto:21-alpine
WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "app.jar"]
