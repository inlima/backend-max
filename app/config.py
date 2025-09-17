"""
Application configuration and settings - MVP Version.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "Advocacia Direta - Backend API"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # WhatsApp Business API
    WHATSAPP_API_URL: str = "https://graph.facebook.com/v23.0"
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = ""

    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/max_system"
    POSTGRES_DB: str = "max_system"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Session Management
    SESSION_TIMEOUT_MINUTES: int = 30
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Security
    SECRET_KEY: str = "advocacia-direta-secret-key-change-in-production-2024"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        # Allow extra fields for backward compatibility
        extra = "ignore"


settings = Settings()