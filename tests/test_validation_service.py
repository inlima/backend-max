"""
Tests for input validation and security measures.
"""

import json
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from app.services.validation_service import (
    InputSanitizer,
    RateLimiter,
    WebhookValidator,
    ValidationService,
    ValidationError,
    RateLimitExceeded
)


class TestInputSanitizer:
    """Test input sanitization functionality."""
    
    def test_sanitize_text_normal(self):
        """Test sanitization of normal text."""
        text = "Hello, this is a normal message!"
        result = InputSanitizer.sanitize_text(text)
        assert result == "Hello, this is a normal message!"
    
    def test_sanitize_text_with_html(self):
        """Test sanitization of text with HTML."""
        text = "Hello <b>world</b> & friends"
        result = InputSanitizer.sanitize_text(text)
        assert result == "Hello &lt;b&gt;world&lt;/b&gt; &amp; friends"
    
    def test_sanitize_text_dangerous_script(self):
        """Test blocking of dangerous script tags."""
        text = "Hello <script>alert('xss')</script> world"
        
        with pytest.raises(ValidationError, match="dangerous content"):
            InputSanitizer.sanitize_text(text)
    
    def test_sanitize_text_javascript_url(self):
        """Test blocking of javascript URLs."""
        text = "Click here: javascript:alert('xss')"
        
        with pytest.raises(ValidationError, match="dangerous content"):
            InputSanitizer.sanitize_text(text)
    
    def test_sanitize_text_sql_injection(self):
        """Test blocking of SQL injection attempts."""
        text = "'; DROP TABLE users; --"
        
        with pytest.raises(ValidationError, match="malicious content"):
            InputSanitizer.sanitize_text(text)
    
    def test_sanitize_text_too_long(self):
        """Test rejection of overly long text."""
        text = "a" * 1001  # Default max is 1000
        
        with pytest.raises(ValidationError, match="too long"):
            InputSanitizer.sanitize_text(text)
    
    def test_sanitize_text_non_string(self):
        """Test rejection of non-string input."""
        with pytest.raises(ValidationError, match="must be a string"):
            InputSanitizer.sanitize_text(123)
    
    def test_validate_phone_number_valid(self):
        """Test validation of valid phone numbers."""
        valid_phones = [
            "+5511999999999",
            "+1234567890",
            "5511999999999",
            "+55 11 99999-9999"
        ]
        
        for phone in valid_phones:
            result = InputSanitizer.validate_phone_number(phone)
            assert result.startswith("+")
            assert len(result) >= 10
    
    def test_validate_phone_number_invalid(self):
        """Test rejection of invalid phone numbers."""
        invalid_phones = [
            "123",  # Too short
            "+123456789012345678",  # Too long
            "abc123456789",  # Contains letters
            "",  # Empty
            "+",  # Just plus sign
        ]
        
        for phone in invalid_phones:
            with pytest.raises(ValidationError, match="Invalid phone number"):
                InputSanitizer.validate_phone_number(phone)
    
    def test_validate_email_valid(self):
        """Test validation of valid email addresses."""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org"
        ]
        
        for email in valid_emails:
            result = InputSanitizer.validate_email(email)
            assert "@" in result
            assert result == email.lower()
    
    def test_validate_email_invalid(self):
        """Test rejection of invalid email addresses."""
        invalid_emails = [
            "invalid-email",
            "@example.com",
            "user@",
            "user@.com",
            "",
        ]
        
        for email in invalid_emails:
            with pytest.raises(ValidationError, match="Invalid email"):
                InputSanitizer.validate_email(email)
    
    def test_validate_name_valid(self):
        """Test validation of valid names."""
        valid_names = [
            "João Silva",
            "Maria José",
            "José da Silva-Santos",
            "O'Connor",
            "Dr. Smith"
        ]
        
        for name in valid_names:
            result = InputSanitizer.validate_name(name)
            assert len(result) >= 2
            assert result.istitle()  # Should be title case
    
    def test_validate_name_invalid(self):
        """Test rejection of invalid names."""
        invalid_names = [
            "A",  # Too short
            "João123",  # Contains numbers
            "João@Silva",  # Contains special chars
            "",  # Empty
            "a" * 101,  # Too long
        ]
        
        for name in invalid_names:
            with pytest.raises(ValidationError, match="Invalid name"):
                InputSanitizer.validate_name(name)
    
    def test_validate_json_data_dict(self):
        """Test validation of JSON dictionary data."""
        data = {"name": "João", "message": "Hello <script>alert('xss')</script>"}
        
        with pytest.raises(ValidationError, match="dangerous content"):
            InputSanitizer.validate_json_data(data)
    
    def test_validate_json_data_valid_dict(self):
        """Test validation of valid JSON dictionary."""
        data = {"name": "João", "message": "Hello world"}
        result = InputSanitizer.validate_json_data(data)
        
        assert result["name"] == "João"
        assert result["message"] == "Hello world"
    
    def test_validate_json_data_string(self):
        """Test validation of JSON string."""
        data = '{"name": "João", "message": "Hello world"}'
        result = InputSanitizer.validate_json_data(data)
        
        assert result["name"] == "João"
        assert result["message"] == "Hello world"
    
    def test_validate_json_data_invalid_json(self):
        """Test rejection of invalid JSON string."""
        data = '{"name": "João", "message": "Hello world"'  # Missing closing brace
        
        with pytest.raises(ValidationError, match="Invalid JSON"):
            InputSanitizer.validate_json_data(data)
    
    def test_validate_json_data_too_large(self):
        """Test rejection of overly large JSON data."""
        large_data = '{"data": "' + "a" * 10001 + '"}'
        
        with pytest.raises(ValidationError, match="too large"):
            InputSanitizer.validate_json_data(large_data)


class TestRateLimiter:
    """Test rate limiting functionality."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = Mock()
        session.execute = AsyncMock()
        session.add = Mock()
        session.commit = AsyncMock()
        return session
    
    @pytest.fixture
    def rate_limiter(self, mock_db_session):
        """Create rate limiter instance."""
        return RateLimiter(mock_db_session)
    
    @pytest.mark.asyncio
    async def test_check_rate_limit_first_request(self, rate_limiter, mock_db_session):
        """Test rate limit check for first request."""
        phone_number = "+5511999999999"
        
        # Mock database queries to return 0 counts
        mock_result = Mock()
        mock_result.scalar.return_value = 0
        mock_db_session.execute.return_value = mock_result
        
        # Should pass for first request
        result = await rate_limiter.check_rate_limit(phone_number)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_check_rate_limit_exceeded_per_minute(self, rate_limiter):
        """Test rate limit exceeded per minute."""
        phone_number = "+5511999999999"
        
        # Simulate multiple requests in quick succession
        for i in range(10):  # Exactly at limit
            await rate_limiter.check_rate_limit(phone_number)
        
        # 11th request should fail
        with pytest.raises(RateLimitExceeded, match="Too many requests"):
            await rate_limiter.check_rate_limit(phone_number)
    
    @pytest.mark.asyncio
    async def test_check_rate_limit_global_exceeded(self, rate_limiter, mock_db_session):
        """Test global rate limit exceeded."""
        phone_number = "+5511999999999"
        
        # Mock database to return high global count
        mock_result = Mock()
        mock_result.scalar.return_value = 1001  # Above global limit
        mock_db_session.execute.return_value = mock_result
        
        with pytest.raises(RateLimitExceeded, match="overloaded"):
            await rate_limiter.check_rate_limit(phone_number)
    
    def test_get_rate_limit_info(self, rate_limiter):
        """Test getting rate limit information."""
        phone_number = "+5511999999999"
        
        # Add some requests to cache
        current_time = datetime.utcnow()
        user_key = f"{phone_number}:message"
        rate_limiter.memory_cache[user_key] = [
            current_time - timedelta(seconds=30),  # Within minute
            current_time - timedelta(minutes=30),  # Within hour
        ]
        
        info = rate_limiter.get_rate_limit_info(phone_number)
        
        assert "requests_last_minute" in info
        assert "requests_last_hour" in info
        assert "minute_remaining" in info
        assert "hour_remaining" in info
        assert info["requests_last_minute"] == 1
        assert info["requests_last_hour"] == 2


class TestWebhookValidator:
    """Test webhook validation functionality."""
    
    def test_validate_whatsapp_webhook_valid(self):
        """Test validation of valid WhatsApp webhook."""
        payload = '{"test": "data"}'
        verify_token = "test_token"
        
        # Calculate correct signature
        import hmac
        import hashlib
        expected_signature = hmac.new(
            verify_token.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        result = WebhookValidator.validate_whatsapp_webhook(
            payload, f"sha256={expected_signature}", verify_token
        )
        assert result is True
    
    def test_validate_whatsapp_webhook_invalid_signature(self):
        """Test rejection of invalid webhook signature."""
        payload = '{"test": "data"}'
        verify_token = "test_token"
        invalid_signature = "sha256=invalid_signature"
        
        result = WebhookValidator.validate_whatsapp_webhook(
            payload, invalid_signature, verify_token
        )
        assert result is False
    
    def test_validate_request_headers(self):
        """Test validation of request headers."""
        headers = {
            'content-type': 'application/json',
            'user-agent': 'WhatsApp/1.0',
            'x-forwarded-for': '192.168.1.1, 10.0.0.1',
            'x-real-ip': '192.168.1.1'
        }
        
        result = WebhookValidator.validate_request_headers(headers)
        
        assert result['content_type'] == 'application/json'
        assert result['user_agent'] == 'WhatsApp/1.0'
        assert result['client_ip'] == '192.168.1.1'
        assert 'timestamp' in result


class TestValidationService:
    """Test main validation service functionality."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = Mock()
        session.execute = AsyncMock()
        session.add = Mock()
        session.commit = AsyncMock()
        return session
    
    @pytest.fixture
    def validation_service(self, mock_db_session):
        """Create validation service instance."""
        return ValidationService(mock_db_session)
    
    @pytest.mark.asyncio
    async def test_validate_incoming_message_valid(self, validation_service, mock_db_session):
        """Test validation of valid incoming message."""
        phone_number = "+5511999999999"
        message_content = "Hello, I need legal help"
        headers = {'user-agent': 'WhatsApp/1.0'}
        
        # Mock database queries
        mock_result = Mock()
        mock_result.scalar.return_value = 0
        mock_db_session.execute.return_value = mock_result
        
        result = await validation_service.validate_incoming_message(
            phone_number, message_content, headers
        )
        
        assert result['valid'] is True
        assert result['sanitized_phone'] == phone_number
        assert result['sanitized_content'] == message_content
        assert len(result['errors']) == 0
    
    @pytest.mark.asyncio
    async def test_validate_incoming_message_invalid_phone(self, validation_service):
        """Test validation with invalid phone number."""
        phone_number = "invalid_phone"
        message_content = "Hello"
        
        result = await validation_service.validate_incoming_message(
            phone_number, message_content
        )
        
        assert result['valid'] is False
        assert len(result['errors']) > 0
        assert "Invalid phone number" in result['errors'][0]
    
    @pytest.mark.asyncio
    async def test_validate_incoming_message_dangerous_content(self, validation_service, mock_db_session):
        """Test validation with dangerous message content."""
        phone_number = "+5511999999999"
        message_content = "Hello <script>alert('xss')</script>"
        
        # Mock database queries
        mock_result = Mock()
        mock_result.scalar.return_value = 0
        mock_db_session.execute.return_value = mock_result
        
        result = await validation_service.validate_incoming_message(
            phone_number, message_content
        )
        
        assert result['valid'] is False
        assert len(result['errors']) > 0
        assert "dangerous content" in result['errors'][0]
    
    @pytest.mark.asyncio
    async def test_validate_webhook_request_valid(self, validation_service):
        """Test validation of valid webhook request."""
        payload = '{"test": "data"}'
        verify_token = "test_token"
        
        # Calculate correct signature
        import hmac
        import hashlib
        expected_signature = hmac.new(
            verify_token.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        headers = {'user-agent': 'WhatsApp/1.0'}
        
        result = await validation_service.validate_webhook_request(
            payload, f"sha256={expected_signature}", verify_token, headers
        )
        
        assert result['valid'] is True
        assert len(result['errors']) == 0
    
    @pytest.mark.asyncio
    async def test_validate_webhook_request_invalid_signature(self, validation_service):
        """Test validation with invalid webhook signature."""
        payload = '{"test": "data"}'
        verify_token = "test_token"
        invalid_signature = "sha256=invalid"
        
        result = await validation_service.validate_webhook_request(
            payload, invalid_signature, verify_token
        )
        
        assert result['valid'] is False
        assert len(result['errors']) > 0
        assert "Invalid webhook signature" in result['errors'][0]
    
    @pytest.mark.asyncio
    async def test_validate_webhook_request_payload_too_large(self, validation_service):
        """Test validation with overly large payload."""
        payload = '{"data": "' + "a" * 100000 + '"}'  # Very large payload
        verify_token = "test_token"
        
        # Calculate signature for large payload
        import hmac
        import hashlib
        signature = hmac.new(
            verify_token.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        result = await validation_service.validate_webhook_request(
            payload, f"sha256={signature}", verify_token
        )
        
        assert result['valid'] is False
        assert len(result['errors']) > 0
        assert "too large" in result['errors'][0]
    
    @pytest.mark.asyncio
    async def test_validate_user_data_valid(self, validation_service):
        """Test validation of valid user data."""
        data = {
            'name': 'João Silva',
            'email': 'joao@example.com',
            'phone': '+5511999999999',
            'message': 'I need legal help'
        }
        
        result = await validation_service.validate_user_data(data)
        
        assert result['valid'] is True
        assert result['sanitized_data']['name'] == 'João Silva'
        assert result['sanitized_data']['email'] == 'joao@example.com'
        assert result['sanitized_data']['phone'] == '+5511999999999'
        assert len(result['errors']) == 0
    
    @pytest.mark.asyncio
    async def test_validate_user_data_invalid_email(self, validation_service):
        """Test validation with invalid email."""
        data = {
            'name': 'João Silva',
            'email': 'invalid-email',
            'phone': '+5511999999999'
        }
        
        result = await validation_service.validate_user_data(data)
        
        assert result['valid'] is False
        assert len(result['errors']) > 0
        assert "Invalid email" in result['errors'][0]


@pytest.mark.integration
class TestValidationServiceIntegration:
    """Integration tests for validation service."""
    
    @pytest.mark.asyncio
    async def test_full_message_validation_cycle(self, db_session):
        """Test full message validation cycle with real database."""
        validation_service = ValidationService(db_session)
        
        phone_number = "+5511999999999"
        message_content = "Hello, I need legal assistance with a contract review."
        headers = {
            'content-type': 'application/json',
            'user-agent': 'WhatsApp/2.0',
            'x-real-ip': '192.168.1.100'
        }
        
        # Validate message
        result = await validation_service.validate_incoming_message(
            phone_number, message_content, headers
        )
        
        # Should be valid
        assert result['valid'] is True
        assert result['sanitized_phone'] == phone_number
        assert result['sanitized_content'] == message_content
        assert 'rate_limit_info' in result
        assert 'security_headers' in result
    
    @pytest.mark.asyncio
    async def test_rate_limiting_integration(self, db_session):
        """Test rate limiting with real database."""
        validation_service = ValidationService(db_session)
        phone_number = "+5511999999999"
        
        # Send multiple messages quickly
        for i in range(10):  # Should be at the limit
            result = await validation_service.validate_incoming_message(
                phone_number, f"Message {i}"
            )
            assert result['valid'] is True
        
        # Next message should be rate limited
        result = await validation_service.validate_incoming_message(
            phone_number, "Message 11"
        )
        assert result['valid'] is False
        assert any("Too many requests" in error for error in result['errors'])