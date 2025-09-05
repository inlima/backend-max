"""
Application configuration and settings.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "Advocacia Direta WhatsApp Bot"
    DEBUG: bool = False
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/advocacia_direta"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # WhatsApp Business API
    WHATSAPP_API_URL: str = "https://graph.facebook.com/v18.0"
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = ""
    
    # Security
    SECRET_KEY: str = "your-secret-key-here"
    ENCRYPTION_KEY: str = ""  # Base64 encoded Fernet key for data encryption
    
    # LGPD Compliance
    DATA_RETENTION_DAYS: int = 90  # Days to retain user data
    DATA_ANONYMIZATION_DAYS: int = 30  # Days before anonymizing data
    
    # Session Management
    SESSION_TIMEOUT_MINUTES: int = 30
    REENGAGEMENT_TIMEOUT_MINUTES: int = 10
    
    # Analytics
    ANALYTICS_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()