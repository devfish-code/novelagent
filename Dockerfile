# Multi-stage build for NovelAgent

# Stage 1: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build backend
RUN npm run build:server

# Stage 2: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web

# Copy web package files
COPY web/package*.json ./
COPY web/tsconfig.json ./
COPY web/vite.config.ts ./
COPY web/index.html ./

# Install dependencies
RUN npm ci

# Copy web source code
COPY web/src ./src

# Build frontend
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built backend from builder
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend from builder
COPY --from=frontend-builder /app/web/dist ./web/dist

# Copy config example
COPY config.example.yaml ./

# Create necessary directories
RUN mkdir -p logs projects

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Start server
CMD ["node", "dist/server/index.js"]
