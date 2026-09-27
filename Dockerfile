# BibleDesk — Production Multi-Stage Dockerfile
# Optimized for Next.js 16 standalone output

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install production & development dependencies for building
RUN npm ci --no-audit --no-fund || npm install --legacy-peer-deps

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time dummy variables for Next.js static asset compilation
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets and built server
COPY --from=builder /app/public ./public

# Set correct permissions
RUN mkdir -p .next data && chown -R nextjs:nodejs .next data

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Guarantee static data and migrations are present in runner
COPY --from=builder --chown=nextjs:nodejs /app/src/data ./src/data
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs

EXPOSE 3000

# Dynamic port health check supporting Railway ($PORT) and local Docker ($PORT:-3000)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-3000}/api/health || exit 1

CMD ["node", "server.js"]
