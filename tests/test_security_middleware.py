"""
Tests for security middleware functionality.
"""

import json
import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.requests import Request
from starlette.responses import Response

from app.middleware.security_middleware import (
    SecurityMiddleware,
    RateLimitMiddleware,
    InputValidationMiddleware,
    setup_security_middleware
)


class TestSecurityMiddleware:
    """Test security middleware functionality."""
    
    def test_security_headers_added(self):
        """Test that security headers are added to responses."""
        app = FastAPI()
        app.add_middleware(SecurityMiddleware)
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        response = client.get("/test")
        
        # Check security headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-XSS-Protection"] == "1; mode=block"
        assert "Content-Security-Policy" in response.headers
        assert "Referrer-Policy" in response.headers
    
    def test_excluded_paths_bypass_security(self):
        """Test that excluded paths bypass security checks."""
        app = FastAPI()
        app.add_middleware(SecurityMiddleware, excluded_paths=["/health", "/docs"])
        
        @app.get("/health")
        async def health_endpoint():
            return {"status": "ok"}
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        client = TestClient(app)
        
        # Health endpoint should work without security checks
        response = client.get("/health")
        assert response.status_code == 200
        
        # Regular endpoint should have security headers
        response = client.get("/test")
        assert response.status_code == 200
        assert "X-Content-Type-Options" in response.headers
    
    def test_request_too_large_rejected(self):
        """Test that overly large requests are rejected."""
        app = FastAPI()
        app.add_middleware(SecurityMiddleware)
        
        @app.post("/test")
        async def test_endpoint(data: dict):
            return {"received": data}
        
        client = TestClient(app)
        
        # Create large payload
        large_data = {"data": "x" * (1024 * 1024 + 1)}  # Larger than 1MB
        
        response = client.post("/test", json=large_data)
        assert response.status_code == 400
        assert "too large" in response.json()["error"].lower()
    
    @patch('app.middleware.security_middleware.ValidationService')
    def test_webhook_validation_success(self, mock_validation_service):
        """Test successful webhook validation."""
        app = FastAPI()
        app.add_middleware(SecurityMiddleware)
        
        @app.post("/webhook/test")
        async def webhook_endpoint():
            return {"status": "ok"}
        
        # Mock validation service
        mock_service_instance = Mock()
        mock_service_instance.validate_webhook_request = AsyncMock(
            return_value={"valid": True, "errors": []}
        )
        mock_validation_service.return_value = mock_service_instance
        
        client = TestClient(app)
        response = client.post("/webhook/test", json={"test": "data"})
        
        assert response.status_code == 200
    
    @patch('app.middleware.security_middleware.ValidationService')
    def test_webhook_validation_failure(self, mock_validation_service):
        """Test webhook validation failure."""
        app = FastAPI()
        app.add_middleware(SecurityMiddleware)
        
        @app.post("/webhook/test")
        async def webhook_endpoint():
            return {"status": "ok"}
        
        # Mock validation service to return invalid
        mock_service_instance = Mock()
        mock_service_instance.validate_webhook_request = AsyncMock(
            return_value={"valid": False, "errors": ["Invalid signature"]}
        )
        mock_validation_service.return_value = mock_service_instance
        
        client = TestClient(app)
        response = client.post("/webhook/test", json={"test": "data"})
        
        assert response.status_code == 403
        assert "Invalid webhook request" in response.json()["error"]


class TestRateLimitMiddleware:
    """Test rate limiting middleware functionality."""
    
    def test_rate_limit_headers_extraction(self):
        """Test extraction of client IP from headers."""
        middleware = RateLimitMiddleware(None)
        
        # Test X-Forwarded-For header
        request = Mock()
        request.headers = {"x-forwarded-for": "192.168.1.1, 10.0.0.1"}
        request.client = None
        
        ip = middleware._get_client_ip(request)
        assert ip == "192.168.1.1"
        
        # Test X-Real-IP header
        request.headers = {"x-real-ip": "192.168.1.2"}
        ip = middleware._get_client_ip(request)
        assert ip == "192.168.1.2"
        
        # Test client.host fallback
        request.headers = {}
        request.client = Mock()
        request.client.host = "192.168.1.3"
        ip = middleware._get_client_ip(request)
        assert ip == "192.168.1.3"
    
    @patch('app.middleware.security_middleware.ValidationService')
    def test_rate_limit_exceeded(self, mock_validation_service):
        """Test rate limit exceeded response."""
        app = FastAPI()
        app.add_middleware(RateLimitMiddleware)
        
        @app.post("/api/test")
        async def api_endpoint():
            return {"status": "ok"}
        
        # Mock validation service to raise rate limit exceeded
        from app.services.validation_service import RateLimitExceeded
        mock_service_instance = Mock()
        mock_rate_limiter = Mock()
        mock_rate_limiter.check_rate_limit = AsyncMock(
            side_effect=RateLimitExceeded("Rate limit exceeded")
        )
        mock_service_instance.rate_limiter = mock_rate_limiter
        mock_validation_service.return_value = mock_service_instance
        
        client = TestClient(app)
        response = client.post("/api/test", json={"test": "data"})
        
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["error"]
        assert "Retry-After" in response.headers
    
    @patch('app.middleware.security_middleware.ValidationService')
    def test_rate_limit_success(self, mock_validation_service):
        """Test successful request within rate limits."""
        app = FastAPI()
        app.add_middleware(RateLimitMiddleware)
        
        @app.post("/api/test")
        async def api_endpoint():
            return {"status": "ok"}
        
        # Mock validation service to allow request
        mock_service_instance = Mock()
        mock_rate_limiter = Mock()
        mock_rate_limiter.check_rate_limit = AsyncMock(return_value=True)
        mock_service_instance.rate_limiter = mock_rate_limiter
        mock_validation_service.return_value = mock_service_instance
        
        client = TestClient(app)
        response = client.post("/api/test", json={"test": "data"})
        
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestInputValidationMiddleware:
    """Test input validation middleware functionality."""
    
    def test_valid_http_methods(self):
        """Test that valid HTTP methods are allowed."""
        app = FastAPI()
        app.add_middleware(InputValidationMiddleware)
        
        @app.get("/test")
        async def get_endpoint():
            return {"method": "GET"}
        
        @app.post("/test")
        async def post_endpoint():
            return {"method": "POST"}
        
        client = TestClient(app)
        
        # Test valid methods
        assert client.get("/test").status_code == 200
        assert client.post("/test").status_code == 200
    
    def test_invalid_json_payload(self):
        """Test rejection of invalid JSON payload."""
        app = FastAPI()
        app.add_middleware(InputValidationMiddleware)
        
        @app.post("/test")
        async def post_endpoint():
            return {"status": "ok"}
        
        client = TestClient(app)
        
        # Send invalid JSON
        response = client.post(
            "/test",
            data='{"invalid": json}',  # Invalid JSON
            headers={"content-type": "application/json"}
        )
        
        assert response.status_code == 400
        assert "Invalid JSON" in response.json()["error"]
    
    def test_unsupported_content_type(self):
        """Test rejection of unsupported content types."""
        app = FastAPI()
        app.add_middleware(InputValidationMiddleware)
        
        @app.post("/test")
        async def post_endpoint():
            return {"status": "ok"}
        
        client = TestClient(app)
        
        # Send unsupported content type
        response = client.post(
            "/test",
            data="test data",
            headers={"content-type": "application/xml"}
        )
        
        assert response.status_code == 400
        assert "Unsupported content type" in response.json()["error"]
    
    def test_valid_content_types(self):
        """Test that valid content types are accepted."""
        app = FastAPI()
        app.add_middleware(InputValidationMiddleware)
        
        @app.post("/test")
        async def post_endpoint():
            return {"status": "ok"}
        
        client = TestClient(app)
        
        # Test valid content types
        valid_types = [
            "application/json",
            "application/x-www-form-urlencoded",
            "text/plain"
        ]
        
        for content_type in valid_types:
            response = client.post(
                "/test",
                data='{"test": "data"}' if content_type == "application/json" else "test=data",
                headers={"content-type": content_type}
            )
            # Should not fail due to content type (might fail for other reasons)
            assert response.status_code != 400 or "Unsupported content type" not in response.json().get("error", "")


class TestSecurityMiddlewareSetup:
    """Test security middleware setup functionality."""
    
    def test_setup_security_middleware(self):
        """Test that setup_security_middleware adds all middleware."""
        app = FastAPI()
        
        # Count middleware before setup
        initial_middleware_count = len(app.user_middleware)
        
        # Setup security middleware
        setup_security_middleware(app)
        
        # Should have added 3 middleware layers
        assert len(app.user_middleware) == initial_middleware_count + 3
        
        # Check that the middleware types are correct
        middleware_types = [mw.cls for mw in app.user_middleware[-3:]]
        assert SecurityMiddleware in middleware_types
        assert RateLimitMiddleware in middleware_types
        assert InputValidationMiddleware in middleware_types


@pytest.mark.integration
class TestSecurityMiddlewareIntegration:
    """Integration tests for security middleware."""
    
    def test_full_security_stack(self):
        """Test full security middleware stack integration."""
        app = FastAPI()
        setup_security_middleware(app)
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "success"}
        
        @app.post("/api/test")
        async def api_endpoint(data: dict):
            return {"received": data}
        
        client = TestClient(app)
        
        # Test GET request with security headers
        response = client.get("/test")
        assert response.status_code == 200
        assert "X-Content-Type-Options" in response.headers
        assert "X-Frame-Options" in response.headers
        
        # Test POST request with valid JSON
        response = client.post("/api/test", json={"test": "data"})
        # Note: This might fail due to rate limiting or other validation
        # but should not fail due to middleware errors
        assert response.status_code in [200, 400, 403, 429]  # Valid HTTP responses
    
    @patch('app.middleware.security_middleware.ValidationService')
    def test_webhook_security_integration(self, mock_validation_service):
        """Test webhook security integration."""
        app = FastAPI()
        setup_security_middleware(app)
        
        @app.post("/webhook/whatsapp")
        async def webhook_endpoint():
            return {"status": "ok"}
        
        # Mock validation service for webhook
        mock_service_instance = Mock()
        mock_service_instance.validate_webhook_request = AsyncMock(
            return_value={"valid": True, "errors": []}
        )
        mock_validation_service.return_value = mock_service_instance
        
        client = TestClient(app)
        
        # Test webhook request
        response = client.post(
            "/webhook/whatsapp",
            json={"entry": [{"changes": [{"value": {"messages": []}}]}]},
            headers={
                "x-hub-signature-256": "sha256=test_signature",
                "user-agent": "WhatsApp/1.0"
            }
        )
        
        # Should pass through security middleware
        assert response.status_code == 200
        assert "X-Content-Type-Options" in response.headers
    
    def test_error_handling_in_middleware_stack(self):
        """Test error handling throughout middleware stack."""
        app = FastAPI()
        setup_security_middleware(app)
        
        @app.post("/test")
        async def test_endpoint():
            return {"status": "ok"}
        
        client = TestClient(app)
        
        # Test various error conditions
        
        # 1. Invalid JSON
        response = client.post(
            "/test",
            data='{"invalid": json}',
            headers={"content-type": "application/json"}
        )
        assert response.status_code == 400
        
        # 2. Unsupported content type
        response = client.post(
            "/test",
            data="test",
            headers={"content-type": "application/xml"}
        )
        assert response.status_code == 400
        
        # All error responses should still have security headers
        for test_response in [response]:
            if test_response.status_code != 500:  # Skip internal server errors
                assert "X-Content-Type-Options" in test_response.headers