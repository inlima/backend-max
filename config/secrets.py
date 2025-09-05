"""
Secrets management configuration for production environment
"""
import os
import logging
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

class SecretsManager:
    """Manage application secrets and sensitive configuration"""
    
    def __init__(self):
        self.secrets_file = Path("/run/secrets")
        self.env_prefix = "ADVOCACIA_"
    
    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get secret value from multiple sources in order of priority:
        1. Docker secrets (/run/secrets/<key>)
        2. Environment variables
        3. Default value
        """
        # Try Docker secrets first
        secret_file = self.secrets_file / key.lower()
        if secret_file.exists():
            try:
                with open(secret_file, 'r') as f:
                    value = f.read().strip()
                    logger.info(f"Loaded secret '{key}' from Docker secrets")
                    return value
            except Exception as e:
                logger.warning(f"Failed to read Docker secret '{key}': {e}")
        
        # Try environment variables
        env_key = f"{self.env_prefix}{key}"
        env_value = os.getenv(env_key) or os.getenv(key)
        if env_value:
            logger.info(f"Loaded secret '{key}' from environment variables")
            return env_value
        
        # Return default
        if default is not None:
            logger.info(f"Using default value for secret '{key}'")
            return default
        
        logger.warning(f"Secret '{key}' not found in any source")
        return None
    
    def get_database_url(self) -> str:
        """Get database URL with proper secret handling"""
        # Try to get complete DATABASE_URL first
        db_url = self.get_secret("DATABASE_URL")
        if db_url:
            return db_url
        
        # Build from components
        db_host = self.get_secret("DB_HOST", "db")
        db_port = self.get_secret("DB_PORT", "5432")
        db_name = self.get_secret("POSTGRES_DB", "advocacia_direta")
        db_user = self.get_secret("POSTGRES_USER", "postgres")
        db_password = self.get_secret("POSTGRES_PASSWORD")
        
        if not db_password:
            raise ValueError("Database password not found in secrets")
        
        return f"postgresql+asyncpg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    def get_redis_url(self) -> str:
        """Get Redis URL with proper secret handling"""
        # Try to get complete REDIS_URL first
        redis_url = self.get_secret("REDIS_URL")
        if redis_url:
            return redis_url
        
        # Build from components
        redis_host = self.get_secret("REDIS_HOST", "redis")
        redis_port = self.get_secret("REDIS_PORT", "6379")
        redis_password = self.get_secret("REDIS_PASSWORD")
        redis_db = self.get_secret("REDIS_DB", "0")
        
        if redis_password:
            return f"redis://:{redis_password}@{redis_host}:{redis_port}/{redis_db}"
        else:
            return f"redis://{redis_host}:{redis_port}/{redis_db}"
    
    def get_whatsapp_config(self) -> Dict[str, str]:
        """Get WhatsApp API configuration"""
        config = {}
        
        required_keys = [
            "WHATSAPP_ACCESS_TOKEN",
            "WHATSAPP_PHONE_NUMBER_ID",
            "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
        ]
        
        for key in required_keys:
            value = self.get_secret(key)
            if not value:
                raise ValueError(f"WhatsApp configuration '{key}' not found in secrets")
            config[key] = value
        
        # Optional configuration
        config["WHATSAPP_API_URL"] = self.get_secret("WHATSAPP_API_URL", "https://graph.facebook.com/v18.0")
        
        return config
    
    def validate_secrets(self) -> Dict[str, Any]:
        """Validate that all required secrets are available"""
        validation_result = {
            "valid": True,
            "missing_secrets": [],
            "warnings": []
        }
        
        required_secrets = [
            "SECRET_KEY",
            "POSTGRES_PASSWORD",
            "WHATSAPP_ACCESS_TOKEN",
            "WHATSAPP_PHONE_NUMBER_ID",
            "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
        ]
        
        for secret in required_secrets:
            if not self.get_secret(secret):
                validation_result["missing_secrets"].append(secret)
                validation_result["valid"] = False
        
        # Check optional but recommended secrets
        recommended_secrets = ["REDIS_PASSWORD"]
        for secret in recommended_secrets:
            if not self.get_secret(secret):
                validation_result["warnings"].append(f"Recommended secret '{secret}' not found")
        
        return validation_result

# Global secrets manager instance
secrets_manager = SecretsManager()