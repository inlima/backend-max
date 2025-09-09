"""
WhatsApp Business API client - MVP Version.
"""

import json
import logging
import re
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """Message types for WhatsApp API."""
    TEXT = "text"
    INTERACTIVE = "interactive"


@dataclass
class Button:
    """Button for interactive messages."""
    id: str
    title: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert button to WhatsApp API format."""
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
    buttons: Optional[List[Button]] = None
    header: Optional[str] = None
    footer: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert interactive message to WhatsApp API format."""
        result = {
            "type": "interactive",
            "interactive": {
                "type": self.type,
                "body": {"text": self.body}
            }
        }
        
        if self.header:
            result["interactive"]["header"] = {"text": self.header}
            
        if self.footer:
            result["interactive"]["footer"] = {"text": self.footer}
            
        if self.buttons:
            result["interactive"]["action"] = {
                "buttons": [button.to_dict()["reply"] for button in self.buttons]
            }
            
        return result


def format_phone_number(phone: str) -> str:
    """
    Format Brazilian phone number for WhatsApp API.
    
    Examples:
    - 557382005612 → 5573982005612 (adds 9 after area code)
    - 5573982005612 → 5573982005612 (already formatted)
    - 73982005612 → 5573982005612 (adds country code)
    - +5573982005612 → 5573982005612 (removes +)
    
    Args:
        phone: Phone number in various formats
        
    Returns:
        Formatted phone number for WhatsApp API
    """
    # Remove any non-digit characters
    clean_phone = re.sub(r'\D', '', phone)
    
    # Handle different input formats
    if clean_phone.startswith('55'):
        # Already has country code
        if len(clean_phone) == 13:
            # Format: 5573982005612 (already correct)
            return clean_phone
        elif len(clean_phone) == 12:
            # Format: 557382005612 (missing 9)
            country_code = clean_phone[:2]  # 55
            area_code = clean_phone[2:4]    # 73
            number = clean_phone[4:]        # 82005612
            return f"{country_code}{area_code}9{number}"
        else:
            # Invalid length, return as is
            logger.warning(f"Invalid phone number length: {clean_phone}")
            return clean_phone
    else:
        # No country code, assume Brazilian number
        if len(clean_phone) == 11:
            # Format: 73982005612 (with 9)
            return f"55{clean_phone}"
        elif len(clean_phone) == 10:
            # Format: 7382005612 (without 9)
            area_code = clean_phone[:2]     # 73
            number = clean_phone[2:]        # 82005612
            return f"55{area_code}9{number}"
        else:
            # Invalid length, add country code anyway
            logger.warning(f"Unexpected phone number format: {clean_phone}")
            return f"55{clean_phone}"


def is_valid_brazilian_phone(phone: str) -> bool:
    """
    Validate if phone number is a valid Brazilian mobile number.
    
    Args:
        phone: Phone number to validate
        
    Returns:
        True if valid Brazilian mobile number, False otherwise
    """
    formatted = format_phone_number(phone)
    
    # Must be 13 digits starting with 55
    if len(formatted) != 13 or not formatted.startswith('55'):
        return False
    
    # Area code must be valid (11-99)
    area_code = formatted[2:4]
    if not (11 <= int(area_code) <= 99):
        return False
    
    # Must have 9 as first digit of mobile number
    if formatted[4] != '9':
        return False
    
    # Mobile number must be 8 digits
    mobile_number = formatted[5:]
    if len(mobile_number) != 8 or not mobile_number.isdigit():
        return False
    
    return True


class WhatsAppClient:
    """Simple WhatsApp Business API client for MVP."""
    
    def __init__(self, access_token: Optional[str] = None, phone_number_id: Optional[str] = None, api_url: Optional[str] = None):
        # Use provided values or fallback to settings
        self.access_token = access_token if access_token is not None else settings.WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = phone_number_id if phone_number_id is not None else settings.WHATSAPP_PHONE_NUMBER_ID
        self.api_url = api_url if api_url is not None else settings.WHATSAPP_API_URL
        
        # Validate required credentials
        if not self.access_token or not self.phone_number_id or self.access_token.strip() == "" or self.phone_number_id.strip() == "":
            raise ValueError("WhatsApp access token and phone number ID are required")
            
        self.base_url = f"{self.api_url}/{self.phone_number_id}"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def _format_phone_number(self, phone: str) -> str:
        """Format phone number for WhatsApp API."""
        return format_phone_number(phone)
        
    async def send_text_message(self, to: str, text: str) -> bool:
        """Send a text message."""
        try:
            # Format and validate phone number
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
                # Continue anyway, let WhatsApp API handle the error
            
            url = f"{self.base_url}/messages"
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "text",
                "text": {
                    "body": text
                }
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED! Please update your token in .env file")
                logger.error("Go to Facebook Developer Console > WhatsApp > API Setup > Generate new token")
                return False
            else:
                logger.error(f"Failed to send message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            return False
    
    async def send_message(self, phone_number: str, message: str = None, message_type: MessageType = None, content: Dict[str, Any] = None) -> bool:
        """Send a message. Supports both simple text messages and complex message types."""
        # Simple text message (for backward compatibility)
        if message is not None and message_type is None and content is None:
            return await self.send_text_message(phone_number, message)
        
        # Complex message with type and content
        if message_type and content:
            if message_type == MessageType.TEXT:
                return await self.send_text_message(phone_number, content.get("text", ""))
            elif message_type == MessageType.INTERACTIVE:
                interactive_msg = content.get("interactive")
                if isinstance(interactive_msg, InteractiveMessage):
                    return await self.send_interactive_message(phone_number, interactive_msg)
        
        return False
    
    async def send_button_message(self, to: str, text: str, buttons: List[Dict[str, str]]) -> bool:
        """Send a message with interactive buttons."""
        try:
            # Format and validate phone number
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
                # Continue anyway, let WhatsApp API handle the error
            
            url = f"{self.base_url}/messages"
            
            # Format buttons for WhatsApp API
            interactive_buttons = []
            for i, button in enumerate(buttons[:3]):  # WhatsApp allows max 3 buttons
                interactive_buttons.append({
                    "type": "reply",
                    "reply": {
                        "id": button.get("id", f"btn_{i}"),
                        "title": button.get("title", "Option")[:20]  # Max 20 chars
                    }
                })
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {
                        "text": text
                    },
                    "action": {
                        "buttons": interactive_buttons
                    }
                }
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Button message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED! Please update your token in .env file")
                logger.error("Go to Facebook Developer Console > WhatsApp > API Setup > Generate new token")
                return False
            else:
                logger.error(f"Failed to send button message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending button message: {str(e)}")
            return False
    
    async def send_interactive_message(self, phone_number: str, interactive: InteractiveMessage) -> bool:
        """Send an interactive message."""
        try:
            formatted_to = self._format_phone_number(phone_number)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {phone_number} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            # Convert InteractiveMessage to API format
            message_dict = interactive.to_dict()
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                **message_dict
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Interactive message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED! Please update your token in .env file")
                logger.error("Go to Facebook Developer Console > WhatsApp > API Setup > Generate new token")
                return False
            else:
                logger.error(f"Failed to send interactive message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending interactive message: {str(e)}")
            return False
    
    async def send_list_message(self, to: str, text: str, button_text: str, sections: List[Dict[str, Any]]) -> bool:
        """Send an interactive list message."""
        try:
            # Format and validate phone number
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "interactive",
                "interactive": {
                    "type": "list",
                    "body": {
                        "text": text
                    },
                    "action": {
                        "button": button_text,
                        "sections": sections
                    }
                }
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"List message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED! Please update your token in .env file")
                logger.error("Go to Facebook Developer Console > WhatsApp > API Setup > Generate new token")
                return False
            else:
                logger.error(f"Failed to send list message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending list message: {str(e)}")
            return False

    async def mark_as_read(self, message_id: str) -> bool:
        """Mark a message as read."""
        try:
            url = f"{self.base_url}/messages"
            
            payload = {
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.info(f"Message {message_id} marked as read")
                return True
            else:
                logger.error(f"Failed to mark message as read: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error marking message as read: {str(e)}")
            return False


# Alias for compatibility
WhatsAppBusinessClient = WhatsAppClient

# Global instance for MVP
whatsapp_client = WhatsAppClient()


def get_whatsapp_client() -> WhatsAppClient:
    """Factory function to get WhatsApp client instance."""
    return WhatsAppClient()


# Export functions for external use
__all__ = [
    "WhatsAppClient",
    "WhatsAppBusinessClient",
    "whatsapp_client", 
    "get_whatsapp_client",
    "format_phone_number",
    "is_valid_brazilian_phone",
    "Button",
    "InteractiveMessage",
    "MessageType"
]