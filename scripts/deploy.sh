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

# Backup database if production
if [ "$ENVIRONMENT" = "production" ]; then
    log_info "Creating database backup..."
    docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > ${BACKUP_DIR}/database_backup.sql
    log_info "Database backup saved to ${BACKUP_DIR}/database_backup.sql"
fi

# Pull latest images
log_info "Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Build application image
log_info "Building application image..."
docker-compose -f docker-compose.prod.yml build app

# Stop services gracefully
log_info "Stopping services..."
docker-compose -f docker-compose.prod.yml down --timeout 30

# Start database and redis first
log_info "Starting database and Redis..."
docker-compose -f docker-compose.prod.yml up -d db redis

# Wait for database to be ready
log_info "Waiting for database to be ready..."
timeout 60 bash -c 'until docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}; do sleep 2; done'

# Run database migrations
log_info "Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm app alembic upgrade head

# Start all services
log_info "Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for application to be ready
log_info "Waiting for application to be ready..."
timeout 120 bash -c 'until curl -f http://localhost:8000/health; do sleep 5; done'

# Clean up old images
log_info "Cleaning up old Docker images..."
docker image prune -f

log_info "✅ Deployment completed successfully!"
log_info "Application is running at: http://localhost:8000"
log_info "Health check: http://localhost:8000/health"

# Show running services
docker-compose -f docker-compose.prod.yml ps