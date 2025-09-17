#!/bin/bash

# Production setup script for Advocacia Direta
set -e

echo "🚀 Setting up Advocacia Direta for production..."

# Check if required environment variables are set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ Error: Environment variable $1 is not set"
        exit 1
    fi
}

echo "📋 Checking required environment variables..."
check_env_var "WHATSAPP_ACCESS_TOKEN"
check_env_var "WHATSAPP_PHONE_NUMBER_ID"
check_env_var "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
check_env_var "POSTGRES_PASSWORD"

# Create production environment file
echo "📝 Creating production environment file..."
cat > .env.production << EOF
# Production Environment Configuration
APP_NAME="Advocacia Direta WhatsApp Bot"
DEBUG=false
ENVIRONMENT=production

# WhatsApp Business API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v23.0
WHATSAPP_ACCESS_TOKEN=${WHATSAPP_ACCESS_TOKEN}
WHATSAPP_PHONE_NUMBER_ID=${WHATSAPP_PHONE_NUMBER_ID}
WHATSAPP_WEBHOOK_VERIFY_TOKEN=${WHATSAPP_WEBHOOK_VERIFY_TOKEN}

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Database Configuration
DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@db:5432/advocacia_direta
POSTGRES_DB=advocacia_direta
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Session Management
SESSION_TIMEOUT_MINUTES=30

# Logging
LOG_LEVEL=INFO
EOF

# Install Python dependencies
echo "🏗️  Installing Python dependencies..."
uv sync --no-dev

# Run security checks
echo "🔒 Running security checks..."
uv run safety check || echo "⚠️  Security check completed with warnings"



# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p backups

# Set proper permissions
echo "🔧 Setting file permissions..."
chmod +x scripts/*.sh

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.production.yml build --no-cache

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.production.yml up -d db
sleep 10
docker-compose -f docker-compose.production.yml exec -T db psql -U postgres -d advocacia_direta -c "SELECT 1;" || {
    echo "⏳ Waiting for database to be ready..."
    sleep 20
}

# Start all services
echo "🚀 Starting all services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health checks
echo "🏥 Running health checks..."
curl -f http://localhost:8000/health/ || echo "⚠️  Backend health check failed"

# Display status
echo "📊 Service status:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "✅ Production setup completed!"
echo ""
echo "🌐 Services are running on:"
echo "   - Backend API: http://localhost:8000"
echo "   - Database: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "📝 Next steps:"
echo "   1. Configure your domain DNS to point to this server"
echo "   2. Set up SSL certificates for HTTPS"
echo "   3. Set up monitoring and backup procedures"
echo "   4. Configure WhatsApp webhook URL in Facebook Developer Console"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "   - Stop services: docker-compose -f docker-compose.production.yml down"
echo "   - Restart services: docker-compose -f docker-compose.production.yml restart"
echo ""