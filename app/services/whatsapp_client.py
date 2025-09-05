"""
WhatsApp Business API client implementation.
"""

import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, List, Optional, Union, Any
import httpx
from app.config import settings
from app.services.error_handler import get_error_handler, ErrorContext, ErrorType

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """WhatsApp message types."""
    TEXT = "text"
    INTERACTIVE = "interactive"
    TEMPLATE = "template"


@dataclass
class Button:
    """Interactive message button."""
    id: str
    title: str
    
    def to_dict(self) -> Dict[str, str]:
        return {
            "type": "reply",
            "reply": {
                "id": self.id,
                "title": self.title
            }
        }


@dataclass
class InteractiveMessage:
    """Interactive message with buttons."""
    type: str  # 'button' or 'list'
    body: str
    header: Optional[str] = None
    footer: Optional[str] = None
    buttons: Optional[List[Button]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to WhatsApp API format."""
        message_data = {
            "type": "interactive",
            "interactive": {
                "type": self.type,
                "body": {"text": self.body}
            }
        }
        
        if self.header:
            message_data["interactive"]["header"] = {
                "type": "text",
                "text": self.header
            }
            
        if self.footer:
            message_data["interactive"]["footer"] = {
                "text": self.footer
            }
            
        if self.buttons and self.type == "button":
            message_data["interactive"]["action"] = {
                "buttons": [button.to_dict() for button in self.buttons]
            }
            
        return message_data


class WhatsAppClient(ABC):
    """Abstract WhatsApp client interface."""
    
    @abstractmethod
    async def send_message(self, phone_number: str, message: str) -> bool:
        """Send a text message."""
        pass
    
    @abstractmethod
    async def send_interactive_message(
        self, 
        phone_number: str, 
        interactive: InteractiveMessage
    ) -> bool:
        """Send an interactive message with buttons."""
        pass
    
    @abstractmethod
    async def mark_as_read(self, message_id: str) -> bool:
        """Mark a message as read."""
        pass


class WhatsAppBusinessClient(WhatsAppClient):
    """WhatsApp Business API client implementation."""
    
    def __init__(
        self,
        access_token: str = None,
        phone_number_id: str = None,
        api_url: str = None
    ):
        self.access_token = access_token or settings.WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
        self.api_url = api_url or settings.WHATSAPP_API_URL
        self.base_url = f"{self.api_url}/{self.phone_number_id}"
        
        if not self.access_token or not self.phone_number_id:
            raise ValueError("WhatsApp access token and phone number ID are required")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def _format_phone_number(self, phone_number: str) -> str:
        """Format phone number for WhatsApp API."""
        # Remove any non-digit characters
        clean_number = ''.join(filter(str.isdigit, phone_number))
        
        # Add country code if not present (assuming Brazil +55)
        if not clean_number.startswith('55') and len(clean_number) == 11:
            clean_number = '55' + clean_number
        
        return clean_number
    
    async def send_message(self, phone_number: str, message: str) -> bool:
        """Send a text message with error handling and retry logic."""
        error_handler = get_error_handler()
        context = ErrorContext(
            phone_number=phone_number,
            api_endpoint=f"{self.base_url}/messages",
            request_data={"type": "text", "message": message}
        )
        
        # Check if rate limited
        if error_handler.is_rate_limited(phone_number):
            logger.warning(f"Rate limited for {phone_number}, skipping send")
            return False
        
        async def _send_message_impl():
            formatted_number = self._format_phone_number(phone_number)
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_number,
                "type": "text",
                "text": {"body": message}
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Message sent successfully to {formatted_number}")
                    return True
                else:
                    # Raise HTTPStatusError for proper error handling
                    response.raise_for_status()
        
        try:
            return await error_handler.retry_with_backoff(
                _send_message_impl,
                ErrorType.WHATSAPP_API,
                context
            )
            
        except Exception as e:
            # Handle error and get response
            error_response = await error_handler.handle_error(e, context)
            
            logger.error(
                f"Failed to send message to {phone_number} after retries: {str(e)}",
                extra={"error_response": error_response.__dict__}
            )
            return False
    
    async def send_interactive_message(
        self, 
        phone_number: str, 
        interactive: InteractiveMessage
    ) -> bool:
        """Send an interactive message with buttons with error handling and retry logic."""
        error_handler = get_error_handler()
        context = ErrorContext(
            phone_number=phone_number,
            api_endpoint=f"{self.base_url}/messages",
            request_data={"type": "interactive", "interactive": interactive.to_dict()}
        )
        
        # Check if rate limited
        if error_handler.is_rate_limited(phone_number):
            logger.warning(f"Rate limited for {phone_number}, skipping interactive message send")
            return False
        
        async def _send_interactive_impl():
            formatted_number = self._format_phone_number(phone_number)
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_number,
                **interactive.to_dict()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Interactive message sent successfully to {formatted_number}")
                    return True
                else:
                    # Raise HTTPStatusError for proper error handling
                    response.raise_for_status()
        
        try:
            return await error_handler.retry_with_backoff(
                _send_interactive_impl,
                ErrorType.WHATSAPP_API,
                context
            )
            
        except Exception as e:
            # Handle error and get response
            error_response = await error_handler.handle_error(e, context)
            
            logger.error(
                f"Failed to send interactive message to {phone_number} after retries: {str(e)}",
                extra={"error_response": error_response.__dict__}
            )
            return False
    
    async def mark_as_read(self, message_id: str) -> bool:
        """Mark a message as read with error handling and retry logic."""
        error_handler = get_error_handler()
        context = ErrorContext(
            api_endpoint=f"{self.base_url}/messages",
            request_data={"status": "read", "message_id": message_id}
        )
        
        async def _mark_as_read_impl():
            payload = {
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=self._get_headers(),
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Message {message_id} marked as read")
                    return True
                else:
                    # Raise HTTPStatusError for proper error handling
                    response.raise_for_status()
        
        try:
            return await error_handler.retry_with_backoff(
                _mark_as_read_impl,
                ErrorType.WHATSAPP_API,
                context
            )
            
        except Exception as e:
            # Handle error and get response
            error_response = await error_handler.handle_error(e, context)
            
            logger.error(
                f"Failed to mark message {message_id} as read after retries: {str(e)}",
                extra={"error_response": error_response.__dict__}
            )
            return False


# Factory function for dependency injection
def get_whatsapp_client() -> WhatsAppClient:
    """Get WhatsApp client instance."""
    return WhatsAppBusinessClient()