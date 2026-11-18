FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN groupadd --gid 10001 insureit && useradd --uid 10001 --gid 10001 --no-create-home insureit
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
ENV SERVER_ADDRESS=0.0.0.0 SPRING_PROFILES_ACTIVE=production
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70.0", "-jar", "/app/app.jar"]
