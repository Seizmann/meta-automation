# ==========================================
# Builder Stage
# ==========================================
FROM rust:1.86-slim-bookworm AS builder

WORKDIR /usr/src/app

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy source folder to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -f target/release/deps/instragram_automation*

# Copy actual source code
COPY src ./src

# Build for release
RUN cargo build --release

# ==========================================
# Runner Stage
# ==========================================
FROM debian:bookworm-slim

# Install SSL certificates and curl for health check
RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /usr/src/app/target/release/instragram-automation /app/instagram-automation

# EXPOSE the port
EXPOSE 8080

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Run the binary
CMD ["/app/instagram-automation"]
