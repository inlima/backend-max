"""
Application configuration and settings - MVP Version.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings for MVP."""
    
    # Application
    APP_NAME: str = "Advocacia Direta WhatsApp Bot - MVP"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # WhatsApp Business API (Required)
    WHATSAPP_API_URL: str = "https://graph.facebook.com/v22.0"
    WHATSAPP_ACCESS_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: str = ""

    # Database (Optional)
    DATABASE_URL: str = ""
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Session Management (In-Memory for MVP)
    SESSION_TIMEOUT_MINUTES: int = 10
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-please"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        # Allow extra fields for backward compatibility
        extra = "ignore"


settings = Settings()