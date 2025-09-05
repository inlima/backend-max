"""
Input validation and sanitization service for security.
"""

import re
import html
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
from collections import defaultdict

from pydantic import BaseModel, validator, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.conversation import AnalyticsEvent

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Custom validation error."""
    pass


class RateLimitExceeded(Exception):
    """Rate limit exceeded error."""
    pass


class InputSanitizer:
    """Handles input sanitization and validation."""
    
    # Regex patterns for validation
    PHONE_PATTERN = re.compile(r'^\+?[1-9]\d{1,14}$')  # E.164 format
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    NAME_PATTERN = re.compile(r'^[a-zA-ZÀ-ÿ\s\-\'\.]{2,100}$')  # Names with accents
    
    # Dangerous patterns to block
    DANGEROUS_PATTERNS = [
        re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'on\w+\s*=', re.IGNORECASE),
        re.compile(r'<iframe[^>]*>.*?</iframe>', re.IGNORECASE | re.DOTALL),
        re.compile(r'<object[^>]*>.*?</object>', re.IGNORECASE | re.DOTALL),
        re.compile(r'<embed[^>]*>', re.IGNORECASE),
        re.compile(r'vbscript:', re.IGNORECASE),
        re.compile(r'data:text/html', re.IGNORECASE),
    ]
    
    # SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        re.compile(r'\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b', re.IGNORECASE),
        re.compile(r'[\'";]', re.IGNORECASE),
        re.compile(r'--', re.IGNORECASE),
        re.compile(r'/\*.*?\*/', re.IGNORECASE | re.DOTALL),
    ]
    
    @classmethod
    def sanitize_text(cls, text: str, max_length: int = 1000) -> str:
        """Sanitize text input by removing dangerous content."""
        if not isinstance(text, str):
            raise ValidationError("Input must be a string")
        
        # Check length
        if len(text) > max_length:
            raise ValidationError(f"Input too long. Maximum {max_length} characters allowed")
        
        # Check for dangerous patterns
        for pattern in cls.DANGEROUS_PATTERNS:
            if pattern.search(text):
                logger.warning(f"Dangerous pattern detected in input: {text[:100]}...")
                raise ValidationError("Input contains potentially dangerous content")
        
        # Check for SQL injection patterns
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if pattern.search(text):
                logger.warning(f"SQL injection pattern detected in input: {text[:100]}...")
                raise ValidationError("Input contains potentially malicious content")
        
        # HTML escape the text
        sanitized = html.escape(text.strip())
        
        # Remove excessive whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized)
        
        return sanitized
    
    @classmethod
    def validate_phone_number(cls, phone: str) -> str:
        """Validate and normalize phone number."""
        if not isinstance(phone, str):
            raise ValidationError("Phone number must be a string")
        
        # Remove common formatting characters
        cleaned_phone = re.sub(r'[\s\-\(\)\.]+', '', phone.strip())
        
        # Add + if missing and starts with country code
        if not cleaned_phone.startswith('+') and len(cleaned_phone) >= 10:
            cleaned_phone = '+' + cleaned_phone
        
        # Validate format
        if not cls.PHONE_PATTERN.match(cleaned_phone):
            raise ValidationError("Invalid phone number format")
        
        return cleaned_phone
    
    @classmethod
    def validate_email(cls, email: str) -> str:
        """Validate email address."""
        if not isinstance(email, str):
            raise ValidationError("Email must be a string")
        
        email = email.strip().lower()
        
        if not cls.EMAIL_PATTERN.match(email):
            raise ValidationError("Invalid email format")
        
        return email
    
    @classmethod
    def validate_name(cls, name: str) -> str:
        """Validate person name."""
        if not isinstance(name, str):
            raise ValidationError("Name must be a string")
        
        name = name.strip()
        
        if not cls.NAME_PATTERN.match(name):
            raise ValidationError("Invalid name format. Only letters, spaces, hyphens, apostrophes and dots allowed")
        
        return name.title()  # Capitalize properly
    
    @classmethod
    def validate_json_data(cls, data: Union[str, Dict, List], max_size: int = 10000) -> Union[Dict, List]:
        """Validate and sanitize JSON data."""
        if isinstance(data, str):
            # Check size before parsing
            if len(data) > max_size:
                raise ValidationError(f"JSON data too large. Maximum {max_size} characters allowed")
            
            try:
                data = json.loads(data)
            except json.JSONDecodeError as e:
                raise ValidationError(f"Invalid JSON format: {str(e)}")
        
        # Recursively sanitize string values in the data structure
        def sanitize_recursive(obj):
            if isinstance(obj, dict):
                return {key: sanitize_recursive(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [sanitize_recursive(item) for item in obj]
            elif isinstance(obj, str):
                return cls.sanitize_text(obj, max_length=500)  # Shorter limit for JSON values
            else:
                return obj
        
        return sanitize_recursive(data)


class RateLimiter:
    """Rate limiting service to prevent abuse."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.rate_limits = {
            'per_user_per_minute': 10,  # 10 messages per user per minute
            'per_user_per_hour': 100,   # 100 messages per user per hour
            'global_per_minute': 1000,  # 1000 messages globally per minute
            'global_per_hour': 10000,   # 10000 messages globally per hour
        }
        self.memory_cache = defaultdict(list)  # In-memory cache for recent requests
    
    async def check_rate_limit(self, phone_number: str, action: str = "message") -> bool:
        """Check if user has exceeded rate limits."""
        current_time = datetime.utcnow()
        
        # Check in-memory cache first (for immediate rate limiting)
        user_key = f"{phone_number}:{action}"
        
        # Clean old entries from memory cache
        minute_ago = current_time - timedelta(minutes=1)
        hour_ago = current_time - timedelta(hours=1)
        
        self.memory_cache[user_key] = [
            timestamp for timestamp in self.memory_cache[user_key]
            if timestamp > hour_ago
        ]
        
        # Count recent requests
        requests_last_minute = sum(
            1 for timestamp in self.memory_cache[user_key]
            if timestamp > minute_ago
        )
        
        requests_last_hour = len(self.memory_cache[user_key])
        
        # Check user rate limits
        if requests_last_minute >= self.rate_limits['per_user_per_minute']:
            logger.warning(f"Rate limit exceeded for user {phone_number}: {requests_last_minute} requests in last minute")
            raise RateLimitExceeded(f"Too many requests. Please wait before sending another message.")
        
        if requests_last_hour >= self.rate_limits['per_user_per_hour']:
            logger.warning(f"Rate limit exceeded for user {phone_number}: {requests_last_hour} requests in last hour")
            raise RateLimitExceeded(f"Hourly message limit exceeded. Please try again later.")
        
        # Check global rate limits using database
        await self._check_global_rate_limits(current_time)
        
        # Add current request to cache
        self.memory_cache[user_key].append(current_time)
        
        # Log rate limit check in database for monitoring
        await self._log_rate_limit_check(phone_number, action, current_time)
        
        return True
    
    async def _check_global_rate_limits(self, current_time: datetime) -> None:
        """Check global rate limits using database."""
        minute_ago = current_time - timedelta(minutes=1)
        hour_ago = current_time - timedelta(hours=1)
        
        # Count global requests in last minute
        minute_count_query = select(func.count(AnalyticsEvent.id)).where(
            AnalyticsEvent.event_type == "rate_limit_check",
            AnalyticsEvent.timestamp > minute_ago
        )
        minute_result = await self.db.execute(minute_count_query)
        minute_count = minute_result.scalar() or 0
        
        if minute_count >= self.rate_limits['global_per_minute']:
            logger.error(f"Global rate limit exceeded: {minute_count} requests in last minute")
            raise RateLimitExceeded("System is currently overloaded. Please try again later.")
        
        # Count global requests in last hour
        hour_count_query = select(func.count(AnalyticsEvent.id)).where(
            AnalyticsEvent.event_type == "rate_limit_check",
            AnalyticsEvent.timestamp > hour_ago
        )
        hour_result = await self.db.execute(hour_count_query)
        hour_count = hour_result.scalar() or 0
        
        if hour_count >= self.rate_limits['global_per_hour']:
            logger.error(f"Global hourly rate limit exceeded: {hour_count} requests in last hour")
            raise RateLimitExceeded("System is currently overloaded. Please try again later.")
    
    async def _log_rate_limit_check(self, phone_number: str, action: str, timestamp: datetime) -> None:
        """Log rate limit check for monitoring."""
        # Create a dummy session ID for rate limiting events
        import uuid
        rate_limit_session_id = uuid.UUID('11111111-1111-1111-1111-111111111111')
        
        rate_limit_event = AnalyticsEvent(
            session_id=rate_limit_session_id,
            event_type="rate_limit_check",
            step_id=None,
            event_data={
                "phone_number_hash": hash(phone_number),  # Don't store actual phone number
                "action": action,
                "timestamp": timestamp.isoformat(),
                "user_agent": None,
                "ip_address": None
            }
        )
        
        self.db.add(rate_limit_event)
        await self.db.commit()
    
    def get_rate_limit_info(self, phone_number: str) -> Dict[str, Any]:
        """Get current rate limit status for a user."""
        current_time = datetime.utcnow()
        minute_ago = current_time - timedelta(minutes=1)
        hour_ago = current_time - timedelta(hours=1)
        
        user_key = f"{phone_number}:message"
        
        # Clean old entries
        self.memory_cache[user_key] = [
            timestamp for timestamp in self.memory_cache[user_key]
            if timestamp > hour_ago
        ]
        
        requests_last_minute = sum(
            1 for timestamp in self.memory_cache[user_key]
            if timestamp > minute_ago
        )
        
        requests_last_hour = len(self.memory_cache[user_key])
        
        return {
            "requests_last_minute": requests_last_minute,
            "requests_last_hour": requests_last_hour,
            "minute_limit": self.rate_limits['per_user_per_minute'],
            "hour_limit": self.rate_limits['per_user_per_hour'],
            "minute_remaining": max(0, self.rate_limits['per_user_per_minute'] - requests_last_minute),
            "hour_remaining": max(0, self.rate_limits['per_user_per_hour'] - requests_last_hour)
        }


class WebhookValidator:
    """Validates webhook requests and headers."""
    
    @staticmethod
    def validate_whatsapp_webhook(
        payload: str,
        signature: str,
        verify_token: str,
        user_agent: Optional[str] = None
    ) -> bool:
        """Validate WhatsApp webhook request."""
        # Validate signature
        import hmac
        import hashlib
        
        expected_signature = hmac.new(
            verify_token.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Remove 'sha256=' prefix if present
        if signature.startswith('sha256='):
            signature = signature[7:]
        
        if not hmac.compare_digest(expected_signature, signature):
            logger.warning("Invalid webhook signature")
            return False
        
        # Validate user agent (optional additional security)
        if user_agent and not user_agent.startswith('WhatsApp'):
            logger.warning(f"Suspicious user agent: {user_agent}")
            # Don't fail on this, just log for monitoring
        
        return True
    
    @staticmethod
    def validate_request_headers(headers: Dict[str, str]) -> Dict[str, Any]:
        """Validate and extract security-relevant headers."""
        security_headers = {}
        
        # Extract and validate important headers
        content_type = headers.get('content-type', '').lower()
        if content_type and 'application/json' not in content_type:
            logger.warning(f"Unexpected content type: {content_type}")
        
        user_agent = headers.get('user-agent', '')
        x_forwarded_for = headers.get('x-forwarded-for', '')
        x_real_ip = headers.get('x-real-ip', '')
        
        # Determine client IP
        client_ip = x_real_ip or x_forwarded_for.split(',')[0].strip() if x_forwarded_for else None
        
        security_headers.update({
            'content_type': content_type,
            'user_agent': user_agent,
            'client_ip': client_ip,
            'x_forwarded_for': x_forwarded_for,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return security_headers


class ValidationService:
    """Main validation service that coordinates all validation operations."""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.sanitizer = InputSanitizer()
        self.rate_limiter = RateLimiter(db_session)
        self.webhook_validator = WebhookValidator()
    
    async def validate_incoming_message(
        self,
        phone_number: str,
        message_content: str,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Validate incoming message with all security checks."""
        validation_result = {
            'valid': False,
            'sanitized_content': None,
            'sanitized_phone': None,
            'security_headers': {},
            'rate_limit_info': {},
            'errors': []
        }
        
        try:
            # Validate and sanitize phone number
            validation_result['sanitized_phone'] = self.sanitizer.validate_phone_number(phone_number)
            
            # Check rate limits
            await self.rate_limiter.check_rate_limit(validation_result['sanitized_phone'])
            validation_result['rate_limit_info'] = self.rate_limiter.get_rate_limit_info(
                validation_result['sanitized_phone']
            )
            
            # Validate and sanitize message content
            validation_result['sanitized_content'] = self.sanitizer.sanitize_text(
                message_content, max_length=4096  # WhatsApp message limit
            )
            
            # Validate headers if provided
            if headers:
                validation_result['security_headers'] = self.webhook_validator.validate_request_headers(headers)
            
            validation_result['valid'] = True
            
        except (ValidationError, RateLimitExceeded) as e:
            validation_result['errors'].append(str(e))
            logger.warning(f"Message validation failed for {phone_number}: {str(e)}")
        
        except Exception as e:
            validation_result['errors'].append("Internal validation error")
            logger.error(f"Unexpected validation error for {phone_number}: {str(e)}")
        
        return validation_result
    
    async def validate_webhook_request(
        self,
        payload: str,
        signature: str,
        verify_token: str,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Validate webhook request with security checks."""
        validation_result = {
            'valid': False,
            'security_headers': {},
            'errors': []
        }
        
        try:
            # Validate webhook signature
            is_valid_signature = self.webhook_validator.validate_whatsapp_webhook(
                payload, signature, verify_token,
                headers.get('user-agent') if headers else None
            )
            
            if not is_valid_signature:
                validation_result['errors'].append("Invalid webhook signature")
                return validation_result
            
            # Validate headers
            if headers:
                validation_result['security_headers'] = self.webhook_validator.validate_request_headers(headers)
            
            # Validate payload size
            if len(payload) > 100000:  # 100KB limit
                validation_result['errors'].append("Payload too large")
                return validation_result
            
            validation_result['valid'] = True
            
        except Exception as e:
            validation_result['errors'].append("Webhook validation error")
            logger.error(f"Webhook validation error: {str(e)}")
        
        return validation_result
    
    async def validate_user_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user-provided data with field-specific validation."""
        validation_result = {
            'valid': False,
            'sanitized_data': {},
            'errors': []
        }
        
        try:
            sanitized_data = {}
            
            # Validate specific fields
            if 'name' in data:
                sanitized_data['name'] = self.sanitizer.validate_name(data['name'])
            
            if 'email' in data:
                sanitized_data['email'] = self.sanitizer.validate_email(data['email'])
            
            if 'phone' in data:
                sanitized_data['phone'] = self.sanitizer.validate_phone_number(data['phone'])
            
            # Sanitize other text fields
            for key, value in data.items():
                if key not in ['name', 'email', 'phone'] and isinstance(value, str):
                    sanitized_data[key] = self.sanitizer.sanitize_text(value)
                elif not isinstance(value, str):
                    sanitized_data[key] = value
            
            validation_result['sanitized_data'] = sanitized_data
            validation_result['valid'] = True
            
        except ValidationError as e:
            validation_result['errors'].append(str(e))
            logger.warning(f"User data validation failed: {str(e)}")
        
        except Exception as e:
            validation_result['errors'].append("Data validation error")
            logger.error(f"Unexpected data validation error: {str(e)}")
        
        return validation_result