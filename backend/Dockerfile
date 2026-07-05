# syntax=docker/dockerfile:1
#
# Multi-stage build for the Engram Spring Boot backend.
# Published as a multi-arch image (amd64 + arm64) to GHCR by CI on tag push,
# then pulled and run on the self-hosted host behind a Cloudflare Tunnel.

### --- Build stage: compile the fat jar with JDK 21 + Maven ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Resolve dependencies first so this layer is cached across source-only changes.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B -DskipTests clean package \
    && cp target/engram-*.jar /build/app.jar

### --- Runtime stage: slim JRE, non-root, data on a volume ---
FROM eclipse-temurin:21-jre
WORKDIR /app

# Run as an unprivileged user.
RUN groupadd -r engram && useradd -r -g engram -d /app engram

COPY --from=build /build/app.jar /app/app.jar

# SQLite DB (WAL), attachments and backups all live under /app/data -> volume.
RUN mkdir -p /app/data && chown -R engram:engram /app
USER engram

ENV ENGRAM_PORT=8080 \
    ENGRAM_DB_PATH=/app/data/engram.db \
    ENGRAM_ATTACHMENTS_DIR=/app/data/attachments \
    ENGRAM_BACKUP_DIR=/app/data/backups \
    JAVA_OPTS="-XX:MaxRAMPercentage=75.0"

EXPOSE 8080
VOLUME ["/app/data"]

# No actuator (lean deps by design): a TCP check on the port is enough to know
# the app is up. bash + /dev/tcp is present in the Ubuntu-based temurin image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD bash -c ': < /dev/tcp/127.0.0.1/8080' || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
