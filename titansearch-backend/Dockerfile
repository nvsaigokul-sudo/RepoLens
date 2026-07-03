# Stage 1: Build Jar
FROM maven:3.9-amazoncorretto-21 AS build
WORKDIR /app
COPY pom.xml .
# Cache dependencies
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run Jar
FROM amazoncorretto:21-alpine
WORKDIR /app
COPY --from=build /app/target/titansearch-backend-0.1.0-SNAPSHOT.jar app.jar
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "app.jar"]
