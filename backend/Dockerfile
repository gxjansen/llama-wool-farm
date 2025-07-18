# Backend Dockerfile - Multi-stage build for development and production

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 4000

# Development command with nodemon for hot reloading
CMD ["npm", "run", "dev"]

# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application if build script exists
RUN npm run build 2>/dev/null || echo "No build script found, skipping build"

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application (if exists) or source code
COPY --from=build /app/dist ./dist 2>/dev/null || true
COPY --from=build /app/src ./src 2>/dev/null || true
COPY --from=build /app/*.js ./ 2>/dev/null || true

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S express -u 1001

# Change ownership of the app directory
RUN chown -R express:nodejs /app
USER express

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start the application
CMD ["npm", "start"]