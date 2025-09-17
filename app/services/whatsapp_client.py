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
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"
    CONTACTS = "contacts"
    LOCATION = "location"


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


@dataclass
class MediaMessage:
    """Media message (image, audio, video, document)."""
    media_type: str  # 'image', 'audio', 'video', 'document'
    media_id: Optional[str] = None  # Media ID from uploaded media
    media_url: Optional[str] = None  # Direct URL to media
    caption: Optional[str] = None  # Caption for image/video/document
    filename: Optional[str] = None  # Filename for document
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert media message to WhatsApp API format."""
        result = {
            "type": self.media_type,
            self.media_type: {}
        }
        
        # Use media ID if available, otherwise use URL
        if self.media_id:
            result[self.media_type]["id"] = self.media_id
        elif self.media_url:
            result[self.media_type]["link"] = self.media_url
        
        # Add caption for supported types
        if self.caption and self.media_type in ["image", "video", "document"]:
            result[self.media_type]["caption"] = self.caption
        
        # Add filename for documents
        if self.filename and self.media_type == "document":
            result[self.media_type]["filename"] = self.filename
            
        return result


@dataclass
class ContactMessage:
    """Contact message."""
    contacts: List[Dict[str, Any]]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert contact message to WhatsApp API format."""
        return {
            "type": "contacts",
            "contacts": self.contacts
        }


@dataclass
class LocationMessage:
    """Location message."""
    latitude: float
    longitude: float
    name: Optional[str] = None
    address: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert location message to WhatsApp API format."""
        result = {
            "type": "location",
            "location": {
                "latitude": self.latitude,
                "longitude": self.longitude
            }
        }
        
        if self.name:
            result["location"]["name"] = self.name
        if self.address:
            result["location"]["address"] = self.address
            
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
            
            elif message_type == MessageType.IMAGE:
                return await self.send_image_message(
                    phone_number,
                    image_url=content.get("image_url"),
                    image_id=content.get("image_id"),
                    caption=content.get("caption")
                )
            
            elif message_type == MessageType.AUDIO:
                return await self.send_audio_message(
                    phone_number,
                    audio_url=content.get("audio_url"),
                    audio_id=content.get("audio_id")
                )
            
            elif message_type == MessageType.VIDEO:
                return await self.send_video_message(
                    phone_number,
                    video_url=content.get("video_url"),
                    video_id=content.get("video_id"),
                    caption=content.get("caption")
                )
            
            elif message_type == MessageType.DOCUMENT:
                return await self.send_document_message(
                    phone_number,
                    document_url=content.get("document_url"),
                    document_id=content.get("document_id"),
                    filename=content.get("filename"),
                    caption=content.get("caption")
                )
            
            elif message_type == MessageType.CONTACTS:
                contacts = content.get("contacts", [])
                return await self.send_contact_message(phone_number, contacts)
            
            elif message_type == MessageType.LOCATION:
                return await self.send_location_message(
                    phone_number,
                    latitude=content.get("latitude"),
                    longitude=content.get("longitude"),
                    name=content.get("name"),
                    address=content.get("address")
                )
        
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

    async def send_image_message(self, to: str, image_url: str = None, image_id: str = None, caption: str = None) -> bool:
        """Send an image message."""
        try:
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            image_data = {}
            if image_id:
                image_data["id"] = image_id
            elif image_url:
                image_data["link"] = image_url
            else:
                logger.error("Either image_id or image_url must be provided")
                return False
            
            if caption:
                image_data["caption"] = caption
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "image",
                "image": image_data
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Image message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED!")
                return False
            else:
                logger.error(f"Failed to send image message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending image message: {str(e)}")
            return False

    async def send_audio_message(self, to: str, audio_url: str = None, audio_id: str = None) -> bool:
        """Send an audio message."""
        try:
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            audio_data = {}
            if audio_id:
                audio_data["id"] = audio_id
            elif audio_url:
                audio_data["link"] = audio_url
            else:
                logger.error("Either audio_id or audio_url must be provided")
                return False
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "audio",
                "audio": audio_data
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Audio message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED!")
                return False
            else:
                logger.error(f"Failed to send audio message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending audio message: {str(e)}")
            return False

    async def send_video_message(self, to: str, video_url: str = None, video_id: str = None, caption: str = None) -> bool:
        """Send a video message."""
        try:
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            video_data = {}
            if video_id:
                video_data["id"] = video_id
            elif video_url:
                video_data["link"] = video_url
            else:
                logger.error("Either video_id or video_url must be provided")
                return False
            
            if caption:
                video_data["caption"] = caption
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "video",
                "video": video_data
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Video message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED!")
                return False
            else:
                logger.error(f"Failed to send video message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending video message: {str(e)}")
            return False

    async def send_document_message(self, to: str, document_url: str = None, document_id: str = None, 
                                  filename: str = None, caption: str = None) -> bool:
        """Send a document message."""
        try:
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            document_data = {}
            if document_id:
                document_data["id"] = document_id
            elif document_url:
                document_data["link"] = document_url
            else:
                logger.error("Either document_id or document_url must be provided")
                return False
            
            if filename:
                document_data["filename"] = filename
            if caption:
                document_data["caption"] = caption
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "document",
                "document": document_data
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Document message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED!")
                return False
            else:
                logger.error(f"Failed to send document message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending document message: {str(e)}")
            return False

    async def send_contact_message(self, to: str, contacts: List[Dict[str, Any]]) -> bool:
        """Send a contact message."""
        try:
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "contacts",
                "contacts": contacts
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Contact message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED!")
                return False
            else:
                logger.error(f"Failed to send contact message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending contact message: {str(e)}")
            return False

    async def send_location_message(self, to: str, latitude: float, longitude: float, 
                                  name: str = None, address: str = None) -> bool:
        """Send a location message."""
        try:
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            location_data = {
                "latitude": latitude,
                "longitude": longitude
            }
            
            if name:
                location_data["name"] = name
            if address:
                location_data["address"] = address
            
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                "type": "location",
                "location": location_data
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"Location message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED!")
                return False
            else:
                logger.error(f"Failed to send location message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending location message: {str(e)}")
            return False

    async def send_media_message(self, to: str, media: MediaMessage) -> bool:
        """Send a media message (image, audio, video, document)."""
        try:
            formatted_to = self._format_phone_number(to)
            
            if not is_valid_brazilian_phone(formatted_to):
                logger.warning(f"Invalid phone number format: {to} → {formatted_to}")
            
            url = f"{self.base_url}/messages"
            
            # Convert MediaMessage to API format
            message_dict = media.to_dict()
            payload = {
                "messaging_product": "whatsapp",
                "to": formatted_to,
                **message_dict
            }
            
            headers = self._get_headers()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                
            if response.status_code == 200:
                logger.debug(f"{media.media_type.title()} message sent to {formatted_to}")
                return True
            elif response.status_code == 401:
                logger.error("❌ WhatsApp Access Token EXPIRED!")
                return False
            else:
                logger.error(f"Failed to send {media.media_type} message to {formatted_to}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending media message: {str(e)}")
            return False

    async def upload_media(self, media_file_path: str, media_type: str) -> Optional[str]:
        """Upload media file and return media ID."""
        try:
            url = f"{self.api_url}/{settings.WHATSAPP_PHONE_NUMBER_ID}/media"
            
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            
            # Determine MIME type based on media type and file extension
            mime_types = {
                "image": "image/jpeg",
                "audio": "audio/mpeg", 
                "video": "video/mp4",
                "document": "application/pdf"
            }
            
            with open(media_file_path, 'rb') as media_file:
                files = {
                    'file': (media_file_path, media_file, mime_types.get(media_type, "application/octet-stream")),
                    'type': (None, media_type),
                    'messaging_product': (None, 'whatsapp')
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, headers=headers, files=files)
            
            if response.status_code == 200:
                result = response.json()
                media_id = result.get("id")
                logger.debug(f"Media uploaded successfully: {media_id}")
                return media_id
            else:
                logger.error(f"Failed to upload media: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error uploading media: {str(e)}")
            return None

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
    "MediaMessage",
    "ContactMessage",
    "LocationMessage",
    "MessageType"
]