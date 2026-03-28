# ─────────────────────────────────────────────────────────────
# ensage — Dockerfile
# Multi-stage build: deps → build → production runtime
# ─────────────────────────────────────────────────────────────

# Stage 1: install all dependencies (for build)
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Stage 1.5: production-only dependencies
FROM oven/bun:1.2-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Stage 2: build the SvelteKit app
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: production image
FROM node:22-alpine AS runner
WORKDIR /app

# Install su-exec for privilege dropping and create non-root user
RUN apk add --no-cache su-exec && \
    addgroup -g 1001 -S ensage && adduser -u 1001 -S ensage -G ensage

# Copy the built output (adapter-node produces a standalone server)
COPY --from=builder --chown=ensage:ensage /app/build ./build
COPY --from=builder --chown=ensage:ensage /app/package.json ./package.json
COPY --from=prod-deps --chown=ensage:ensage /app/node_modules ./node_modules

# Create persistent data directories
RUN mkdir -p /data/uploads /data/db && chown -R ensage:ensage /data

# Storage paths mapped to the /data volume
ENV UPLOAD_DIR=/data/uploads
ENV DB_PATH=/data/db/ensage.db
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Run as root to fix volume permissions, then drop to ensage
COPY --chown=root:root docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "build/index.js"]
