# Docker Development Environment Setup Guide

This guide explains how to use the Docker development environment for the Llama Wool Farm project.

## Quick Start

```bash
# Start development environment
./scripts/docker-start.sh dev

# Or with Docker Compose directly
docker-compose up -d
```

## Environment Overview

### Development Environment (`docker-compose.yml`)
- **Frontend**: React app with hot reloading on port 3000
- **Backend**: Node.js/Express API with nodemon on port 4000
- **Nginx**: Reverse proxy on port 80
- **Redis**: Cache server on port 6379
- **Features**: Hot reloading, volume mounts, development tools

### Production Environment (`docker-compose.prod.yml`)
- **Frontend**: Optimized build served by Nginx
- **Backend**: Production-ready Node.js server
- **Nginx**: Production configuration with SSL support
- **Redis**: Production Redis with persistence
- **Features**: Multi-stage builds, health checks, logging, security headers

## Services

### Frontend Service
- **Development**: Hot reloading with volume mounts
- **Production**: Optimized build with nginx serving
- **URL**: http://localhost:3000 (dev) or http://localhost:80 (prod)

### Backend Service
- **Development**: Nodemon for auto-restart
- **Production**: PM2 or standard Node.js start
- **URL**: http://localhost:4000 (dev) or http://localhost:80/api (prod)

### Nginx Service
- **Development**: Reverse proxy with CORS support
- **Production**: SSL termination, compression, caching
- **URL**: http://localhost:80

### Redis Service
- **Development**: Basic Redis with data persistence
- **Production**: Production Redis with custom configuration
- **URL**: redis://localhost:6379

## Commands

### Using Scripts (Recommended)

```bash
# Start development environment
./scripts/docker-start.sh dev

# Start production environment
./scripts/docker-start.sh prod

# Build development images
./scripts/docker-build.sh dev

# Build production images
./scripts/docker-build.sh prod --no-cache

# Build with options
./scripts/docker-build.sh prod --no-cache --pull
```

### Using Docker Compose Directly

```bash
# Development
docker-compose up -d                    # Start all services
docker-compose up -d frontend          # Start specific service
docker-compose logs -f                 # View logs
docker-compose restart backend         # Restart service
docker-compose down                     # Stop all services

# Production
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml down
```

## File Structure

```
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production environment
├── Dockerfile                  # Frontend container
├── backend/Dockerfile          # Backend container
├── .dockerignore              # Docker ignore patterns
├── nginx/
│   ├── nginx.conf             # Development nginx config
│   └── nginx.prod.conf        # Production nginx config (create manually)
├── scripts/
│   ├── docker-start.sh        # Startup script
│   └── docker-build.sh        # Build script
└── .env                       # Environment variables
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/llama_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Redis
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
```

## Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# View health status
docker inspect <container_name> | grep -A 10 "Health"
```

## Volumes and Data Persistence

### Development
- Source code is mounted as volumes for hot reloading
- Redis data persists in named volume
- Node modules are in anonymous volumes for performance

### Production
- Built applications are copied into images
- Redis data persists with custom configuration
- Logs are stored in mounted volumes

## Networking

Services communicate through the `llama-network` bridge network:
- Frontend → Backend: `http://backend:4000`
- Backend → Redis: `redis:6379`
- Nginx → Frontend: `http://frontend:3000`
- Nginx → Backend: `http://backend:4000`

## Development Workflow

1. **Start the environment**:
   ```bash
   ./scripts/docker-start.sh dev
   ```

2. **Access services**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Full app through Nginx: http://localhost:80

3. **Make changes**:
   - Frontend changes trigger hot reload
   - Backend changes trigger nodemon restart

4. **View logs**:
   ```bash
   docker-compose logs -f [service_name]
   ```

5. **Stop services**:
   ```bash
   docker-compose down
   ```

## Production Deployment

1. **Build images**:
   ```bash
   ./scripts/docker-build.sh prod --no-cache
   ```

2. **Start production**:
   ```bash
   ./scripts/docker-start.sh prod
   ```

3. **Setup SSL** (for production):
   - Place SSL certificates in `./ssl/` directory
   - Update nginx.prod.conf with SSL configuration

## Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Stop existing containers
   docker-compose down
   
   # Check for running containers
   docker ps
   ```

2. **Permission denied**:
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   ```

3. **Build failures**:
   ```bash
   # Clean build without cache
   ./scripts/docker-build.sh dev --no-cache
   
   # Clean up Docker system
   docker system prune -a
   ```

4. **Volume issues**:
   ```bash
   # Remove volumes
   docker-compose down -v
   
   # Recreate volumes
   docker-compose up -d
   ```

### Useful Commands

```bash
# View container logs
docker-compose logs -f [service]

# Execute commands in container
docker-compose exec frontend sh
docker-compose exec backend npm test

# View container stats
docker stats

# Clean up
docker system prune -a
docker volume prune
```

## Performance Optimization

### Development
- Use named volumes for node_modules
- Enable hot reloading with polling
- Use alpine images for smaller size

### Production
- Multi-stage builds for smaller images
- Nginx compression and caching
- Health checks for reliability
- Non-root users for security

## Security Considerations

### Production Settings
- Non-root users in containers
- Read-only file systems where possible
- Security headers in nginx
- SSL/TLS termination
- Rate limiting
- Log aggregation

### Environment Variables
- Never commit sensitive data to version control
- Use Docker secrets for sensitive information
- Separate development and production configs

## Monitoring

### Health Checks
All services include health checks that monitor:
- Service availability
- Database connectivity
- Redis connectivity
- Application startup

### Logs
- Nginx access and error logs
- Application logs
- Redis logs
- Container logs

## Backup and Recovery

### Development
- Code is in version control
- Database migrations handle schema
- Redis data can be recreated

### Production
- Regular database backups
- Redis AOF persistence
- Container image versioning
- Configuration backups

## Next Steps

1. Customize the configuration for your specific needs
2. Add database service if needed
3. Configure SSL certificates for production
4. Set up monitoring and alerting
5. Implement CI/CD pipeline
6. Add integration tests

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify service health: `docker-compose ps`
3. Check Docker status: `docker info`
4. Review this guide for common solutions