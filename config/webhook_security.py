"""
WhatsApp webhook security configuration and validation
"""
import hmac
import hashlib
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import Request, HTTPException
from config.secrets import secrets_manager

logger = logging.getLogger(__name__)

class WebhookSecurity:
    """Security manager for WhatsApp webhooks"""
    
    def __init__(self):
        self.app_secret = secrets_manager.get_secret("WHATSAPP_APP_SECRET")
        self.verify_token = secrets_manager.get_secret("WHATSAPP_WEBHOOK_VERIFY_TOKEN")
        self.rate_limit_window = 60  # seconds
        self.max_requests_per_window = 1000
        self.request_history: Dict[str, list] = {}
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature using app secret"""
        if not self.app_secret:
            logger.warning("WhatsApp app secret not configured - skipping signature verification")
            return True  # Allow in development, but log warning
        
        try:
            # Remove 'sha256=' prefix if present
            if signature.startswith('sha256='):
                signature = signature[7:]
            
            # Calculate expected signature
            expected_signature = hmac.new(
                self.app_secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            # Compare signatures securely
            is_valid = hmac.compare_digest(expected_signature, signature)
            
            if not is_valid:
                logger.warning("Webhook signature verification failed")
            
            return is_valid
        
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False
    
    def verify_webhook_token(self, token: str) -> bool:
        """Verify webhook verification token"""
        if not self.verify_token:
            logger.error("Webhook verify token not configured")
            return False
        
        is_valid = hmac.compare_digest(self.verify_token, token)
        
        if not is_valid:
            logger.warning("Webhook token verification failed")
        
        return is_valid
    
    def check_rate_limit(self, client_ip: str) -> bool:
        """Check if client IP is within rate limits"""
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=self.rate_limit_window)
        
        # Initialize or clean up request history for this IP
        if client_ip not in self.request_history:
            self.request_history[client_ip] = []
        
        # Remove old requests outside the window
        self.request_history[client_ip] = [
            req_time for req_time in self.request_history[client_ip]
            if req_time > window_start
        ]
        
        # Check if within rate limit
        if len(self.request_history[client_ip]) >= self.max_requests_per_window:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return False
        
        # Add current request
        self.request_history[client_ip].append(now)
        return True
    
    def validate_webhook_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Validate webhook payload structure and content"""
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
        }
        
        try:
            # Check required top-level fields
            required_fields = ["object", "entry"]
            for field in required_fields:
                if field not in payload:
                    validation_result["valid"] = False
                    validation_result["errors"].append(f"Missing required field: {field}")
            
            # Validate object type
            if payload.get("object") != "whatsapp_business_account":
                validation_result["warnings"].append(
                    f"Unexpected object type: {payload.get('object')}"
                )
            
            # Validate entry structure
            entries = payload.get("entry", [])
            if not isinstance(entries, list):
                validation_result["valid"] = False
                validation_result["errors"].append("Entry field must be a list")
            
            for i, entry in enumerate(entries):
                if not isinstance(entry, dict):
                    validation_result["valid"] = False
                    validation_result["errors"].append(f"Entry {i} must be an object")
                    continue
                
                # Check entry fields
                if "id" not in entry:
                    validation_result["warnings"].append(f"Entry {i} missing id field")
                
                if "changes" not in entry:
                    validation_result["warnings"].append(f"Entry {i} missing changes field")
                    continue
                
                # Validate changes structure
                changes = entry.get("changes", [])
                if not isinstance(changes, list):
                    validation_result["valid"] = False
                    validation_result["errors"].append(f"Entry {i} changes must be a list")
                    continue
                
                for j, change in enumerate(changes):
                    if not isinstance(change, dict):
                        validation_result["valid"] = False
                        validation_result["errors"].append(f"Entry {i} change {j} must be an object")
                        continue
                    
                    # Check change fields
                    required_change_fields = ["field", "value"]
                    for field in required_change_fields:
                        if field not in change:
                            validation_result["valid"] = False
                            validation_result["errors"].append(
                                f"Entry {i} change {j} missing required field: {field}"
                            )
        
        except Exception as e:
            validation_result["valid"] = False
            validation_result["errors"].append(f"Payload validation error: {str(e)}")
        
        return validation_result
    
    def extract_client_ip(self, request: Request) -> str:
        """Extract client IP address from request headers"""
        # Check for forwarded IP headers (from reverse proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"
    
    def log_webhook_request(self, request: Request, payload: Dict[str, Any], validation_result: Dict[str, Any]):
        """Log webhook request for monitoring and debugging"""
        client_ip = self.extract_client_ip(request)
        
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "client_ip": client_ip,
            "user_agent": request.headers.get("User-Agent", "unknown"),
            "content_type": request.headers.get("Content-Type", "unknown"),
            "payload_size": len(str(payload)),
            "validation_valid": validation_result["valid"],
            "validation_errors": len(validation_result["errors"]),
            "validation_warnings": len(validation_result["warnings"]),
        }
        
        # Log entry count and message count if available
        entries = payload.get("entry", [])
        log_data["entry_count"] = len(entries)
        
        message_count = 0
        for entry in entries:
            for change in entry.get("changes", []):
                if change.get("field") == "messages":
                    messages = change.get("value", {}).get("messages", [])
                    message_count += len(messages)
        
        log_data["message_count"] = message_count
        
        if validation_result["valid"]:
            logger.info(f"Webhook request processed: {log_data}")
        else:
            logger.error(f"Invalid webhook request: {log_data}")
            logger.error(f"Validation errors: {validation_result['errors']}")

# Global webhook security instance
webhook_security = WebhookSecurity()