# syntax=docker/dockerfile:1
# Build context: repository ROOT (so both server/ and supabase/migrations are visible).
#   docker build -f server/Dockerfile -t stw-api .

FROM node:22-alpine AS deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    MIGRATIONS_DIR=/migrations
WORKDIR /app/server

COPY --from=deps /app/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY server/scripts ./scripts
# Shared frontend engine modules imported relatively by server/src/services (../../../src/lib)
COPY src/lib /app/src/lib
COPY src/types /app/src/types
# Schema migrations, applied by the entrypoint before the server starts
COPY supabase/migrations /migrations

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health >/dev/null 2>&1 || exit 1

# Apply pending migrations, then start the API (all env from the platform — never bake .env)
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && exec npx tsx src/server.ts"]
