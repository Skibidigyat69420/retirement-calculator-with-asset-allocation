# syntax=docker/dockerfile:1
# Frontend image: builds the Vite SPA and serves it with nginx (SPA fallback).
# Build context: repository ROOT.
#   docker build -f Dockerfile -t stw-frontend .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same pre-build step Vercel runs (vercel.json buildCommand)
RUN node scripts/generate-ips-docs.mjs && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
