# Deployment Guide - Advocacia Direta WhatsApp Bot

## Overview

This guide covers the production deployment of the Advocacia Direta WhatsApp Bot using Docker containers with comprehensive monitoring and logging.

## Prerequisites

- Docker and Docker Compose installed
- SSL certificates for HTTPS
- WhatsApp Business API credentials
- Production database credentials

## Quick Start

1. **Clone and setup environment:**
```bash
git clone <repository-url>
cd advocacia-direta-whatsapp
cp .env.prod .env
# Edit .env with your production values
```

2. **Deploy to production:**
```bash
./scripts/deploy.sh production
```

3. **Verify deployment:**
```bash
curl -f http://localhost:8000/health
```

## Environment Configuration

### Required Environment Variables

Copy `.env.prod` to `.env` and configure:

- `POSTGRES_PASSWORD`: Strong database password
- `REDIS_PASSWORD`: Redis authentication password
- `SECRET_KEY`: Random 32+ character string for JWT signing
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp Business API token
- `WHATSAPP_PHONE_NUMBER_ID`: Your WhatsApp phone number ID
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: Webhook verification token

### SSL Configuration

Place your SSL certificates in `nginx/ssl/`:
- `cert.pem`: SSL certificate
- `key.pem`: Private key

## Deployment Scripts

### Deploy Script
```bash
./scripts/deploy.sh [environment]
```
- Creates database backup (production only)
- Builds and deploys containers
- Runs database migrations
- Performs health checks

### Backup Script
```bash
./scripts/backup.sh [environment]
```
- Backs up PostgreSQL database
- Backs up Redis data
- Backs up application logs
- Compresses and stores backups

### Rollback Script
```bash
./scripts/rollback.sh [environment] [backup_file]
```
- Restores from specified backup
- Creates pre-rollback backup
- Restarts services

## Monitoring Stack

Deploy monitoring tools alongside the application:

```bash
docker-compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

### Monitoring Services

- **Prometheus** (port 9090): Metrics collection
- **Grafana** (port 3000): Dashboards and visualization
- **Loki** (port 3100): Log aggregation
- **Node Exporter** (port 9100): System metrics
- **Redis Exporter** (port 9121): Redis metrics
- **Postgres Exporter** (port 9187): Database metrics

### Default Credentials

- Grafana: admin/admin (change on first login)

## Health Checks

The application provides several health check endpoints:

- `GET /health`: Basic health check
- `GET /health/ready`: Comprehensive readiness check
- `GET /health/metrics`: Performance metrics
- `GET /health/csat`: Customer satisfaction metrics

## Security Features

### Network Security
- Nginx reverse proxy with rate limiting
- HTTPS enforcement with modern TLS
- Security headers (HSTS, X-Frame-Options, etc.)

### Application Security
- Non-root container execution
- Secrets management via Docker secrets or environment variables
- Input validation and sanitization
- CORS configuration

### Rate Limiting
- API endpoints: 10 requests/second
- WhatsApp webhooks: 100 requests/second
- Configurable burst limits

## Database Management

### Migrations
```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec app alembic upgrade head

# Create new migration
docker-compose -f docker-compose.prod.yml exec app alembic revision --autogenerate -m "description"
```

### Backup and Restore
```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U user dbname > backup.sql

# Manual restore
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U user -d dbname
```

## Troubleshooting

### Common Issues

1. **Application won't start:**
   - Check environment variables in `.env`
   - Verify database connectivity
   - Check logs: `docker-compose logs app`

2. **WhatsApp webhook failures:**
   - Verify webhook URL is accessible from internet
   - Check WHATSAPP_WEBHOOK_VERIFY_TOKEN
   - Review nginx logs: `docker-compose logs nginx`

3. **Database connection issues:**
   - Verify POSTGRES_PASSWORD
   - Check database container: `docker-compose logs db`
   - Ensure database is ready before app starts

### Log Locations

- Application logs: `./logs/app.log`
- Error logs: `./logs/error.log`
- WhatsApp logs: `./logs/whatsapp.log`
- Nginx logs: `./logs/nginx/`

### Performance Tuning

1. **Database:**
   - Adjust `DATABASE_POOL_SIZE` based on load
   - Monitor connection pool usage
   - Consider read replicas for high traffic

2. **Application:**
   - Scale with `WORKER_PROCESSES`
   - Adjust `MAX_CONNECTIONS`
   - Monitor memory usage

3. **Redis:**
   - Configure appropriate `REDIS_POOL_SIZE`
   - Monitor memory usage
   - Consider Redis clustering for high availability

## Maintenance

### Regular Tasks

1. **Daily:**
   - Monitor application health
   - Check error logs
   - Verify backup completion

2. **Weekly:**
   - Review performance metrics
   - Update dependencies (staging first)
   - Clean old Docker images

3. **Monthly:**
   - Security updates
   - Certificate renewal
   - Capacity planning review

### Updates

1. **Test in staging:**
```bash
./scripts/deploy.sh staging
```

2. **Deploy to production:**
```bash
./scripts/deploy.sh production
```

3. **Rollback if needed:**
```bash
./scripts/rollback.sh production
```

## Support

For issues and support:
1. Check application logs
2. Review monitoring dashboards
3. Consult this deployment guide
4. Contact development team with specific error messages and logs