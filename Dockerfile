# ─────────────────────────────────────────────────────────────
# ensage — Dockerfile
# Multi-stage build: deps → build → production runtime
# ─────────────────────────────────────────────────────────────

# Stage 1: install dependencies
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Stage 2: build the SvelteKit app
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: production image
FROM node:22-alpine AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S ensage && adduser -u 1001 -S ensage -G ensage

# Copy the built output (adapter-node produces a standalone server)
COPY --from=builder --chown=ensage:ensage /app/build ./build
COPY --from=builder --chown=ensage:ensage /app/package.json ./package.json

# Create persistent data directories
RUN mkdir -p /data/uploads /data/db && chown -R ensage:ensage /data

USER ensage

# Storage paths mapped to the /data volume
ENV UPLOAD_DIR=/data/uploads
ENV DB_PATH=/data/db/ensage.db
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "build/index.js"]
