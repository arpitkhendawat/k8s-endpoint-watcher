# Dockerfile for Deno application
FROM denoland/deno:1.40.0

WORKDIR /app

# Copy source code
COPY src/ ./src/

# Cache dependencies
RUN deno cache src/main.ts

# Create non-root user for security
RUN useradd -m -u 1000 watcher && \
    chown -R watcher:watcher /app

USER watcher

# Set default environment variables
ENV SERVICE_NAME="" \
    NAMESPACE="" \
    APP_ROOT="" \
    CHECK_INTERVAL="5" \
    HTTP_TIMEOUT="5000" \
    LOG_LEVEL="info"

# Health check (optional - checks if process is running)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD pgrep -f "deno run" || exit 1

# Run the application
ENTRYPOINT ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/main.ts"]

