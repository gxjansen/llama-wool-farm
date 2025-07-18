#!/bin/bash

# Docker Build Script
# Usage: ./scripts/docker-build.sh [dev|prod] [--no-cache] [--pull]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
CACHE_FLAG=""
PULL_FLAG=""
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
        --no-cache)
            CACHE_FLAG="--no-cache"
            shift
            ;;
        --pull)
            PULL_FLAG="--pull"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [dev|prod] [--no-cache] [--pull]"
            echo "  dev|development  : Build development images (default)"
            echo "  prod|production  : Build production images"
            echo "  --no-cache       : Build without using cache"
            echo "  --pull           : Always pull base images"
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

# Clean up old images
cleanup_images() {
    log_info "Cleaning up old images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove unused images (optional)
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        log_info "Removing unused images for production build..."
        docker image prune -a -f --filter "until=24h"
    fi
}

# Build images
build_images() {
    log_info "Building $ENVIRONMENT images..."
    
    local build_args=""
    
    if [[ -n "$CACHE_FLAG" ]]; then
        build_args="$build_args --no-cache"
    fi
    
    if [[ -n "$PULL_FLAG" ]]; then
        build_args="$build_args --pull"
    fi
    
    # Build images
    docker-compose -f $COMPOSE_FILE build $build_args
}

# Tag images for different environments
tag_images() {
    log_info "Tagging images..."
    
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local git_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    # Get project name from directory
    local project_name=$(basename "$PWD")
    
    # Tag frontend image
    if docker images | grep -q "${project_name}_frontend"; then
        docker tag ${project_name}_frontend:latest ${project_name}_frontend:$ENVIRONMENT
        docker tag ${project_name}_frontend:latest ${project_name}_frontend:$ENVIRONMENT-$timestamp
        docker tag ${project_name}_frontend:latest ${project_name}_frontend:$ENVIRONMENT-$git_hash
    fi
    
    # Tag backend image
    if docker images | grep -q "${project_name}_backend"; then
        docker tag ${project_name}_backend:latest ${project_name}_backend:$ENVIRONMENT
        docker tag ${project_name}_backend:latest ${project_name}_backend:$ENVIRONMENT-$timestamp
        docker tag ${project_name}_backend:latest ${project_name}_backend:$ENVIRONMENT-$git_hash
    fi
}

# Test images
test_images() {
    log_info "Testing built images..."
    
    # Test frontend image
    if docker images | grep -q "frontend"; then
        log_info "Testing frontend image..."
        docker run --rm $(docker images --format "table {{.Repository}}:{{.Tag}}" | grep frontend | head -1) /bin/sh -c "echo 'Frontend image OK'"
    fi
    
    # Test backend image
    if docker images | grep -q "backend"; then
        log_info "Testing backend image..."
        docker run --rm $(docker images --format "table {{.Repository}}:{{.Tag}}" | grep backend | head -1) /bin/sh -c "echo 'Backend image OK'"
    fi
}

# Show build information
show_build_info() {
    log_info "Build Information:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Compose file: $COMPOSE_FILE"
    echo "  Cache: $([ -n "$CACHE_FLAG" ] && echo "disabled" || echo "enabled")"
    echo "  Pull: $([ -n "$PULL_FLAG" ] && echo "enabled" || echo "disabled")"
    echo ""
    
    log_info "Built images:"
    docker-compose -f $COMPOSE_FILE images
}

# Show next steps
show_next_steps() {
    echo ""
    log_info "Next steps:"
    echo "  1. Start the environment:"
    echo "     ./scripts/docker-start.sh $ENVIRONMENT"
    echo ""
    echo "  2. Or run specific services:"
    echo "     docker-compose -f $COMPOSE_FILE up -d"
    echo ""
    echo "  3. View logs:"
    echo "     docker-compose -f $COMPOSE_FILE logs -f"
    echo ""
    echo "  4. Stop services:"
    echo "     docker-compose -f $COMPOSE_FILE down"
}

# Main execution
main() {
    log_info "Building Docker images for $ENVIRONMENT environment..."
    
    # Perform checks
    check_docker
    check_compose
    
    # Build process
    cleanup_images
    build_images
    tag_images
    test_images
    
    # Show results
    show_build_info
    show_next_steps
    
    log_success "Docker images built successfully!"
}

# Run main function
main "$@"