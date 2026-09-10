# syntax=docker/dockerfile:1
# Standalone image for the public utility API (docker-compose `api-utils`).
# Build context: repository ROOT.
#   docker build -f functions/Dockerfile -t stw-api-utils .

FROM node:22-alpine AS build
WORKDIR /app
# Dev deps (esbuild) are needed only at build time; the runtime bundle is
# self-contained plain Node ESM with zero npm dependencies.
COPY functions/package.json functions/package-lock.json ./functions/
RUN cd functions && npm ci
COPY functions ./functions
COPY api ./api
COPY public/data ./public/data
COPY ips ./ips
COPY data/angel_one ./data/angel_one
RUN cd functions && npm run build

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/app/functions/_staged
WORKDIR /app/functions
COPY --from=build /app/functions/lib ./lib
COPY --from=build /app/functions/_staged ./_staged
COPY functions/standalone-server.mjs ./standalone-server.mjs
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/ping >/dev/null 2>&1 || exit 1
CMD ["node", "standalone-server.mjs"]
