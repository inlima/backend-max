#!/bin/bash

# Database backup script for Advocacia Direta WhatsApp Bot
set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
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

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    export $(cat .env.${ENVIRONMENT} | grep -v '^#' | xargs)
else
    log_error "Environment file .env.${ENVIRONMENT} not found!"
    exit 1
fi

# Create backup directory
mkdir -p ${BACKUP_DIR}

log_info "Creating backup for ${ENVIRONMENT} environment..."

# Database backup
log_info "Backing up PostgreSQL database..."
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > ${BACKUP_DIR}/db_backup_${DATE}.sql

# Redis backup
log_info "Backing up Redis data..."
docker-compose -f docker-compose.prod.yml exec -T redis redis-cli --rdb - > ${BACKUP_DIR}/redis_backup_${DATE}.rdb

# Application logs backup
log_info "Backing up application logs..."
if [ -d "./logs" ]; then
    tar -czf ${BACKUP_DIR}/logs_backup_${DATE}.tar.gz ./logs/
fi

# Compress database backup
log_info "Compressing database backup..."
gzip ${BACKUP_DIR}/db_backup_${DATE}.sql

log_info "✅ Backup completed successfully!"
log_info "Files created:"
log_info "  - Database: ${BACKUP_DIR}/db_backup_${DATE}.sql.gz"
log_info "  - Redis: ${BACKUP_DIR}/redis_backup_${DATE}.rdb"
if [ -d "./logs" ]; then
    log_info "  - Logs: ${BACKUP_DIR}/logs_backup_${DATE}.tar.gz"
fi

# Clean up old backups (keep last 7 days)
log_info "Cleaning up old backups (keeping last 7 days)..."
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete
find ${BACKUP_DIR} -name "*.rdb" -mtime +7 -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +7 -delete

log_info "Backup process completed!"