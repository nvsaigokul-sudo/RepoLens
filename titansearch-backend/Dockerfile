# --- Build stage ---
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -B
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# --- Runtime stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S titansearch && adduser -S titansearch -G titansearch
COPY --from=build /app/target/titansearch-backend-*.jar app.jar
USER titansearch
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
