# Production Dockerfile for InstiPilot (Next.js 14 + better-sqlite3)
FROM node:20-alpine AS base

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# 1. Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Rebuild the source code & database setup
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Seed initial database structure
RUN npx tsx src/lib/db/seed.ts

# Build Next.js application
RUN npm run build

# 3. Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Required runtime libraries for SQLite
RUN apk add --no-cache libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application and database
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/lib/db ./src/lib/db
COPY --from=builder /app/instipilot.db ./instipilot.db

# Ensure correct permissions for SQLite WAL files
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
