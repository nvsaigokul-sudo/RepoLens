# Stage 1: Build React SPA
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY repolens-frontend/package*.json ./
RUN npm install
COPY repolens-frontend/ ./
RUN npm run build

# Stage 2: Build Spring Boot Backend
FROM maven:3.9-amazoncorretto-21 AS backend-build
WORKDIR /app
COPY repolens-backend/pom.xml ./
RUN mvn dependency:go-offline
COPY repolens-backend/ ./
# Copy React compiled assets into Spring Boot static resources folder
COPY --from=frontend-build /app/dist/ ./src/main/resources/static/
RUN mvn clean package -DskipTests

# Stage 3: Run Application
FROM amazoncorretto:21-alpine
WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "app.jar"]
