"""
WhatsApp Business API configuration and setup
"""
import os
import logging
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

import httpx
from config.secrets import secrets_manager

logger = logging.getLogger(__name__)

class WhatsAppConfig:
    """WhatsApp Business API configuration manager"""
    
    def __init__(self):
        self.config = secrets_manager.get_whatsapp_config()
        self.api_url = self.config["WHATSAPP_API_URL"]
        self.access_token = self.config["WHATSAPP_ACCESS_TOKEN"]
        self.phone_number_id = self.config["WHATSAPP_PHONE_NUMBER_ID"]
        self.webhook_verify_token = self.config["WHATSAPP_WEBHOOK_VERIFY_TOKEN"]
        
        # API endpoints
        self.messages_url = f"{self.api_url}/{self.phone_number_id}/messages"
        self.media_url = f"{self.api_url}/{self.phone_number_id}/media"
        
        # Headers for API requests
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
    
    async def validate_configuration(self) -> Dict[str, Any]:
        """Validate WhatsApp Business API configuration"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "phone_number_info": None,
            "webhook_status": None,
        }
        
        try:
            # Test API connectivity by getting phone number info
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/{self.phone_number_id}",
                    headers=self.headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    phone_info = response.json()
                    validation_result["phone_number_info"] = {
                        "id": phone_info.get("id"),
                        "display_phone_number": phone_info.get("display_phone_number"),
                        "verified_name": phone_info.get("verified_name"),
                        "quality_rating": phone_info.get("quality_rating"),
                    }
                    logger.info(f"WhatsApp phone number validated: {phone_info.get('display_phone_number')}")
                else:
                    validation_result["valid"] = False
                    validation_result["errors"].append(
                        f"Failed to validate phone number: HTTP {response.status_code}"
                    )
        
        except httpx.TimeoutException:
            validation_result["valid"] = False
            validation_result["errors"].append("Timeout connecting to WhatsApp API")
        except httpx.RequestError as e:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Network error: {str(e)}")
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Unexpected error: {str(e)}")
        
        # Validate webhook configuration
        try:
            webhook_validation = await self._validate_webhook_config()
            validation_result["webhook_status"] = webhook_validation
            if not webhook_validation["valid"]:
                validation_result["warnings"].extend(webhook_validation["warnings"])
        except Exception as e:
            validation_result["warnings"].append(f"Could not validate webhook: {str(e)}")
        
        return validation_result
    
    async def _validate_webhook_config(self) -> Dict[str, Any]:
        """Validate webhook configuration"""
        webhook_result = {
            "valid": True,
            "warnings": [],
            "webhook_url": None,
        }
        
        try:
            # Get webhook configuration from WhatsApp
            async with httpx.AsyncClient() as client:
                # Note: This endpoint might not be available in all WhatsApp API versions
                # This is a placeholder for webhook validation logic
                webhook_result["warnings"].append(
                    "Webhook validation requires manual verification through Meta Business Manager"
                )
                
                # Check if webhook verify token is set
                if not self.webhook_verify_token:
                    webhook_result["valid"] = False
                    webhook_result["warnings"].append("Webhook verify token not configured")
                
                # Validate webhook URL format (if provided)
                webhook_url = os.getenv("WEBHOOK_URL")
                if webhook_url:
                    if not webhook_url.startswith("https://"):
                        webhook_result["warnings"].append(
                            "Webhook URL should use HTTPS for production"
                        )
                    webhook_result["webhook_url"] = webhook_url
                else:
                    webhook_result["warnings"].append(
                        "WEBHOOK_URL environment variable not set"
                    )
        
        except Exception as e:
            webhook_result["warnings"].append(f"Webhook validation error: {str(e)}")
        
        return webhook_result
    
    async def test_message_sending(self, test_phone_number: str) -> Dict[str, Any]:
        """Test message sending capability (use with caution in production)"""
        test_result = {
            "success": False,
            "message_id": None,
            "error": None,
        }
        
        # Only allow testing in non-production environments
        environment = os.getenv("ENVIRONMENT", "development")
        if environment == "production":
            test_result["error"] = "Message testing disabled in production environment"
            return test_result
        
        try:
            test_message = {
                "messaging_product": "whatsapp",
                "to": test_phone_number,
                "type": "text",
                "text": {
                    "body": f"Test message from Advocacia Direta Bot - {datetime.now().isoformat()}"
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.messages_url,
                    headers=self.headers,
                    json=test_message,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    test_result["success"] = True
                    test_result["message_id"] = result.get("messages", [{}])[0].get("id")
                    logger.info(f"Test message sent successfully: {test_result['message_id']}")
                else:
                    test_result["error"] = f"HTTP {response.status_code}: {response.text}"
        
        except Exception as e:
            test_result["error"] = str(e)
        
        return test_result
    
    def get_webhook_verification_response(self, mode: str, token: str, challenge: str) -> Optional[str]:
        """Handle webhook verification challenge"""
        if mode == "subscribe" and token == self.webhook_verify_token:
            logger.info("Webhook verification successful")
            return challenge
        else:
            logger.warning(f"Webhook verification failed: mode={mode}, token_match={token == self.webhook_verify_token}")
            return None
    
    def log_configuration_status(self):
        """Log non-sensitive configuration information"""
        logger.info("WhatsApp Business API Configuration:")
        logger.info(f"  API URL: {self.api_url}")
        logger.info(f"  Phone Number ID: {self.phone_number_id}")
        logger.info(f"  Access Token: {'*' * (len(self.access_token) - 4) + self.access_token[-4:] if self.access_token else 'Not set'}")
        logger.info(f"  Webhook Verify Token: {'Set' if self.webhook_verify_token else 'Not set'}")

# Global WhatsApp configuration instance
whatsapp_config = WhatsAppConfig()