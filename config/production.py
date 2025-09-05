"""
Production configuration for Advocacia Direta WhatsApp Bot
"""
import os
import logging
from typing import List

from config.secrets import secrets_manager
from config.logging import setup_logging

# Setup logging first
setup_logging()
logger = logging.getLogger(__name__)

class ProductionConfig:
    """Production configuration class"""
    
    def __init__(self):
        # Validate secrets on startup
        validation = secrets_manager.validate_secrets()
        if not validation["valid"]:
            raise ValueError(f"Missing required secrets: {validation['missing_secrets']}")
        
        for warning in validation["warnings"]:
            logger.warning(warning)
    
    # Application settings
    APP_NAME: str = secrets_manager.get_secret("APP_NAME", "Advocacia Direta WhatsApp Bot")
    DEBUG: bool = secrets_manager.get_secret("DEBUG", "false").lower() == "true"
    ENVIRONMENT: str = "production"
    
    # Security
    SECRET_KEY: str = secrets_manager.get_secret("SECRET_KEY")
    ALLOWED_HOSTS: List[str] = [
        host.strip() 
        for host in secrets_manager.get_secret("ALLOWED_HOSTS", "*").split(",")
    ]
    
    # Database configuration
    DATABASE_URL: str = secrets_manager.get_database_url()
    DATABASE_POOL_SIZE: int = int(secrets_manager.get_secret("DATABASE_POOL_SIZE", "10"))
    DATABASE_MAX_OVERFLOW: int = int(secrets_manager.get_secret("DATABASE_MAX_OVERFLOW", "20"))
    
    # Redis configuration
    REDIS_URL: str = secrets_manager.get_redis_url()
    REDIS_POOL_SIZE: int = int(secrets_manager.get_secret("REDIS_POOL_SIZE", "10"))
    
    # WhatsApp API configuration
    WHATSAPP_CONFIG = secrets_manager.get_whatsapp_config()
    
    # Session management
    SESSION_TIMEOUT_MINUTES: int = int(secrets_manager.get_secret("SESSION_TIMEOUT_MINUTES", "30"))
    REENGAGEMENT_TIMEOUT_MINUTES: int = int(secrets_manager.get_secret("REENGAGEMENT_TIMEOUT_MINUTES", "10"))
    
    # Analytics
    ANALYTICS_ENABLED: bool = secrets_manager.get_secret("ANALYTICS_ENABLED", "true").lower() == "true"
    
    # Logging
    LOG_LEVEL: str = secrets_manager.get_secret("LOG_LEVEL", "INFO")
    LOG_FILE: str = secrets_manager.get_secret("LOG_FILE", "/app/logs/app.log")
    
    # Performance settings
    WORKER_PROCESSES: int = int(secrets_manager.get_secret("WORKER_PROCESSES", "4"))
    MAX_CONNECTIONS: int = int(secrets_manager.get_secret("MAX_CONNECTIONS", "1000"))
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = int(secrets_manager.get_secret("RATE_LIMIT_PER_MINUTE", "60"))
    WEBHOOK_RATE_LIMIT_PER_MINUTE: int = int(secrets_manager.get_secret("WEBHOOK_RATE_LIMIT_PER_MINUTE", "600"))
    
    # Health check settings
    HEALTH_CHECK_TIMEOUT: int = int(secrets_manager.get_secret("HEALTH_CHECK_TIMEOUT", "30"))
    
    # Backup settings
    BACKUP_RETENTION_DAYS: int = int(secrets_manager.get_secret("BACKUP_RETENTION_DAYS", "7"))
    
    def log_configuration(self):
        """Log non-sensitive configuration for debugging"""
        logger.info("Production configuration loaded:")
        logger.info(f"  App Name: {self.APP_NAME}")
        logger.info(f"  Debug Mode: {self.DEBUG}")
        logger.info(f"  Environment: {self.ENVIRONMENT}")
        logger.info(f"  Database Pool Size: {self.DATABASE_POOL_SIZE}")
        logger.info(f"  Redis Pool Size: {self.REDIS_POOL_SIZE}")
        logger.info(f"  Worker Processes: {self.WORKER_PROCESSES}")
        logger.info(f"  Max Connections: {self.MAX_CONNECTIONS}")
        logger.info(f"  Analytics Enabled: {self.ANALYTICS_ENABLED}")
        logger.info(f"  Log Level: {self.LOG_LEVEL}")

# Global configuration instance
config = ProductionConfig()