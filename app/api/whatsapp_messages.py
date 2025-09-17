"""
WhatsApp Messages API endpoints for testing different message types.
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.services.whatsapp_client import (
    WhatsAppClient, 
    MessageType, 
    MediaMessage, 
    ContactMessage, 
    LocationMessage,
    get_whatsapp_client
)
from app.services.message_utils import MessageUtils
from app.api.auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter()


class TextMessageRequest(BaseModel):
    """Text message request."""
    phone_number: str = Field(..., description="Phone number in international format")
    text: str = Field(..., description="Message text")


class ImageMessageRequest(BaseModel):
    """Image message request."""
    phone_number: str = Field(..., description="Phone number in international format")
    image_url: Optional[str] = Field(None, description="Image URL")
    image_id: Optional[str] = Field(None, description="Uploaded image ID")
    caption: Optional[str] = Field(None, description="Image caption")


class AudioMessageRequest(BaseModel):
    """Audio message request."""
    phone_number: str = Field(..., description="Phone number in international format")
    audio_url: Optional[str] = Field(None, description="Audio URL")
    audio_id: Optional[str] = Field(None, description="Uploaded audio ID")


class VideoMessageRequest(BaseModel):
    """Video message request."""
    phone_number: str = Field(..., description="Phone number in international format")
    video_url: Optional[str] = Field(None, description="Video URL")
    video_id: Optional[str] = Field(None, description="Uploaded video ID")
    caption: Optional[str] = Field(None, description="Video caption")


class DocumentMessageRequest(BaseModel):
    """Document message request."""
    phone_number: str = Field(..., description="Phone number in international format")
    document_url: Optional[str] = Field(None, description="Document URL")
    document_id: Optional[str] = Field(None, description="Uploaded document ID")
    filename: Optional[str] = Field(None, description="Document filename")
    caption: Optional[str] = Field(None, description="Document caption")


class ContactMessageRequest(BaseModel):
    """Contact message request."""
    phone_number: str = Field(..., description="Phone number in international format")
    contact_name: str = Field(..., description="Contact name")
    contact_phone: str = Field(..., description="Contact phone number")
    contact_email: Optional[str] = Field(None, description="Contact email")
    organization: Optional[str] = Field(None, description="Contact organization")


class LocationMessageRequest(BaseModel):
    """Location message request."""
    phone_number: str = Field(..., description="Phone number in international format")
    latitude: float = Field(..., description="Location latitude")
    longitude: float = Field(..., description="Location longitude")
    name: Optional[str] = Field(None, description="Location name")
    address: Optional[str] = Field(None, description="Location address")


class MessageResponse(BaseModel):
    """Message response."""
    success: bool
    message: str
    message_type: str


@router.post("/send-text", response_model=MessageResponse)
async def send_text_message(
    request: TextMessageRequest,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send a text message via WhatsApp.
    
    - **phone_number**: Phone number in international format (e.g., 5511999999999)
    - **text**: Message text content
    """
    try:
        success = await whatsapp_client.send_text_message(
            to=request.phone_number,
            text=request.text
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Text message sent successfully",
                message_type="text"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send text message")
            
    except Exception as e:
        logger.error(f"Error sending text message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-image", response_model=MessageResponse)
async def send_image_message(
    request: ImageMessageRequest,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send an image message via WhatsApp.
    
    - **phone_number**: Phone number in international format
    - **image_url**: Direct URL to image (or use image_id)
    - **image_id**: Uploaded image ID from WhatsApp Media API
    - **caption**: Optional image caption
    """
    try:
        if not request.image_url and not request.image_id:
            raise HTTPException(status_code=400, detail="Either image_url or image_id must be provided")
        
        success = await whatsapp_client.send_image_message(
            to=request.phone_number,
            image_url=request.image_url,
            image_id=request.image_id,
            caption=request.caption
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Image message sent successfully",
                message_type="image"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send image message")
            
    except Exception as e:
        logger.error(f"Error sending image message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-audio", response_model=MessageResponse)
async def send_audio_message(
    request: AudioMessageRequest,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send an audio message via WhatsApp.
    
    - **phone_number**: Phone number in international format
    - **audio_url**: Direct URL to audio file (or use audio_id)
    - **audio_id**: Uploaded audio ID from WhatsApp Media API
    """
    try:
        if not request.audio_url and not request.audio_id:
            raise HTTPException(status_code=400, detail="Either audio_url or audio_id must be provided")
        
        success = await whatsapp_client.send_audio_message(
            to=request.phone_number,
            audio_url=request.audio_url,
            audio_id=request.audio_id
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Audio message sent successfully",
                message_type="audio"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send audio message")
            
    except Exception as e:
        logger.error(f"Error sending audio message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-video", response_model=MessageResponse)
async def send_video_message(
    request: VideoMessageRequest,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send a video message via WhatsApp.
    
    - **phone_number**: Phone number in international format
    - **video_url**: Direct URL to video file (or use video_id)
    - **video_id**: Uploaded video ID from WhatsApp Media API
    - **caption**: Optional video caption
    """
    try:
        if not request.video_url and not request.video_id:
            raise HTTPException(status_code=400, detail="Either video_url or video_id must be provided")
        
        success = await whatsapp_client.send_video_message(
            to=request.phone_number,
            video_url=request.video_url,
            video_id=request.video_id,
            caption=request.caption
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Video message sent successfully",
                message_type="video"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send video message")
            
    except Exception as e:
        logger.error(f"Error sending video message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-document", response_model=MessageResponse)
async def send_document_message(
    request: DocumentMessageRequest,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send a document message via WhatsApp.
    
    - **phone_number**: Phone number in international format
    - **document_url**: Direct URL to document (or use document_id)
    - **document_id**: Uploaded document ID from WhatsApp Media API
    - **filename**: Document filename
    - **caption**: Optional document caption
    """
    try:
        if not request.document_url and not request.document_id:
            raise HTTPException(status_code=400, detail="Either document_url or document_id must be provided")
        
        success = await whatsapp_client.send_document_message(
            to=request.phone_number,
            document_url=request.document_url,
            document_id=request.document_id,
            filename=request.filename,
            caption=request.caption
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Document message sent successfully",
                message_type="document"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send document message")
            
    except Exception as e:
        logger.error(f"Error sending document message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-contact", response_model=MessageResponse)
async def send_contact_message(
    request: ContactMessageRequest,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send a contact message via WhatsApp.
    
    - **phone_number**: Phone number in international format
    - **contact_name**: Name of the contact to share
    - **contact_phone**: Phone number of the contact
    - **contact_email**: Optional email of the contact
    - **organization**: Optional organization of the contact
    """
    try:
        # Create contact using MessageUtils
        contact = MessageUtils.create_contact(
            name=request.contact_name,
            phone=request.contact_phone,
            email=request.contact_email,
            organization=request.organization
        )
        
        success = await whatsapp_client.send_contact_message(
            to=request.phone_number,
            contacts=[contact]
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Contact message sent successfully",
                message_type="contacts"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send contact message")
            
    except Exception as e:
        logger.error(f"Error sending contact message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-location", response_model=MessageResponse)
async def send_location_message(
    request: LocationMessageRequest,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send a location message via WhatsApp.
    
    - **phone_number**: Phone number in international format
    - **latitude**: Location latitude
    - **longitude**: Location longitude
    - **name**: Optional location name
    - **address**: Optional location address
    """
    try:
        success = await whatsapp_client.send_location_message(
            to=request.phone_number,
            latitude=request.latitude,
            longitude=request.longitude,
            name=request.name,
            address=request.address
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Location message sent successfully",
                message_type="location"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send location message")
            
    except Exception as e:
        logger.error(f"Error sending location message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-law-firm-contact", response_model=MessageResponse)
async def send_law_firm_contact(
    phone_number: str,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send law firm contact information.
    
    - **phone_number**: Phone number in international format
    """
    try:
        # Create law firm contact
        contact = MessageUtils.create_law_firm_contact()
        
        success = await whatsapp_client.send_contact_message(
            to=phone_number,
            contacts=[contact]
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Law firm contact sent successfully",
                message_type="contacts"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send law firm contact")
            
    except Exception as e:
        logger.error(f"Error sending law firm contact: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/send-office-location", response_model=MessageResponse)
async def send_office_location(
    phone_number: str,
    current_user: dict = Depends(verify_token),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client)
):
    """
    Send law firm office location.
    
    - **phone_number**: Phone number in international format
    """
    try:
        # Create office location
        location = MessageUtils.create_office_location()
        
        success = await whatsapp_client.send_location_message(
            to=phone_number,
            latitude=location.latitude,
            longitude=location.longitude,
            name=location.name,
            address=location.address
        )
        
        if success:
            return MessageResponse(
                success=True,
                message="Office location sent successfully",
                message_type="location"
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to send office location")
            
    except Exception as e:
        logger.error(f"Error sending office location: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/message-types")
async def get_supported_message_types(current_user: dict = Depends(verify_token)):
    """
    Get list of supported WhatsApp message types.
    """
    return {
        "supported_types": [
            {
                "type": "text",
                "description": "Plain text messages",
                "endpoint": "/send-text"
            },
            {
                "type": "image", 
                "description": "Image messages with optional caption",
                "endpoint": "/send-image"
            },
            {
                "type": "audio",
                "description": "Audio messages (voice notes)",
                "endpoint": "/send-audio"
            },
            {
                "type": "video",
                "description": "Video messages with optional caption", 
                "endpoint": "/send-video"
            },
            {
                "type": "document",
                "description": "Document messages (PDF, DOC, etc.)",
                "endpoint": "/send-document"
            },
            {
                "type": "contacts",
                "description": "Contact information sharing",
                "endpoint": "/send-contact"
            },
            {
                "type": "location",
                "description": "Location sharing with coordinates",
                "endpoint": "/send-location"
            },
            {
                "type": "interactive",
                "description": "Interactive messages with buttons (existing)",
                "endpoint": "/webhook (automatic)"
            }
        ],
        "predefined_messages": [
            {
                "name": "Law Firm Contact",
                "description": "Send law firm contact information",
                "endpoint": "/send-law-firm-contact"
            },
            {
                "name": "Office Location",
                "description": "Send office location",
                "endpoint": "/send-office-location"
            }
        ]
    }