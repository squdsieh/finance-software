# =============================================================================
# CloudBooks Pro - Multi-Stage Docker Build
# =============================================================================
#
# Stages:
#   1. builder   - Install dependencies and build all packages
#   2. backend   - Production Node.js backend server
#   3. frontend  - Production Nginx server for the SPA
#
# Build commands:
#   docker build --target backend  -t cloudbooks-backend  .
#   docker build --target frontend -t cloudbooks-frontend .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install build tools needed by some native npm packages (e.g., sharp, bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root package files and workspace package.json files first
# to leverage Docker layer caching for npm ci
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

RUN npm ci

# Copy all source code
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
COPY packages/frontend/ ./packages/frontend/

# Build in dependency order: shared -> backend + frontend
RUN npm run build -w packages/shared
RUN npm run build -w packages/backend
RUN npm run build -w packages/frontend

# Prune dev dependencies for a leaner production image
RUN npm prune --production

# ---------------------------------------------------------------------------
# Stage 2: Production Backend
# ---------------------------------------------------------------------------
FROM node:20-alpine AS backend

# Security: run as non-root user
RUN addgroup -S cloudbooks && adduser -S cloudbooks -G cloudbooks

WORKDIR /app

# Copy built backend and shared dist
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package.json ./package.json
COPY --from=builder /app/packages/shared/dist ./shared
COPY --from=builder /app/packages/shared/package.json ./shared/package.json

# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules

# Create directories for uploads and logs
RUN mkdir -p uploads logs temp && chown -R cloudbooks:cloudbooks /app

USER cloudbooks

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]

# ---------------------------------------------------------------------------
# Stage 3: Production Frontend (Nginx)
# ---------------------------------------------------------------------------
FROM nginx:alpine AS frontend

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built frontend assets
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security: run Nginx as non-root
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
