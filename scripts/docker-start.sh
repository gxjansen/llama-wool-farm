#!/bin/bash

# Docker Development Environment Startup Script
# Usage: ./scripts/docker-start.sh [dev|prod] [--build]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
BUILD_FLAG=""
COMPOSE_FILE="docker-compose.yml"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dev|development)
            ENVIRONMENT="dev"
            COMPOSE_FILE="docker-compose.yml"
            shift
            ;;
        prod|production)
            ENVIRONMENT="prod"
            COMPOSE_FILE="docker-compose.prod.yml"
            shift
            ;;
        --build)
            BUILD_FLAG="--build"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [dev|prod] [--build]"
            echo "  dev|development  : Start development environment (default)"
            echo "  prod|production  : Start production environment"
            echo "  --build          : Force rebuild of images"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if docker-compose is available
check_compose() {
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    # Create data directories
    mkdir -p data/redis
    mkdir -p logs/nginx
    mkdir -p logs/app
    
    # Create SSL directory for production
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        mkdir -p ssl
    fi
}

# Check environment files
check_env_files() {
    log_info "Checking environment files..."
    
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            log_warning ".env file not found. Creating from .env.example..."
            cp .env.example .env
            log_warning "Please update .env file with your configuration before running again."
        else
            log_warning ".env file not found. Creating basic .env file..."
            cat > .env << EOF
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/llama_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Redis
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=$ENVIRONMENT
EOF
            log_warning "Please update .env file with your configuration."
        fi
    fi
}

# Stop existing containers
stop_containers() {
    log_info "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down 2>/dev/null || true
}

# Pull latest images
pull_images() {
    log_info "Pulling latest images..."
    docker-compose -f $COMPOSE_FILE pull
}

# Build and start containers
start_containers() {
    log_info "Starting $ENVIRONMENT environment..."
    
    if [[ -n "$BUILD_FLAG" ]]; then
        log_info "Building images..."
        docker-compose -f $COMPOSE_FILE up --build -d
    else
        docker-compose -f $COMPOSE_FILE up -d
    fi
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker-compose -f $COMPOSE_FILE ps --format json | jq -r '.Health // "healthy"' | grep -q "unhealthy"; then
            log_info "Waiting for services... (attempt $attempt/$max_attempts)"
            sleep 5
            ((attempt++))
        else
            log_success "All services are healthy!"
            return 0
        fi
    done
    
    log_warning "Some services may not be fully healthy. Check the logs for more information."
}

# Show running services
show_services() {
    log_info "Running services:"
    docker-compose -f $COMPOSE_FILE ps
    
    echo ""
    log_info "Service URLs:"
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        echo "  Frontend: http://localhost:3000"
        echo "  Backend API: http://localhost:4000"
        echo "  Nginx Proxy: http://localhost:80"
        echo "  Redis: localhost:6379"
    else
        echo "  Frontend: http://localhost:80"
        echo "  Backend API: http://localhost:80/api"
        echo "  Redis: Internal network only"
    fi
}

# Show logs
show_logs() {
    echo ""
    log_info "To view logs, use:"
    echo "  docker-compose -f $COMPOSE_FILE logs -f [service_name]"
    echo "  Available services: frontend, backend, nginx, redis"
    echo ""
    log_info "To stop services, use:"
    echo "  docker-compose -f $COMPOSE_FILE down"
    echo ""
    log_info "To restart a service, use:"
    echo "  docker-compose -f $COMPOSE_FILE restart [service_name]"
}

# Main execution
main() {
    log_info "Starting Docker environment in $ENVIRONMENT mode..."
    
    # Perform checks
    check_docker
    check_compose
    
    # Setup environment
    create_directories
    check_env_files
    
    # Start services
    stop_containers
    pull_images
    start_containers
    
    # Wait and show status
    wait_for_services
    show_services
    show_logs
    
    log_success "Docker environment started successfully!"
}

# Run main function
main "$@"