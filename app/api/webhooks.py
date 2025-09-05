"""
WhatsApp webhook endpoints.
"""

import hashlib
import hmac
import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.services.validation_service import ValidationService, ValidationError, RateLimitExceeded
from config.whatsapp import whatsapp_config
from config.webhook_security import webhook_security

logger = logging.getLogger(__name__)

router = APIRouter()


class WebhookVerificationError(Exception):
    """Webhook verification error."""
    pass


class MessageParser:
    """Parse incoming WhatsApp messages."""
    
    @staticmethod
    def extract_message_data(webhook_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Extract message data from webhook payload."""
        try:
            entry = webhook_data.get("entry", [])
            if not entry:
                return None
            
            changes = entry[0].get("changes", [])
            if not changes:
                return None
            
            value = changes[0].get("value", {})
            messages = value.get("messages", [])
            
            if not messages:
                # Check for status updates
                statuses = value.get("statuses", [])
                if statuses:
                    return {
                        "type": "status",
                        "status": statuses[0]
                    }
                return None
            
            message = messages[0]
            contacts = value.get("contacts", [])
            contact = contacts[0] if contacts else {}
            
            return {
                "type": "message",
                "message_id": message.get("id"),
                "from": message.get("from"),
                "timestamp": message.get("timestamp"),
                "message_type": message.get("type"),
                "text": message.get("text", {}).get("body") if message.get("type") == "text" else None,
                "interactive": message.get("interactive") if message.get("type") == "interactive" else None,
                "contact_name": contact.get("profile", {}).get("name"),
                "metadata": value.get("metadata", {})
            }
            
        except Exception as e:
            logger.error(f"Error parsing message data: {str(e)}")
            return None
    
    @staticmethod
    def extract_user_response(message_data: Dict[str, Any]) -> Optional[str]:
        """Extract user response from message data."""
        if not message_data or message_data.get("type") != "message":
            return None
        
        message_type = message_data.get("message_type")
        
        if message_type == "text":
            return message_data.get("text")
        elif message_type == "interactive":
            interactive = message_data.get("interactive", {})
            if interactive.get("type") == "button_reply":
                return interactive.get("button_reply", {}).get("id")
            elif interactive.get("type") == "list_reply":
                return interactive.get("list_reply", {}).get("id")
        
        return None


def verify_webhook_signature(payload: bytes, signature: str, verify_token: str) -> bool:
    """Verify WhatsApp webhook signature."""
    try:
        if not signature.startswith("sha256="):
            return False
        
        signature = signature[7:]  # Remove 'sha256=' prefix
        
        expected_signature = hmac.new(
            verify_token.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    except Exception as e:
        logger.error(f"Error verifying webhook signature: {str(e)}")
        return False


@router.get("/whatsapp")
async def verify_webhook(
    request: Request,
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token")
):
    """Verify WhatsApp webhook during setup."""
    try:
        # Log verification attempt
        client_ip = webhook_security.extract_client_ip(request)
        logger.info(f"Webhook verification attempt from {client_ip}")
        
        # Use the centralized verification method
        challenge_response = whatsapp_config.get_webhook_verification_response(
            hub_mode, hub_verify_token, hub_challenge
        )
        
        if challenge_response:
            logger.info(f"Webhook verification successful for {client_ip}")
            return PlainTextResponse(challenge_response)
        else:
            logger.warning(f"Webhook verification failed from {client_ip}. Mode: {hub_mode}")
            raise HTTPException(status_code=403, detail="Forbidden")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during webhook verification: {str(e)}")
        raise HTTPException(status_code=400, detail="Bad Request")


@router.post("/whatsapp")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Receive and process WhatsApp webhook messages."""
    try:
        # Extract client IP for rate limiting and logging
        client_ip = webhook_security.extract_client_ip(request)
        
        # Check rate limiting first
        if not webhook_security.check_rate_limit(client_ip):
            logger.warning(f"Rate limit exceeded for {client_ip}")
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        # Get raw body for signature verification
        body = await request.body()
        payload = body.decode('utf-8')
        
        # Verify webhook signature if app secret is configured
        signature = request.headers.get("x-hub-signature-256", "")
        if signature and not webhook_security.verify_webhook_signature(body, signature):
            logger.warning(f"Webhook signature verification failed from {client_ip}")
            raise HTTPException(status_code=403, detail="Invalid signature")
        
        # Parse JSON payload
        try:
            webhook_data = json.loads(payload)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON payload from {client_ip}: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        # Validate webhook payload structure
        payload_validation = webhook_security.validate_webhook_payload(webhook_data)
        if not payload_validation["valid"]:
            logger.warning(f"Invalid webhook payload from {client_ip}: {payload_validation['errors']}")
            raise HTTPException(status_code=400, detail="Invalid payload structure")
        
        # Log webhook request for monitoring
        webhook_security.log_webhook_request(request, webhook_data, payload_validation)
        
        # Initialize validation service for message processing
        validation_service = ValidationService(db)
        
        # Extract message data
        message_data = MessageParser.extract_message_data(webhook_data)
        
        if not message_data:
            logger.info("No message data found in webhook")
            return {"status": "ok"}
        
        # Handle different message types
        if message_data["type"] == "message":
            await handle_incoming_message(message_data, validation_service)
        elif message_data["type"] == "status":
            await handle_status_update(message_data)
        
        return {"status": "ok"}
    
    except HTTPException:
        raise
    except RateLimitExceeded as e:
        logger.warning(f"Rate limit exceeded: {str(e)}")
        raise HTTPException(status_code=429, detail=str(e))
    except ValidationError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def handle_incoming_message(message_data: Dict[str, Any], validation_service: ValidationService) -> None:
    """Handle incoming WhatsApp message with validation."""
    try:
        phone_number = message_data.get("from")
        message_id = message_data.get("message_id")
        user_response = MessageParser.extract_user_response(message_data)
        
        if not phone_number or not user_response:
            logger.warning("Missing phone number or message content")
            return
        
        # Validate incoming message with comprehensive security checks
        message_validation = await validation_service.validate_incoming_message(
            phone_number=phone_number,
            message_content=user_response
        )
        
        if not message_validation["valid"]:
            logger.warning(f"Message validation failed for {phone_number}: {message_validation['errors']}")
            # Don't process invalid messages, but don't fail the webhook
            return
        
        # Use sanitized data
        sanitized_phone = message_validation["sanitized_phone"]
        sanitized_content = message_validation["sanitized_content"]
        
        logger.info(f"Processing validated message from {sanitized_phone}: {sanitized_content[:100]}...")
        logger.debug(f"Rate limit info: {message_validation['rate_limit_info']}")
        
        # TODO: This will be implemented in task 4 (conversation flow engine)
        # For now, just log the validated message
        logger.info(f"Message received - ID: {message_id}, From: {sanitized_phone}, Content: {sanitized_content}")
        
        # Mark message as read (optional)
        # This would require the WhatsApp client, which will be integrated in task 4
        
    except RateLimitExceeded as e:
        logger.warning(f"Rate limit exceeded for {phone_number}: {str(e)}")
        # Rate limit exceeded - don't process message but don't fail webhook
        return
    except ValidationError as e:
        logger.warning(f"Validation error for {phone_number}: {str(e)}")
        # Validation failed - don't process message but don't fail webhook
        return
    except Exception as e:
        logger.error(f"Error handling incoming message: {str(e)}")


async def handle_status_update(status_data: Dict[str, Any]) -> None:
    """Handle WhatsApp message status updates."""
    try:
        status = status_data.get("status", {})
        message_id = status.get("id")
        status_type = status.get("status")  # sent, delivered, read, failed
        
        logger.info(f"Status update for message {message_id}: {status_type}")
        
        # TODO: Update message status in database (will be implemented in analytics task)
        
    except Exception as e:
        logger.error(f"Error handling status update: {str(e)}")