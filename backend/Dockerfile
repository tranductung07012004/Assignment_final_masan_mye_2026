# ========== Stage 1: Build ==========
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /build

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline

# Build
COPY src ./src
RUN mvn clean package -DskipTests

# ========== Stage 2: Runtime ==========
FROM eclipse-temurin:17-jre

WORKDIR /app
COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
