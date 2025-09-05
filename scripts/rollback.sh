#!/bin/bash

# Rollback script for Advocacia Direta WhatsApp Bot
set -e

# Configuration
BACKUP_DIR="./backups"
ENVIRONMENT=${1:-production}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup directory $BACKUP_DIR not found!"
    exit 1
fi

# List available backups
log_info "Available database backups:"
ls -la $BACKUP_DIR/*.sql.gz 2>/dev/null || log_warn "No database backups found"

# Get backup file from user input or use latest
if [ -z "$2" ]; then
    BACKUP_FILE=$(ls -t $BACKUP_DIR/*.sql.gz 2>/dev/null | head -n1)
    if [ -z "$BACKUP_FILE" ]; then
        log_error "No backup files found!"
        exit 1
    fi
    log_info "Using latest backup: $BACKUP_FILE"
else
    BACKUP_FILE="$2"
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file $BACKUP_FILE not found!"
        exit 1
    fi
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
else
    log_error "Environment file .env.${ENVIRONMENT} not found!"
    exit 1
fi

log_warn "⚠️  WARNING: This will restore the database from backup and may cause data loss!"
read -p "Are you sure you want to proceed? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Rollback cancelled."
    exit 0
fi

log_info "Starting rollback process..."

# Stop application services (keep database running)
log_info "Stopping application services..."
docker-compose -f docker-compose.prod.yml stop app nginx

# Create a backup of current state before rollback
log_info "Creating backup of current state before rollback..."
CURRENT_BACKUP_DIR="./backups/pre_rollback_$(date +%Y%m%d_%H%M%S)"
mkdir -p $CURRENT_BACKUP_DIR
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > $CURRENT_BACKUP_DIR/current_state_backup.sql

# Restore database from backup
log_info "Restoring database from backup: $BACKUP_FILE"
gunzip -c $BACKUP_FILE | docker-compose -f docker-compose.prod.yml exec -T db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

# Start application services
log_info "Starting application services..."
docker-compose -f docker-compose.prod.yml up -d app nginx

# Wait for application to be ready
log_info "Waiting for application to be ready..."
timeout 120 bash -c 'until curl -f http://localhost:8000/health; do sleep 5; done'

log_info "✅ Rollback completed successfully!"
log_info "Current state backup saved to: $CURRENT_BACKUP_DIR/current_state_backup.sql"
log_info "Application is running at: http://localhost:8000"

# Show running services
docker-compose -f docker-compose.prod.yml ps