#!/bin/bash

# Production deployment script for Advocacia Direta WhatsApp Bot
set -e

echo "🚀 Starting deployment process..."

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment file exists
if [ ! -f ".env.${ENVIRONMENT}" ]; then
    log_error "Environment file .env.${ENVIRONMENT} not found!"
    exit 1
fi

# Load environment variables
export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)

log_info "Deploying to ${ENVIRONMENT} environment..."

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Pull latest images
log_info "Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Build application image
log_info "Building application image..."
docker-compose -f docker-compose.prod.yml build app

# Stop services gracefully
log_info "Stopping services..."
docker-compose -f docker-compose.prod.yml down --timeout 30

# Start all services
log_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait a bit for services to start
sleep 10

log_info "✅ Deployment completed successfully!"
log_info "Application is running at: http://localhost:8000"

# Show running services
docker-compose -f docker-compose.prod.yml ps