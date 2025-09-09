"""
WhatsApp webhook endpoints - MVP Version.
"""

import json
import logging
import hashlib
import hmac
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import PlainTextResponse

from app.config import settings

logger = logging.getLogger("app.webhooks")


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify WhatsApp webhook signature."""
    try:
        logger.debug("Verifying webhook signature")
        
        # Remove 'sha256=' prefix if present
        if signature.startswith('sha256='):
            signature = signature[7:]
        
        # Calculate expected signature
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures
        is_valid = hmac.compare_digest(expected_signature, signature)
        
        if not is_valid:
            logger.warning("Webhook signature verification failed")
        
        return is_valid
    
    except Exception as e:
        logger.error(f"Error verifying webhook signature: {str(e)}")
        return False

router = APIRouter()





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



@router.get("")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token")
):
    """Verify WhatsApp webhook during setup."""
    try:
        logger.info(f"Webhook verification request: mode={hub_mode}, token={hub_verify_token[:8] if hub_verify_token else 'None'}...")
        
        if (hub_mode == "subscribe" and 
            hub_verify_token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN):
            logger.info("Webhook verification successful")
            return PlainTextResponse(hub_challenge)
        else:
            logger.warning(f"Webhook verification failed. Mode: {hub_mode}")
            raise HTTPException(status_code=403, detail="Forbidden")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during webhook verification: {str(e)}")
        raise HTTPException(status_code=400, detail="Bad Request")


@router.post("")
async def receive_webhook(request: Request):
    """Receive and process WhatsApp webhook messages."""
    try:
        # Process webhook silently
        # Get raw body
        body = await request.body()
        payload = body.decode('utf-8')
        
        # Signature verification temporarily disabled - process silently
        signature = request.headers.get("X-Hub-Signature-256")
        
        # Parse JSON payload
        try:
            webhook_data = json.loads(payload)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON payload: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        # Silently process webhook
        logger.debug(f"Webhook data: {json.dumps(webhook_data, indent=2)}")
        
        # Extract message data
        message_data = MessageParser.extract_message_data(webhook_data)
        
        if not message_data:
            # Silently handle empty webhooks (Facebook tests)
            return {"status": "ok"}
        
        # Handle different message types
        if message_data["type"] == "message":
            await handle_incoming_message(message_data)
        elif message_data["type"] == "status":
            # Process status silently for future database implementation
            await handle_status_update(message_data)
        # Silently handle unknown types
        
        return {"status": "ok"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def handle_incoming_message(message_data: Dict[str, Any]) -> None:
    """Handle incoming WhatsApp message."""
    try:
        phone_number = message_data.get("from")
        message_id = message_data.get("message_id")
        user_response = MessageParser.extract_user_response(message_data)
        contact_name = message_data.get("contact_name")
        
        if not phone_number or not user_response:
            logger.warning("Missing phone number or message content")
            return
        
        logger.info(f"Processing message from {phone_number}: {user_response[:100]}...")
        
        # Import conversation service
        from app.services.conversation_service import conversation_service
        
        # Check for escape commands
        escape_commands = ["atendente", "atendimento", "humano", "pessoa", "falar com atendente"]
        if any(cmd in user_response.lower() for cmd in escape_commands):
            await conversation_service.handle_escape_command(phone_number)
            return
        
        # Process normal conversation flow
        await conversation_service.process_message(phone_number, user_response, contact_name)
        
        # Emit real-time events for frontend
        try:
            from app.api.websocket import emit_nova_mensagem, emit_contato_atualizado
            
            # Emit new message event
            await emit_nova_mensagem({
                "phone_number": phone_number,
                "message": user_response,
                "contact_name": contact_name,
                "timestamp": message_data.get("timestamp")
            })
            
            # Emit contact updated event (will trigger frontend to refresh contact data)
            await emit_contato_atualizado({
                "phone_number": phone_number,
                "action": "new_message"
            })
            
        except Exception as ws_error:
            logger.error(f"Error emitting WebSocket events: {str(ws_error)}")
        
    except Exception as e:
        logger.error(f"Error handling incoming message: {str(e)}")


async def handle_status_update(status_data: Dict[str, Any]) -> None:
    """Handle WhatsApp message status updates."""
    try:
        status = status_data.get("status", {})
        message_id = status.get("id")
        status_type = status.get("status")  # sent, delivered, read, failed
        
        # Silently process status updates for future database implementation
        logger.debug(f"Message {message_id[:8] if message_id else 'unknown'}... status: {status_type}")
        
        # TODO: Update message status in database
        # Example: await update_message_status(message_id, status_type)
        
    except Exception as e:
        logger.error(f"Error handling status update: {str(e)}")